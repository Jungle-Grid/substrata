# API

## Principles

- JSON-first API
- explicit validation on write endpoints
- stable identifiers for every entity
- future-ready for auth and asynchronous job execution

## Initial Endpoints

### Health

- `GET /health`
  - returns service health and environment metadata

### Documents

- `POST /documents`
  - create a manual document record from metadata plus pasted raw text

- `POST /documents/upload`
  - upload a PDF or text file with multipart form data
  - stores the original file locally
  - extracts text where possible and preserves file metadata

- `POST /documents/sample`
  - create a document from the bundled public/sample datasheet text file

- `GET /documents`
  - list documents for the current organization

- `GET /documents/:id`
  - fetch a single document with related runs

### Classification Runs

- `POST /documents/:id/classification-runs`
  - create a pending classification run for a document
  - dispatch through the worker client abstraction

- `GET /classification-runs/:id`
  - fetch a single run with extracted specs, candidates, citations, memo, and review status

- `GET /classification-runs/:id/demo-publication-status`
  - fetch admin-only public demo publication state for a run

- `POST /classification-runs/:id/publish-demo`
  - publish a completed run as the active public demo
  - requires explicit public-sharing confirmation

- `POST /classification-runs/:id/unpublish-demo`
  - remove the currently active public demo publication for that run

- `GET /classification-runs/:id/memo`
  - fetch the memo Markdown and related review metadata

- `GET /classification-runs/:id/memo/download`
  - download the memo as Markdown with a review-oriented filename

- `POST /classification-runs/:id/review`
  - record reviewer disposition and note
  - allowed statuses: `pending_review`, `reviewed`, `needs_more_information`, `rejected`

- `GET /classification-runs/:id/artifacts`
  - fetch stored artifact paths and best-effort previews for extracted text and memo artifacts

### Public Demo

- `GET /public/demo`
  - returns metadata for the active public demo and its canonical URL
  - returns `404` when no public demo is active

- `GET /public/classification-runs/:runId`
  - unauthenticated sanitized projection for the one active published demo run
  - returns `404` for every non-published or replaced run ID

### Company History

- `POST /history/batches`
  - owner/admin-only multipart upload of up to 20 historical PDF, TXT, MD, CSV, or JSON files
  - derives organization from the session, ignores client organization identifiers, validates type/size, hashes files, and queues ingestion
- `GET /history/batches`
  - lists organization-scoped upload batches and progress
- `GET /history/batches/:id`
  - returns per-file ingestion, duplicate, and error states
- `GET /history/documents/:id`
  - returns a historical record’s source-backed markers, indexed excerpts, and match usage
- `POST /history/documents/:id/reprocess`
  - owner/admin-only retry for failed or indexed material; increments ingestion version without mutating prior match evidence

## Future Endpoints

- signed upload/download URLs
- memo editing/versioning
- rerun and compare
- audit event browsing
- org/user management
