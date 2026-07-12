# Evidence and decision model

Substrata separates five authority classes: uploaded source evidence, user-supplied facts, deterministic derivations, internal precedent, and official regulatory evidence. Model-generated prose and routing hypotheses are never source evidence.

## Evidence semantics

Every material technical assertion has a stable evidence ID, fact type, normalized/raw value, polarity (`present`, `absent`, `unknown`, `ambiguous`, or `not_applicable`), origin, strength, confidence, exact quote/location where available, configuration scope, extraction method/version, and warnings. Explicit current-configuration evidence outranks family, optional, future, development, and marketing configuration statements. Duplicate evidence IDs do not add confidence.

An explicit absence is evidence, not a missing value. Optional and separately available capabilities are configuration-dependent, not unconditional booleans. A positive and negative assertion in the same unresolved scope creates a blocking contradiction.

## Profile definitions and eligibility

Profiles declare required signal alternatives, hard exclusions, and a minimum number of positive source-backed signals in `classification_heuristics/profiles.py`. Eligibility is evaluated before scoring. Scores only rank eligible profiles. If none qualify, the primary profile is `unknown` and the run abstains.

To add a profile safely:

1. Add bounded source terms to `signals.py`; never add product/file names or ECCNs.
2. Add a `ProfileContract` with the smallest defensible required capability set and hard exclusions.
3. Add paths separately and candidate gates separately.
4. Add positive, negative, optional, configuration-conflict, counterfactual, and irrelevant-token tests.

## Candidate and regulatory eligibility

A candidate requires positive source-backed evidence, compatible product form, no unresolved blocking contradiction, and current official regulation text. If official text is unavailable, the path may remain open for preliminary human review, but the candidate is incomplete/blocked and must not be represented as a substantiated recommendation. Internal precedent cannot satisfy this gate.

Official regulatory records must retain source URL/identifier, category/ECCN/paragraph, effective and retrieval dates, corpus version, and content hash. Current BIS/eCFR material and applicable Federal Register amendments are the regulatory authority. Company history is always labeled “Internal precedent only — not regulatory authority.”

## Retrieval separation

The primary history pass uses normalized source facts only. Generated profiles, review-path prose, reviewer questions, memo text, and candidate ECCNs are prohibited. A later hypothesis pass may use tentative metadata, but must be labeled and cannot override source incompatibility. Regulatory retrieval is a third, independent pass over a versioned official corpus.

History reranking records supporting matches, material differences, blocking contradictions, score components, and recommended use (`precedent`, `contrast`, or `irrelevant`). Explicit absence in the current configuration receives a blocking penalty against a history record where the capability is present.

## Validated decision and memo boundary

The worker creates one `classification_decision_v1` object before memo generation. It contains evidence, derivations, contradictions, accepted/rejected profiles and candidates, paths, regulatory status, missing evidence, questions, confidence, abstention, validation results, and provenance edges. Memo validation rejects candidate identifiers not present in that object and requires disclosure of unresolved blocking contradictions. A memo is a rendering of the decision, not another classification stage.

## Providers and untrusted documents

All providers must return the same strict extraction contract and pass the same deterministic evidence, eligibility, contradiction, and decision validation. Provider fallback is logged and never bypasses gates. Document text is untrusted data inside an explicit delimiter; instruction-like content is recorded as a warning and cannot choose candidates, bypass review, or alter retrieval.

## Versioning and legacy runs

New runs persist pipeline, decision-schema, rule, prompt, provider/model, regulatory-corpus, and retrieval-index versions plus evidence/contradiction/decision snapshots. Old runs retain their original outputs and receive only a legacy version label during a safe backfill; they are not recalculated silently.
