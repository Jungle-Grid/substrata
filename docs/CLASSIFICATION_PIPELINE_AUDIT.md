# Classification pipeline architecture audit

Status: implementation baseline, 2026-07-12. This audit describes the executable path in this repository, not the aspirational documentation.

## Runtime pipeline map

| Stage | Implementation | Input | Output / source of truth | Current validation | Material failure modes |
| --- | --- | --- | --- | --- | --- |
| Upload and MIME handling | `apps/api/src/routes/documents.ts`, `document-upload.service.ts`, `text-extraction.service.ts` | multipart upload or raw text plus organization context | `Document.rawText` and stored source | size/type policy; organization-scoped persistence | Only PDF and text-like files are supported. PDF uses `pdftotext`; no OCR, DOCX, spreadsheet workbook, or page-coordinate pipeline. Worker-side PDF extraction is a stub, so behavior depends on which entry point supplied text. |
| Worker invocation | `classification.service.ts` -> `worker-runtime.ts` -> `workers/classifier/src/main.py` | document text, metadata, organization, provider/mode | validated worker JSON | Zod CLI/output schemas and process status | API reads an uploaded non-text file as UTF-8 if `rawText` is absent instead of calling the extraction service at classification time. Provider fallback can change extraction while retaining the same routing label. |
| Provider extraction | `backends/{fireworks,jungle_grid,local}_backend.py`, `prompts.py`, `schemas.py` | untrusted document text embedded in an extraction prompt | `AIExtractionResult`, including an LLM-selected profile and facts | handwritten shape checks; confidence enum | Uploaded instructions are delimited but prompt does not explicitly classify them as hostile data. Extra fields are not rejected. Quote membership and offsets are not validated. Provider/model/prompt hashes are incomplete. The model emits a routing profile alongside facts. |
| Local extraction | `extract_specs.py` | flattened text | `ExtractedSpec[]` | ad hoc parsing and dedupe | Large category-specific rule file; boolean-like values lack a canonical polarity/scope model. Location is usually only a snippet. |
| Evidence/profile routing | `classification_heuristics/__init__.py`, `signals.py`, `profiles.py` | raw source + extracted facts + generated heuristic facts | overwritten `product_profile` specs, paths, candidates | weighted thresholds and narrow crypto negation handling | `_search_text` mixes source, extracted facts, profile labels, and generated signals. Most terms use substring presence with no negation/scope handling. Every weak/no-match case is forced to `general_electronics`. Contradictions run after selection and do not gate it. |
| Candidate generation | `classification_heuristics/rules.py`, `eccn_rules.py`, heuristic `evaluate` | selected profiles and opened paths | `ECCNCandidate[]` | specific-ECCN regex and narrative checks | Candidate rules are path-label lookups. Evidence is a generic pool, not candidate-required facts. A generated profile can therefore create a candidate with no positive source evidence. |
| Regulatory evidence | `citations.py`, `main._regulation_source_from_citation` | candidate code | placeholder `RegulationSource` / citation | requires a source-shaped object | The current-control citation says the text must be retrieved and is marked `needs_verification`; nevertheless the candidate can be shown as a review candidate. No corpus version/hash/effective date is enforced. |
| Company-history ingestion | `history-ingestion.service.ts` | organization-scoped historical documents | chunks and extracted metadata | MIME/size policy, organization indexes | History facts, prior conclusions, and source prose share chunk text; authority and approval state are not structured strongly enough for reranking. |
| Primary history retrieval | `history-retrieval.service.ts`, called by `classification.service.ts` | source text plus generated profiles, paths, candidate ECCNs, questions | ranked internal matches and trace | organization predicates on every query | Confirmatory contamination is explicit: generated ECCNs, profile labels, review prose, and questions enter `querySignals`. Default fallback terms contain `3A090`. Shared ECCNs add score. Negated capabilities match positive precedents. File/title tokens affect retrieval. |
| History feedback | `classification.service.ts` | generated candidates + retrieved matches | candidate history support, confidence prose, memo appendix | label says internal history is not authority | A candidate-generated ECCN retrieves the same ECCN and the result is attached back to that candidate. This is circular reinforcement even though the disclaimer is correct. |
| Memo | `memo.py` (the provider memo is discarded), then API appends history | specs, candidates, paths, flags | Markdown memo | Markdown/narrative regex validation | Memo consumes mutable stage objects rather than one immutable validated decision. API mutates it after worker validation. Validation checks selected phrases, not complete membership/provenance or contradiction coverage. |
| Persistence/API | `classification.service.ts`, Prisma schema, presenters/routes | worker output | normalized tables plus JSON traces | transactions, tenant filters, worker schema | Evidence polarity/origin/strength/configuration, contradictions, decision schema version, corpus version, and retrieval pass are not first-class persisted fields. Old runs are not explicitly pinned to a pipeline version. |
| Human review/UI | review routes, `apps/web/src/app/app/reviews/[id]/page.tsx`, candidate/evidence components | persisted run | reviewer workspace and actions | role checks, audit events | Source facts, derived labels, contradictions, internal precedent, and regulatory evidence are not consistently rendered as distinct authority classes. Abstention is not a primary decision state. |

