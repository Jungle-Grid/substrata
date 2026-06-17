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

- `GET /classification-runs/:id/memo`
  - fetch the memo Markdown and related review metadata

- `GET /classification-runs/:id/memo/download`
  - download the memo as Markdown with a review-oriented filename

- `POST /classification-runs/:id/review`
  - record reviewer disposition and note
  - allowed statuses: `pending_review`, `reviewed`, `needs_more_information`, `rejected`

- `GET /classification-runs/:id/artifacts`
  - fetch stored artifact paths and best-effort previews for extracted text and memo artifacts

## Future Endpoints

- signed upload/download URLs
- memo editing/versioning
- rerun and compare
- audit event browsing
- org/user management
