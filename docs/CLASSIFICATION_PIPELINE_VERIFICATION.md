# Classification pipeline verification report

Date: 2026-07-12

## Root cause

The deterministic hybrid engine searched raw source, extracted facts, and generated routing fields as one text blob. Non-crypto signals had no negation/scope handling, so explicit absence produced a positive score. Score-only routing opened paths, path labels emitted candidates, and the API contaminated primary history retrieval with those generated profiles, paths, questions, and candidate ECCNs. Matching prior ECCNs were attached back to the originating candidates. Memo validation ran before the API appended history. Placeholder regulation citations could coexist with candidate recommendation language.

## Architecture changes implemented

- Canonical source evidence records with polarity, origin, strength, quote offsets, scope, extraction/version metadata, stable IDs, and warnings.
- First-class contradiction objects and configuration-scope resolution.
- Declarative profile eligibility contracts evaluated before scores, with hard exclusions and `unknown` abstention.
- Candidate decision gate requiring positive source evidence and current regulatory availability; incomplete candidates are blocked in the validated decision.
- Versioned canonical classification decision snapshot and memo membership/contradiction invariants.
- Source-fact-only primary history query and contradiction-aware reranking with `precedent`, `contrast`, and `irrelevant` use labels.
- Prompt-injection instruction/data separation plus deterministic detection.
- Persisted pipeline/rule/prompt/corpus/retrieval/decision versions and evidence/contradiction/decision snapshots.
- Reviewer UI labels internal history as precedent, not regulatory authority.

## Database migration

`20260712090000_evidence_decision_versioning` adds nullable, backward-compatible version fields and JSON snapshots. Existing runs are not recalculated. The migration has not been applied to a shared/production database in this work session.

## Machine-enforced invariants added

- Explicit absent required capability prevents dependent profile eligibility.
- Zero eligible profiles yields `unknown` and an abstention reason.
- Generated facts/profile labels cannot become source evidence.
- Duplicate facts do not inflate profile scores.
- Candidate decision requires positive source evidence; unavailable regulation blocks completion.
- Primary history retrieval excludes generated ECCNs/profile/path/memo/question text and file/title tokens.
- Material presence/absence mismatch prevents a close-precedent label.
- Memo candidate identifiers must be members of the validated decision.
- Unresolved blocking contradictions must be disclosed by memo output.
- Upload prompt-injection language cannot choose a profile/candidate or bypass review.

## Profiles audited

All profiles in `PROFILE_CONTRACTS` now declare required source signal alternatives. `ai_accelerator` additionally declares a hard exclusion on explicit accelerator absence. Platform security and optional wireless capabilities can open bounded evidence questions without relabeling the product as a crypto/radio device.

## Retrieval changes

Primary retrieval uses normalized source facts/source text only. ECCN strings are never primary retrieval features. Reranking stores supporting matches, material differences, blocking contradictions, score components, and recommended use. A secondary hypothesis pass is documented but not yet implemented.

## Provider conformance

Existing Fireworks, local, and Jungle Grid backend contract tests pass through the shared worker schema and deterministic routing. Prompt separation was updated. Full live-provider equivalence was not run because external provider credentials/runtimes were unavailable; the sample verified fail-closed fallback into the same deterministic gates.

## Tests added and results

- 28-category fictional evaluation corpus: 22/22 profile assertions, 6/6 abstention assertions, 0 unsupported-candidate rate, prompt-injection assertion passed.
- Worker unit/regression/counterfactual/metamorphic/property/security/provider tests: 43 passed.
- API unit tests: 18 files passed.
- Typecheck: all workspace packages passed.
- Lint: all workspace packages passed.
- Worker sample: passed through credential-missing fallback.
- Prisma client generation: passed (sandbox emitted non-fatal stream-fd warnings).
- API integration tests: not executed; all five files stopped because `TEST_DATABASE_URL` is not configured.
- Web production build: compilation and type validation passed, then the process exited during page-data collection without a normal status, likely due local memory pressure. Full build is not counted as passed.

## Known limitations and remaining risks

- No synchronized/versioned BIS/eCFR corpus implementation yet; `regulatoryCorpusVersion` remains null and candidates are deliberately incomplete/blocked.
- No OCR, DOCX, XLSX, or page-coordinate extraction was added. API supports `pdftotext` and text-like formats; direct worker PDF extraction remains a stub.
- Multi-document revision/SKU conflict resolution exists at the evidence-scope primitive level but is not yet wired to a batch ingestion/run API.
- Secondary hypothesis retrieval is not implemented.
- History ingestion metadata does not yet fully structure approval state, source authority, configuration, and dates.
- The memo is validated against the decision, but the renderer still receives compatibility projections rather than a single decision-only function argument.
- The reviewer UI has clearer precedent labeling but does not yet render the complete provenance graph or rejected-profile explanations.
- Confidence calibration metrics require a qualified-reviewer-labeled corpus; current fixture metrics are deterministic correctness checks, not legal-classification accuracy claims.
- Integration/tenant isolation needs rerun with the required test database before deployment.

## Manual validation steps

1. Apply the migration in a disposable environment and run all API integration tests with `TEST_DATABASE_URL`.
2. Run the ES25 fixture through local and every configured remote provider; compare `validatedDecision` snapshots.
3. Verify the primary history trace contains no generated ECCNs, profiles, path prose, questions, or file/title tokens.
4. Review contrast records in the UI and confirm accelerator precedents are not labeled close when accelerator evidence is absent.
5. Synchronize an official regulatory corpus, record effective dates/hashes, and verify candidates remain blocked when the corpus is unavailable.
6. Complete desktop/tablet/mobile review-page inspection after a successful production build.

## Acceptance status

The central anti-confirmation-loop criteria are implemented and covered by tests. The repository-wide objective is not fully complete because regulatory corpus retrieval, expanded document/OCR ingestion, batch multi-document execution, full decision-only memo rendering, live-provider conformance, integration tests, and final visual/build verification remain outstanding. This report intentionally does not declare completion.
