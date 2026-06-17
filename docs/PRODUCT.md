# Product Definition

## Target Customer

The initial target customer is a semiconductor, electronics, photonics, or advanced hardware company that faces recurring export-classification work during product launch, sales support, distributor enablement, or cross-border shipment review.

Target accounts include:

- Semiconductor component manufacturers
- Embedded systems vendors
- RF and sensor hardware companies
- Compute, edge AI, and accelerator vendors
- Outside counsel or specialist trade compliance consultancies serving hardware clients

## First User

The first user is a compliance manager or trade compliance analyst who:

- reviews technical product documents
- coordinates with engineering to confirm specifications
- drafts internal classification memos
- needs defensible citations and audit records

## Pain

Current workflows are slow and manual:

- datasheets are dense and inconsistent
- engineers describe performance differently across products
- classification reasoning is often recreated from scratch
- citations are hard to maintain
- review artifacts are scattered across email, spreadsheets, PDFs, and shared drives

## User Workflow

1. Upload a datasheet or technical document.
2. Create a classification run.
3. Review extracted export-relevant specifications.
4. Inspect candidate ECCNs and supporting citations.
5. Review uncertainty flags and missing-information prompts.
6. Read and edit a draft classification memo.
7. Record human review outcome.
8. Retain the full run as an auditable internal record.

## Core MVP

The MVP must support:

- document upload
- document listing and detail pages
- creation of a classification run
- deterministic stub extraction and ECCN candidate generation
- citations attached to each candidate and memo
- memo generation in Markdown
- explicit uncertainty flags
- human review status capture
- audit events for key actions

## Explicitly Not Building Yet

- final legal determination automation
- automated filing or government submission workflows
- customer-facing distributor portals
- deep ERP, PLM, or shipping integrations
- billing and entitlements
- real multi-tenant RBAC enforcement
- advanced AI orchestration or agent swarms
- a full production-grade rules engine for the entire CCL
- sanctions, denied party screening, or license management modules

## Success Criteria

The MVP is successful if it can:

- produce a review-ready first draft from a datasheet in minutes
- preserve a defensible evidence chain from extracted specs to memo text
- reduce manual memo-preparation time for a reviewer
- demonstrate real buyer interest through pilot usage and willingness-to-pay conversations
- provide a clean path to auditable, reproducible production execution
