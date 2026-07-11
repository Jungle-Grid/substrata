# Hybrid classification review-path engine

## Root cause of the AX920 failure

The prior worker trusted an LLM-supplied `product_profile` whenever one was present and supported only a small profile set. Its local fallback recognized converters, FPGA/SoC, MCU, RF, crypto, and generic electronics, but no AI accelerator or advanced-computing profile. Candidate generation then branched on that single profile, so AX920's TOPS, TFLOPS, HBM3E, PCIe Gen5, signing, and attestation evidence could not open an advanced-computing path.

Broad path-family outputs were also removed before persistence because the candidate presenter retained only fully verified, specific ECCN records. The remaining generic branch primarily emitted 3A991. Finally, company-history retrieval ran after candidate and memo generation, so the AX900/3A090 match could only be appended as prose and could not influence routing or candidate priority.

## New pipeline

1. The selected extraction backend produces source-backed facts and snippets.
2. Deterministic rules normalize facts and source terms, score every product profile, and select one primary plus any applicable secondary profiles.
3. Profile rules open review paths and generate typed review, fallback, or blocked candidates with evidence and missing checks.
4. Company-history retrieval adds priority-only signals and prior-code references; it never creates a human conclusion.
5. The memo consumes the heuristic profiles and candidates, after which structural contradiction checks can mark the run as needing attention.
6. The API persists the heuristic result and `classification_trace`, and only an authenticated reviewer can record the final internal recommendation.

The canonical fallback is `general_electronics`. Legacy profile names, including `generic_electronics`, remain accepted as input aliases for historical compatibility.

## Responsibility boundaries

### LLM extraction

- Extract technical facts, values, units, and source snippets.
- Identify missing facts and ambiguous source language.
- Improve fact coverage in assisted mode and draft readable memo prose.
- Never control the authoritative product profile, open or close review paths, promote a fallback, or create a reviewer-final result. An LLM `product_profile` value contributes no heuristic score.

### Deterministic heuristics

- Normalize source text and extracted facts, score every supported profile, and select the primary and secondary profiles.
- Open review paths, create evidence-backed review candidates, create broad fallback candidates, and keep evidence-insufficient candidates blocked and visible.
- Add profile-specific missing-evidence checks, history-priority signals, confidence indicators, and contradiction flags.
- Validate the memo against the structured result and populate `classification_trace`.

### Human reviewer

- Confirm the applicable current control text, thresholds, product configuration, and any required end-use or destination context.
- Resolve missing evidence and contradictions, exclude or modify candidates with reasons, and record the final internal recommendation.
- Treat company history as internal comparison context only.

## Candidate types and fallback behavior

- `review_candidate`: system-generated and supported strongly enough to present for qualified confirmation; never a final classification.
- `fallback_candidate`: broad comparison point considered only after narrower open paths are excluded. `3A991` is a fallback for specific hardware profiles.
- `blocked_candidate`: a relevant code or candidate family whose required affirmative evidence is missing.
- `excluded_candidate`: rejected with an explicit reviewer or rule reason.
- `reviewer_final`: created only through authenticated human signoff; heuristics and LLM backends cannot create it.

`general_electronics` is the primary profile only when no specific profile crosses its threshold. Specific profiles always retain a general-electronics fallback comparison without being downgraded to it.

## Security and cryptography rules

Secure boot, firmware signing, remote attestation, secure enclaves, and encrypted FPGA bitstreams open the security / Category 5 Part 2 review path because additional evidence is required. These platform-integrity features do not by themselves support a strong `5A002` candidate.

`5A002` becomes a `review_candidate` only when affirmative source evidence supports functionality such as user-accessible encryption, data confidentiality, payload or bulk encryption, key management or storage, MACsec, TLS offload, IPsec, VPN, cryptographic acceleration, or HSM behavior. Mentions framed as unknown, not provided, dependent on SKU, or requiring confirmation do not satisfy the gate. Otherwise `5A002` remains a low-confidence `blocked_candidate` with specific reviewer questions.

## Company history and contradictions

Similar internal records can increase review-path priority and attach prior ECCNs as internal references. History never satisfies a current technical threshold, overrides contradictory source evidence, or determines the final internal recommendation. Performance increases relative to a historical product require a new current-threshold comparison.

Error-level contradictions prevent a clean validation state. Checks cover security evidence without a security path, memo language that denies extracted security or generated candidates, generic profiles that conflict with specific compute evidence, and memo claims that deny retrieved company history.

## Trace contract

`GET /v1/classification-runs/:id` exposes the persisted `classificationTrace`, including backend mode/status, extraction source, detected profiles and scores, matched signals, opened paths, candidates generated and blocked, filtered candidates and reasons, history matches and signals, contradictions, missing-evidence checks, rules version, and final frontend candidate counts by type.

## Production validation checklist

- Run the full heuristic fixture matrix and assisted-versus-fallback stability tests.
- Run the live Fireworks comparison script when production credentials are available; the six standard fixtures must retain the same primary profile, review paths, and candidate families.
- Run API tests, lint, typecheck, Prisma validation, and `pnpm build`.
- Confirm `.next/BUILD_ID` and the standalone server artifact exist; `scripts/verify-web-build.mjs` and CI enforce both.
- Do not run `next dev` and `next build` concurrently against the same `.next` directory.
- Inspect review candidates, fallbacks, blocked candidates, missing evidence, history influence, contradictions, and Current Recommendation at desktop and mobile widths.

## Hardening validation record

On 2026-07-10, AX920, the secure network card, RF transceiver, ADC/DAC, FPGA board, and rugged sensor completed against the configured Fireworks backend. Each retained the same deterministic primary profile, review paths, and candidate families as fallback mode. AX920 retained `3A090` and `4A090` as review candidates, `3A991` as fallback, and `5A002` as blocked; the secure network card retained `5A002` as a review candidate because MACsec, TLS offload, IPsec, key storage, and HSM evidence were present.

The production web build also completed with Next.js 15.5.19, created a non-empty `BUILD_ID`, generated the standalone server, and returned HTTP 200 in a standalone smoke test. Earlier apparent failures were caused by the command wrapper returning while the build continued in the background and by overlapping `next dev`/`next build` processes sharing `.next`; they were not caused by classification traces, fixtures, Prisma imports, or route bundling.
