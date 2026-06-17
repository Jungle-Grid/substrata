# Human Review Policy

Every Substrata classification output requires human expert review before it may be relied on for any internal or external export-classification decision.

## Policy Statements

- Substrata is a review assistant, not a final decision-maker.
- Suggested ECCNs are drafts for expert evaluation.
- Extracted specifications may be incomplete, ambiguous, or incorrect.
- Citations and memo text must be checked by a qualified reviewer.
- Uncertainty flags must never be ignored or hidden.
- A classification is not considered final until a human reviewer records an explicit disposition.

## Product Implications

- UI must clearly label outputs as draft analysis.
- Worker outputs must include `requires_human_review: true`.
- Review status must be visible on run detail pages.
- Audit records must show who reviewed the run and when.
