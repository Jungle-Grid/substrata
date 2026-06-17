# Architecture

## Monorepo Layout

Substrata is a single monorepo with one frontend app, one backend API, one Python worker, and shared packages:

- `apps/web`: Next.js frontend
- `apps/api`: Express API
- `workers/classifier`: Python classification worker
- `packages/db`: Prisma schema and database client
- `packages/shared`: shared TypeScript types and validation schemas
- `docs`: internal product and engineering documentation
- `infra`: local infrastructure and runtime notes

## Boundary Definition

### Frontend

The frontend is responsible for:

- document and classification run views
- upload flows
- memo and citation display
- human review state display

It should not contain classification logic.

### Backend API

The API is responsible for:

- request validation
- persistence
- upload metadata handling
- orchestration of classification runs
- exposing structured records to the UI

It owns application workflows, but not technical extraction logic.

### Worker

The Python worker is responsible for:

- document ingestion
- text extraction
- spec extraction
- normalization of export-relevant parameters
- ECCN candidate generation
- memo generation
- artifact emission

The worker must emit reproducible structured outputs and attach explicit uncertainty markers.

### Database

Postgres stores durable system-of-record entities:

- organizations and users
- documents and runs
- extracted specifications
- ECCN candidates
- citations
- memos
- human reviews
- audit events

## Datasheet-to-Run Flow

1. User uploads a document through the web app.
2. API stores document metadata and a storage path reference.
3. User starts a classification run.
4. API creates a `ClassificationRun` with `pending` status.
5. API calls a worker client abstraction.
6. In MVP mode, the worker client uses a local stub.
7. The worker processes the document and emits structured JSON plus memo/artifact outputs.
8. API persists extracted specs, candidates, citations, and memo.
9. Frontend renders the run for human review.
10. Reviewer records outcome and notes.

## Artifact Storage

Artifacts should be treated as first-class objects even in the MVP. Expected artifact classes:

- original uploaded document
- extracted raw text
- structured extraction JSON
- memo Markdown
- worker logs

The product uses an S3/R2-compatible abstraction with a local filesystem fallback for development. Database records store stable artifact paths rather than embedding large blobs in application tables.

## Human Review in the System

Human review is mandatory before any output is considered usable for an internal classification conclusion. The system therefore separates:

- machine-generated analysis
- reviewer comments and disposition
- audit events proving who reviewed what and when

## Jungle Grid Later

The worker execution boundary is deliberately separated behind a worker client abstraction. Today it can run locally or as a stub. Later it can submit jobs to Jungle Grid while preserving:

- job status tracking
- logs
- retries
- artifact download references
- worker version capture
- reproducibility metadata
