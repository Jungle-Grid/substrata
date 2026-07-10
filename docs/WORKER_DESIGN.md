# Worker Design

The Python worker is a deterministic, modular pipeline that turns a document into structured classification artifacts.

## Pipeline

1. Ingest document
2. Extract text
3. Extract tables and specs
4. Normalize export-relevant parameters
5. Generate ECCN candidates
6. Attach citations
7. Generate memo
8. Emit artifacts and structured JSON

## Stage Responsibilities

### 1. Ingest Document

Resolve the input payload, locate the source file, and record a stable execution context.

### 2. Extract Text

Convert the source document into normalized text. In the MVP, this is a simple text read with placeholder support for PDFs.

### 3. Extract Tables and Specs

Identify likely technical specification lines and table-like patterns. In the MVP, this uses heuristics rather than ML.

### 4. Normalize Export-Relevant Parameters

Map raw strings into structured fields such as:

- parameter name
- value
- unit
- source snippet
- confidence

### 5. Generate ECCN Candidates

Apply a narrow, explainable stub rules layer that returns 1 to 3 possible ECCN candidates with reasons and uncertainty flags.

### 6. Attach Citations

Link each candidate to:

- relevant extracted document snippets
- placeholder regulatory citations
- relevance notes

### 7. Generate Memo

Produce review-ready Markdown that summarizes:

- document identity
- extracted facts
- candidate ECCNs
- uncertainties
- recommendation for human review

### 8. Emit Outputs

Emit structured JSON and memo Markdown with:

- `requires_human_review: true`
- extracted specs
- candidate ECCNs
- citations
- memo
- artifact references

## Reproducibility

Every run should eventually capture:

- worker version
- rules version
- input file reference
- execution timestamps
- artifact outputs

The MVP schema already reserves space for these concerns.

## Company History Boundary

Phase 1 history ingestion does not run through the classification worker. The API reuses the approved PDF/text extraction path, stores deterministic text chunks, and retrieves them only after the worker has extracted current-document facts. This keeps prior internal material out of ECCN candidate generation and makes each comparison provenance record explicit.

A future worker comparison stage may receive only top, cited historical chunks and must return stored chunk IDs with explicit similarities, differences, and unknowns. It must never treat prior company material as regulatory authority or a substitute for human review.
