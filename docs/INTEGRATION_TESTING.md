# API integration testing

The API integration smoke suite uses the real Express application, authentication
and CSRF middleware, Prisma, PostgreSQL, audit events, and HTTP cookies. It does
not use handler-level request context injection.

## Run

Set `TEST_DATABASE_URL` to the local PostgreSQL administrative URL, then run:

```bash
TEST_DATABASE_URL="$DATABASE_URL" corepack pnpm --filter @substrata/api test:integration
```

The command requires a local PostgreSQL role that can create databases. It
generates a name of the form `substrata_test_<timestamp>_<random>`, validates
that name before using SQL, runs the committed Prisma migrations against that
database, starts `createApp()` on an ephemeral port, and drops only that
temporary database during teardown. It never resets, truncates, or migrates the
configured development database.

## Reusable harness

The focused helpers under `apps/api/src/integration-tests/helpers/` own environment
activation, temporary database creation/migration/teardown, the ephemeral server,
cookie-aware HTTP, real authentication, fixtures, audit assertions, controlled
storage, and controlled unresolved remote-cancellation outcomes. `DATABASE_URL` is
set before importing Prisma-dependent application modules. `createApp()` accepts
optional storage and remote-cancellation boundary dependencies; omitted dependencies
retain production local-storage and safely-unresolved remote-cancellation behavior.

Dedicated executable files currently present:

- `integration-smoke.test.ts`
- `document-lifecycle.integration.test.ts`
- `run-lifecycle.integration.test.ts`
- `cancellation.integration.test.ts`
- `artifact-lifecycle.integration.test.ts`

## What the current suite proves

- health and Prisma access through the real app;
- password sign-up/sign-in and cookie persistence;
- CSRF rejection for missing and invalid tokens plus valid-token mutation;
- document archive persistence and audit event persistence;
- cross-organization non-disclosing denial with unchanged target records.

The final complete run passes **72/72**. Named-test counts are smoke 4, document
lifecycle 20, run lifecycle 19, cancellation 13, and artifact lifecycle 16. Artifact
action counts overlap in one combined isolation test: deletion 11 and retry 6.

The matrix has 27 explicit CSRF request cases (nine mutations × missing, invalid, and
valid) and 11 organization-isolation assertion cases: archived document list/archive/
restore/permanent delete; archived run list/archive/restore/permanent delete;
cancellation; artifact delete; artifact retry. Each denied mutation verifies the
target's persisted lifecycle/data/audit state remains unchanged. The source test names
state the grouped case; this section is the exact assertion-case map, not an estimate.

Storage-failure coverage has 13 primary cases: document (confirmed missing plus four
failure outcomes), run artifact cleanup (three failure outcomes), and artifact
cleanup (confirmed missing plus four failure outcomes). There are 11 lifecycle
concurrency/idempotency cases: repeated document archive/restore, repeated terminal
run archive/restore, repeated cancellation, repeated unresolved remote cancellation,
terminal completed/failed protection, archived-active cancellation rejection, and
repeated completed artifact-retry protection.

## Callback architecture: not applicable

Repository-wide route/service/worker inspection found no worker callback, provider
webhook, status-completion endpoint, callback secret/signature, or callback retry
handler. Google OAuth is the only callback route. Classification is queued with
`queueMicrotask`, then the in-process `executeClassificationRun()` invokes the worker;
the Jungle Grid worker backend polls the provider and this service persists the final
run/execution-job state. Therefore callback-delivery race testing is **NOT
APPLICABLE**, not an omitted failing category. No callback route or test-only callback
adapter was added.

The final integration run creates a validated `substrata_test_*` database, applies all
15 migrations, starts the real app, disconnects Prisma, and removes the exact
database. The helper rejects empty, `undefined`, `null`, malformed, and URL-mismatched
temporary names before database work starts; final verification confirmed zero
temporary test databases remain.
