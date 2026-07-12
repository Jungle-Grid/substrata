# Canonical decision v2 correction report

Date: 2026-07-12

## Exact root cause of profile divergence

The provider was allowed to emit `productProfile`, while the hybrid heuristic engine independently overwrote `product_profile` specs after searching source/component signals. The memo then read the overwritten specs rather than a canonical decision. An installed ARM processor therefore became the complete-product profile even when the source described a gateway. There was no required resolution record when provider and heuristic profiles differed.

Canonical decision v2 resolves the exported product form first, derives a product-level profile from that form, and stores processor, accelerator, FPGA, converter, RF, and crypto identities as component-level profiles where appropriate. Provider and heuristic proposals are hypotheses. Any divergence must have a `profile_resolution_records` entry identifying proposal stage/provider, proposed and canonical profiles, evidence IDs, status, and reason.

## Exact root cause of candidate divergence

The backend-assisted flow called the legacy local candidate generator before canonical heuristics, producing Category 3/3A991. The later heuristic engine replaced that list and emitted 5A002 from a newly opened security path. Decision v1 then marked the candidate blocked, but `_specific_eccn_candidates` enriched and serialized the mutable candidate objects afterward. Thus the decision snapshot, worker candidate list, and memo did not share one lifecycle.

Decision v2 records every proposal and transition. Prior-stage candidates missing from canonical rules become `withdrawn`; deterministic proposals become `eligible`, `blocked`, or `rejected` with triggering evidence, blocking/rejection reasons, provider/stage, and regulatory evidence IDs. Only `eligible_candidates` enter the normal worker/API candidate list. Unsupported hypotheses remain under `blocked_candidate_hypotheses` and memo section “Specific candidates not yet supportable.”

## Product and component separation

The canonical model now stores:

- `exported_product_form`
- `product_level_profile`
- `component_level_profiles`
- `installed_components`
- `optional_components`
- `capabilities`
- `configuration_scope`

A gateway with Cortex-A53 resolves as a gateway/sensor-gateway product with an installed MCU/SoC component. A GPU server remains a server. A router with a cryptographic processor remains a router. An evaluation kit remains a kit while included/optional modules are recorded separately.

## TLS and capability semantics

Capability records separate presence, implementation knowledge, user accessibility, classification significance, and evidence IDs. MQTT over TLS is recorded as transport-security capability `present`; optional TLS is configuration-dependent. Unknown implementation, accessibility, or key management does not negate presence. A security review path may open while a specific candidate remains blocked.

## Manufacturer provenance

Provider identity fields are projected only when the proposed manufacturer string occurs in provider-returned exact source quotations. Platform, workspace, application, uploader, provider, and organization names are not manufacturer evidence. The canonical memo independently renders `manufacturer = unknown` unless a retained manufacturer fact contains the value in its source snippet. Semantic validation blocks unproven manufacturer facts.

## Document roles and history retrieval

History rows receive deterministic roles:

- product precedent
- technical source
- classification memo
- review worksheet
- policy
- counsel guidance
- regulatory source
- README
- administrative

README and administrative records are filtered from results. Policy and counsel records are context, never product precedent. Product comparisons expose agreements, material differences, blocking contradictions, configuration differences, role, and recommended use. Explanations are generated only from exact identifier/family/fact matches and capability concepts whose polarity is present in both records. Negated accelerator text cannot become an accelerator agreement.

History is finalized before the canonical memo is persisted. Retrieval now allocates independent role pools before product-precedent top-K selection: product precedents, technical comparisons, counsel guidance, internal policy, regulatory context, and excluded administrative/context material. The persisted snapshot contains these pools, their retrieval metadata, and stable decision/memo hashes. API reads return this snapshot; they do not enrich, rerank, or rewrite history.

## History, requirements, limitations, and lineage hardening

History is rendered directly from the finalized structured comparison fields. A document cannot occupy a product-precedent slot when its role is `dataset_readme`, `administrative`, `internal_policy`, `counsel_guidance`, `regulatory_material`, or `unclassified`. Unknown legacy history defaults to context-only rather than precedent.

Review-path requirements are assessed against normalized facts before being shown as missing. Product-form mappings add gateway/appliance, board/card, accelerator-card, and evaluation-kit requirements without imposing sensor performance questions on a gateway merely because it connects to sensors. A satisfied requirement is excluded from reviewer questions.

Unavailable official regulatory text is now a blocking `OFFICIAL_REGULATORY_TEXT_UNAVAILABLE` system limitation with `resolutionOwner = system`; it is not a reviewer question. A blocked candidate records all unresolved requirement-derived blockers as well as regulatory availability. Candidate-lineage audit events summarize proposed, blocked, rejected, withdrawn, and eligible transitions without source-text disclosure.

