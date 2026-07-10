# Security

## Sensitive Documents

Customer datasheets and technical documents may contain confidential product information. The platform must treat uploaded documents and generated artifacts as sensitive by default.

## Access Control

The current application enforces:

- session-backed authentication with opaque cookies
- safe redirect handling for auth return paths
- organization scoping on documents, runs, extracted facts, citations, memos, reviews, and audit events
- membership-based role checks at the API layer
- explicit reviewer-role checks for human review decisions
- owner/admin restrictions for workspace settings and invites

## Audit Logging

Meaningful actions must create audit events, including:

- sign-up, sign-in, sign-out
- email verification and password reset completion
- organization creation and updates
- invite creation and acceptance
- document creation
- classification run creation
- worker status changes
- memo generation
- human review updates

## Encryption Assumptions

Production design assumptions:

- TLS in transit
- encrypted object storage at rest
- encrypted database storage at rest
- hashed session tokens in the database
- hashed password credentials
- one-time, expiring verification and password-reset tokens

The local MVP does not claim production-grade encryption, but the documentation and schema assume that requirement.

## Frontend Handling Rules

- The browser must not persist session tokens, raw auth tokens, or secrets in `localStorage`.
- State-changing requests must flow through the credentialed frontend API layer with CSRF headers.
- Auth failure states should use non-revealing user-facing messages.
- Unexpected backend failures should not surface raw database or stack details in the UI.
- Protected workspace content should not render for unauthenticated users before auth resolution completes.

## Least Privilege

Services should use the minimum required permissions:

- API may read and write application records and session state
- worker may access only run inputs and output locations
- frontend never directly handles privileged database access

## External Setup

- Google OAuth redirect URI must point to `http(s)://<api-origin>/v1/auth/google/callback`.
- ZeptoMail must use a verified sender domain and sender address.
- Production cookie configuration must use HTTPS and a domain strategy that keeps API and web origins consistent for credentialed requests.

## Artifact Retention

The system should eventually support configurable retention and deletion policies for:

- uploaded documents
- raw text artifacts
- generated memos
- logs

Until then, the MVP should keep artifact paths explicit so retention can be enforced later.

## Company History Security Posture

Company History files are private, organization-scoped internal reference material. Phase 1 supports PDF, TXT, MD, CSV, and JSON only; DOCX, XLSX, OCR, external document systems, embeddings, and cross-company retrieval are intentionally out of scope.

- History upload and reprocessing require Owner or Admin membership.
- Files are hashed with SHA-256 and deduplicated within an organization only.
- Local storage keys are organization-prefixed and storage resolution rejects absolute paths and traversal outside `LOCAL_STORAGE_ROOT`.
- The server validates approved MIME/extension combinations and PDF signatures, with file and batch limits.
- Retrieval filters by organization ID in the database query and persists exact chunks shown to a classification reviewer.
- Historical excerpts are never represented as regulation citations or automatic classification approval.

Production hardening still required before broad customer rollout: malware scanning/quarantine, encrypted managed object storage, signed-download URLs, configurable retention/deletion, and database-level audit immutability/RLS.

## Local Validation Caveat

During frontend browser validation, a local Postgres credential failure prevented successful sign-in. The API error handler was tightened so the browser now receives a generic failure message instead of raw Prisma/database details, but local authenticated validation still depends on correct database credentials.
