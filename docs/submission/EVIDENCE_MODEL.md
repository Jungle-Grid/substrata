# Evidence model

## Summary

Substrata represents a review as a connected chain of source-grounded evidence and human actions.

## Source documents

A document and its source package anchor the run. Original file metadata, extracted text, and generated artifacts remain associated with the organization-scoped review.

## Extracted technical facts

Facts capture normalized values such as device architecture, interface, memory, cryptography/security, and performance. Each fact carries a source snippet and confidence.

## Citations and snippets

Review paths and candidate reasoning point back to source-grounded evidence. Regulatory mapping remains review material and may require current control-text confirmation.

## Review candidates and confidence

Candidates are organized as active review candidates, blocked evidence-required candidates, or fallback paths. Confidence describes evidence quality, not legal certainty.

## Uncertainty flags and reviewer questions

Uncertainty flags make missing or ambiguous evidence visible. Reviewer questions turn those gaps into concrete follow-up work.

## Memo draft and audit events

The memo assembles evidence into a review-ready narrative. Audit events preserve generation, review, and disposition activity.

## Evidence chain

`Source document → extracted fact → candidate review path → reviewer question → memo draft → human signoff → audit record`
