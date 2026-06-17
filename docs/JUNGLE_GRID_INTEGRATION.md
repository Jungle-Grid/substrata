# Jungle Grid Integration

## Goal

Jungle Grid is the planned production execution layer for classification jobs. The MVP must therefore keep worker execution behind an abstraction boundary.

## Desired Future Flow

1. API creates a classification run in `pending` state.
2. API submits a Jungle Grid job with document and organization context.
3. Jungle Grid returns a job ID stored as `workerJobId`.
4. Job logs and status are polled or pushed back to the API.
5. Worker artifacts are written to durable storage.
6. API marks the run as `completed` or `failed` and persists outputs.

## Integration Requirements

- stable worker image
- deterministic job input payload
- artifact contract
- retry policy
- timeout handling
- log capture
- version capture for reproducibility

## Job Contract

The future job payload should include:

- document ID
- organization ID
- storage path
- run ID
- worker version
- rules version

The worker should emit:

- structured result JSON
- memo artifact
- extraction artifact
- logs or diagnostics

## Why the MVP Prepares for This

The API already uses a worker client abstraction rather than embedding extraction logic. This allows a later adapter that targets Jungle Grid with minimal upstream API change.
