# Technical architecture

## Summary

Substrata is a monorepo with a Next.js workspace frontend, Express API, Python classifier worker, Prisma/Postgres data layer, and local-compatible artifact storage.

## System overview

The web app manages authenticated workspace workflows. The API owns authorization, persistence, uploads, orchestration, and audit records. The worker emits structured extraction, review-path, memo, and artifact outputs.

## Frontend

`apps/web` provides the landing page and protected workspace pages for documents, classification reviews, company history, memo drafts, and audit trail. It uses loading states while a run is pending so incomplete output is not presented as a conclusion.

## Backend/API

`apps/api` validates requests, resolves organization membership, applies CSRF and role controls, stores data, starts runs, retrieves company history, and persists review outputs.

## Worker and execution layer

`workers/classifier` extracts and normalizes technical facts, applies deterministic heuristic routing, creates candidate review paths, checks contradictions and missing evidence, and drafts memo Markdown. Local mode routes to the configured Gemma model; Remote mode uses an internal provider router.

## Data model

Organization-scoped records include documents, classification runs, extracted specs, citations, review paths, ECCN candidates, memo versions, human reviews, audit events, company-history documents, chunks, and matches.

## Document processing

The API stores a source reference and the worker processes extracted text. Worker artifacts include source text, structured output, review paths, memo Markdown, and logs.

## Classification review generation

The deterministic engine controls profile detection, candidate review-path routing, blocked/fallback gating, contradiction checks, and missing-evidence checks. LLM extraction supports fact capture; it does not become the routing authority.

## Memo generation

The memo links extracted facts, cited review paths, questions, uncertainty flags, and candidate reasoning. It is a review-ready memo draft, never a final classification.

## Audit logging

Run creation, processing state, reviewer actions, organization changes, and material review events are organization-scoped audit records.

## Loading and stale-data safeguards

Pending runs render an analysis-in-progress state rather than zero-result panels or verification failures. Completed run surfaces separate generated review paths from recorded human conclusions.

## Future architecture

Planned work includes managed artifact storage, stronger document parsing, provider health checks, collaboration controls, and enterprise retention/integration features.