## Reproduced systemic failure origin

The defect does not require a particular product or file name:

1. `_search_text` concatenates raw source, all extracted fields, and generated heuristic fields.
2. `SignalRule("ai_accelerator_identity", ...)` treats the substring `ai accelerator` as an eight-point positive signal.
3. Negation filtering is implemented only for crypto signals. Therefore an explicit negative sentence contributes positive AI-accelerator score.
4. Score-only thresholding makes the profile eligible. Structural contradiction detection occurs only after paths and candidates exist, and has no negative-capability rule.
5. `PROFILE_PATHS` opens advanced-computing paths and `CANDIDATE_RULES` emits candidate codes from the path label, using a generic technical-fact pool.
6. `classification.service.ts` passes those profile labels, path descriptions, candidate codes, and reviewer questions into the primary company-history query.
7. History scoring rewards shared candidate-code strings and accelerator words without polarity agreement. Matching history is attached to the candidate and described as increased review priority.
8. The memo was already generated before retrieval and is mutated afterward; worker memo validation therefore cannot validate the final artifact.

This is deterministic in the hybrid routing layer. An LLM can introduce or amplify it by emitting a profile or generated wording, but provider output is not required for the failure.

## Mixed authority and circular dependencies

- `ExtractedSpec` currently represents direct source facts, normalized facts, generated signals, profile decisions, rationale, and confidence. Consumers cannot reliably distinguish evidence from routing output.
- Profile labels are written back into the fact list and subsequently searched as evidence.
- Candidate codes and review-path prose enter primary retrieval.
- Retrieved prior codes are attached to the same candidates that caused their retrieval.
- Source citations and placeholder regulation lookups share the `RegulatoryCitation` type.
- The final memo is not generated from an immutable, validated decision and is modified after validation.

Prohibited loops identified:

`generated profile -> primary history query -> matching precedent -> candidate confidence prose`

`generated candidate code -> primary history query -> same prior code -> candidate support`

`generated heuristic fact -> profile search blob -> additional profile score`

## Provider and execution differences

- Fireworks, Jungle Grid, and local backends share the `AIExtractionResult` parser, but backend response envelopes, prompt execution, metadata, and failure status differ.
- Remote failures may silently switch the whole extraction stage to deterministic fallback when `AI_FALLBACK_TO_HEURISTIC` is enabled. Local mode does not use the same fallback policy.
- Deterministic routing runs after all providers, which is useful, but its mixed-evidence scoring means it does not presently guarantee provider-independent semantics.
- Worker `extract_text.py` stubs PDFs, while API upload extraction uses `pdftotext`; direct worker and API runs are not input-conformant.

## Missing invariants

The code does not currently enforce: required capability absent blocks profile; zero positive source evidence blocks profile/candidate; all profiles weak implies unknown; generated hypotheses excluded from primary retrieval; history contradiction prevents close-precedent labels; unavailable current regulation limits candidate status; memo membership is a subset of the validated decision; blocking contradictions appear in memo and approval state; confidence cannot exceed the decision; provider outputs have equivalent evidence semantics.

## Security and isolation

Organization predicates are present in history counts, joins, writes, and run loading. Existing authorization tests must remain green. Uploaded text is delimited in prompts but there is no explicit instruction/data channel policy, injection detection event, or adversarial conformance test. Logs can include full retrieval excerpts and query text, which may expose customer content unnecessarily.

## Regulatory source-of-truth policy

Internal history is precedent only. Current legal text must come from a versioned official corpus sourced from BIS/eCFR and, where relevant, Federal Register amendments. A candidate without retrievable current official text may remain an incomplete review path but cannot be described as having completed regulatory evaluation.
