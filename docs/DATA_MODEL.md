# Data Model

## Design Principles

The model is designed for:

- auditability
- reproducibility
- evidence traceability
- future multi-tenant isolation
- structured human review

## Core Entities

### Organization

Represents a customer account or internal business unit boundary. It owns documents, runs, reviews, and users.

### User

Represents a person interacting with the system. In the MVP this may be mocked, but the schema must support future real authentication and reviewer attribution.

### Document

Represents an uploaded datasheet or technical file. It stores metadata, storage location, parsing status, and source details.

### ClassificationRun

Represents a single attempt to classify a document. It stores status, model or rules version metadata, confidence, uncertainty flags, worker job identity, artifact paths, and timing metadata.

### ExtractedSpec

Represents a normalized export-relevant technical parameter extracted from the document. Examples include process node, operating frequency, radiation hardness, encryption capability, or peak performance metrics.

### ECCNCandidate

Represents a possible classification candidate generated for a run. It stores the candidate code, rationale, confidence, and reviewer-facing notes.

### Citation

Represents supporting evidence. Citations may point to regulatory text, internal extraction evidence, or document sections. They should be attachable to candidates and memos.

### ReviewMemo

Represents the generated memo content for a run. The memo must remain linked to the run and should be versionable later.

### HumanReview

Represents a human reviewer’s decision, notes, and status on a run.

### AuditEvent

Represents immutable historical records of meaningful actions such as document upload, run creation, worker completion, memo generation, and human review updates.

## Evidence Chain

The key system invariant is:

`Document -> ClassificationRun -> ExtractedSpec / ECCNCandidate / Citation / ReviewMemo -> HumanReview -> AuditEvent`

This chain ensures every memo and suggestion can be traced back to specific extracted facts and supporting citations.

## Company History Entities

`CompanyHistoryBatch` groups a controlled upload of internal reference files. `CompanyHistoryDocument` links a normal organization-owned `Document` to the batch and records ingestion status, errors, deterministic metadata markers, duplicate state, and ingestion version.

`CompanyHistoryChunk` stores offset-preserving extracted-text chunks. `ClassificationHistoryMatch` links a classification run to the exact historical document and chunk retrieved for reviewer comparison, including rank, deterministic match reasons, retrieval method, and retrieval version.

Company History deliberately does not reuse `Citation`: historical files are internal reference material, not regulation sources. It also does not create an approved classification record from an ECCN-looking string found in a source file.
