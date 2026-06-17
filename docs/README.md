# Substrata

Substrata is an AI-native export control and trade compliance review assistant for semiconductor, electronics, and advanced hardware companies.

The initial product wedge is narrow and practical:

1. A user uploads a semiconductor or advanced hardware datasheet.
2. Substrata extracts export-relevant technical specifications.
3. The system compares those extracted facts against structured EAR and Commerce Control List logic.
4. The system produces likely ECCN candidates, citations, uncertainty flags, and a draft memo for human export-control review.

Substrata is not a legal decision-maker. It is a drafting, evidence, and review system for compliance teams that need faster first-pass analysis without losing traceability.

## Primary User

The first user is an in-house export compliance manager, trade compliance analyst, or outside advisor supporting a hardware company that repeatedly reviews datasheets, BOM-adjacent technical documents, and product specifications.

## MVP Scope

The MVP focuses on:

- Sensitive document upload and storage
- Structured extraction of export-relevant technical specifications
- Draft ECCN candidate generation with evidence and uncertainty annotations
- Review-ready memo generation
- Human review status tracking
- Audit-friendly run records and artifacts

## Why This Wedge

Datasheet review is frequent, repetitive, high-stakes, and evidence-heavy. Teams often lose time manually extracting specs, reconciling them with regulatory text, and preparing internal memos. Substrata reduces time-to-first-draft while preserving human judgment.

## What This Documentation Covers

- [PRODUCT.md](./PRODUCT.md): product thesis, user workflow, and MVP boundaries
- [ARCHITECTURE.md](./ARCHITECTURE.md): system boundaries and data flow
- [ROADMAP.md](./ROADMAP.md): staged product evolution
- [COMPLIANCE_SCOPE.md](./COMPLIANCE_SCOPE.md): policy and scope constraints
- [DATA_MODEL.md](./DATA_MODEL.md): core entities and audit structure
- [API.md](./API.md): initial API contract
- [WORKER_DESIGN.md](./WORKER_DESIGN.md): classifier worker pipeline
- [JUNGLE_GRID_INTEGRATION.md](./JUNGLE_GRID_INTEGRATION.md): future execution model
- [VALIDATION_PLAN.md](./VALIDATION_PLAN.md): one-week market validation plan
- [SECURITY.md](./SECURITY.md): security and document handling assumptions
- [HUMAN_REVIEW_POLICY.md](./HUMAN_REVIEW_POLICY.md): mandatory human review policy