The memo has a dedicated decisive-negative-evidence section. Any source fact used as absence evidence retains its exact quote, source location/scope where available, and confidence, so a reviewer can trace exclusions such as an excluded accelerator or an unpopulated module.

## Upstream document qualification and entity isolation

Before any provider or deterministic extraction runs, the worker now qualifies the upload and discovers independently listed product entities. Multi-product catalogs, test manifests, README-style instructions, and sparse labels are returned as a human-review intake report rather than being flattened into a single canonical product. The report lists entity identifiers and asks for a target selection or technical source per entity.

Canonical decision v2 is invoked only for `single_product_classifiable` documents. For those documents every normalized source-evidence record carries `subject_entity_id` and a relationship (`describes_entity` or `describes_component`); semantic validation blocks a decision if source evidence belongs to a different target entity. API-side company-history retrieval is skipped for documents that fail this gate, preventing a multi-entity upload from contaminating a primary retrieval query.

Entity resolution now distinguishes raw mentions from resolved entities. Quantity/unit values, memory and interface technologies, processor and radio standards are technical attributes; case/review/memo-style identifiers and prior-record contexts are history references. Neither contributes to `independentProductEntityCount`. Only clustered product subjects with product-context evidence affect the classifiability gate. Key-value ownership and repeated model/part-number aliases attach attributes and references to the current product instead of creating additional products.

Markdown and CSV tables are expanded into product-first logical rows before mention typing. The resolver identifies a product/model/part-number column, processes it before the row's attributes regardless of column order, and binds memory/performance/reference cells to that row's product. Explicit internal record references can be supplied to history retrieval as lookup hints; they are not technical facts and do not affect profile, path, candidate, or similarity evidence. Provider mention-type proposals remain advisory and cannot change the independently classifiable product count.

## Blocked hypotheses versus candidates

An open path does not imply an eligible ECCN. `eligible_candidates` require path evidence and current regulatory evidence. `blocked_candidate_hypotheses` retain potentially relevant codes and their missing prerequisites but are excluded from candidate counts, persistence, and normal candidate cards. The reviewer UI displays them separately as “Specific candidates not yet supportable.”

## New semantic invariants

- Memo profile equals canonical product profile.
- Provider/canonical profile divergence has a resolution record.
- Memo candidate codes are members of the canonical decision.
- Every prior/final candidate-set difference has transition records.
- Advanced-computing wording requires an open advanced-computing path.
- Category 5 Part 2 wording requires the corresponding open path.
- Memo cannot negate cryptographic protocol capability recorded as present.
- Manufacturer values require direct quotation provenance.
- Every open path has non-empty path-specific missing evidence.
- Blocked hypotheses cannot be counted as eligible candidates.
- Path openings retain exact triggering evidence IDs.
- History agreements are limited to structured features present in both records.
- README/administrative records cannot become product precedents.
- History role allocation happens before product-precedent top-K selection.
- Missing evidence cannot include a satisfied requirement.
- Candidate blockers must cover every unresolved path requirement.
- Blocking regulatory-corpus absence is system-owned, not a reviewer task.
- Decisive negative evidence must be rendered with source provenance.

Any blocking semantic failure emits `worker.semantic_validation_failed` with structured failures and prevents `worker.output_validated`.

## Tests added

`test_canonical_decision.py` covers product/component separation for gateways, servers, routers and evaluation kits; TLS semantics; system-owned regulatory limitations; negative-evidence rendering; manufacturer isolation; provider consistency; candidate transitions; stale memo profile/category text; missing-evidence completeness; blocked/eligible separation; and filename/product-name invariance.

History retrieval tests cover README/administrative exclusion and ensure explicit accelerator absence cannot be explained as a shared accelerator feature.

## Test results

- Worker tests: 53 passed.
- Category-diverse evaluation: 22/22 profile assertions and 6/6 abstention assertions passed; unsupported-candidate rate 0; prompt-injection assertion passed.
- API history role tests and API typecheck passed in this hardening pass. The full API runner requires its IPC socket to be permitted by the execution sandbox.
- Workspace typecheck: passed.
- Workspace lint: passed.
- Worker sample: passed through deterministic fallback and emitted canonical decision v2.

## Remaining limitations

- Product-form rules remain deterministic lexical contracts and need expansion/calibration on a qualified reviewer-labeled corpus.
- The official regulatory corpus remains unavailable, so specific candidates correctly remain blocked.
- Multi-document identity/revision resolution is represented in evidence scope but not yet orchestrated as a batch decision API.
- Historical rows indexed before role-aware retrieval rely on deterministic content/record-type inference; a role backfill and reviewer correction UI would improve precision.
- Live provider calls were not repeated during this correction; provider invariance is covered with contract-level proposals and deterministic resolution tests.
