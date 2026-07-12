# Substrata Test Results

Audit date: 2026-07-11

## Lifecycle integration expansion

### Final readiness verification

| Command | Working directory | Exit | Duration | Status | Sanitized result |
|---|---|---:|---:|---|---|
| `corepack pnpm lint` | repository root | 0 | 7.72s | PASS | All workspace lint tasks passed. |
| `corepack pnpm --filter @substrata/api typecheck` | repository root | 0 | 10.05s | PASS | API typecheck passed. |
| `corepack pnpm --filter @substrata/web typecheck` | repository root | 0 | 3.63s | PASS | Web typecheck passed after the production build completed. |
| `corepack pnpm --filter @substrata/api build` | repository root | 0 | 15.99s | PASS | API build passed. |
| `corepack pnpm --filter @substrata/web build` | repository root | 0 | <60s | PASS | Next production build and build verifier passed. |
| `TEST_DATABASE_URL="$DATABASE_URL" corepack pnpm --filter @substrata/api test:integration` | repository root | 0 | 19.03s | PASS | 72/72 passed; harness applied 15 migrations and removed its temporary database. |
| `WEB_APP_URL=http://localhost:3000 corepack pnpm --filter @substrata/api test` | repository root | 0 | 4.39s | PASS | API regression 18/18 passed. |
| `python3 -m py_compile $(rg --files workers/classifier/src -g '*.py')` | repository root | 0 | 0.11s | PASS | Python syntax passed. |
| `python3 -m unittest discover -s workers/classifier/tests -v` | repository root | 0 | 0.23s | PASS | Worker tests 32/32 passed. |
| `corepack pnpm --filter @substrata/db prisma:generate` | repository root | 0 | 6.41s | PASS | Prisma client generated. |
| `prisma validate --schema prisma/schema.prisma` | repository root | 0 | 5.69s | PASS | Prisma schema valid. |
| Validated `substrata_test_verify_*` `prisma migrate deploy` + `migrate status` | repository root | 0 | 4.55s | PASS | All 15 migrations applied; temporary database dropped; zero disposable databases remained. |
| `prisma migrate status --schema prisma/schema.prisma` | repository root | 0 | 5.69s | PASS | Configured non-test schema up to date with 15 migrations. |
| `psql ... SELECT 1` | repository root | 0 | 5.69s | PASS | Read-only configured database connectivity passed. |
| dotenv parse of `infra/.env.production` | `apps/api` | 0 | 0.96s | PASS | Production dotenv parsed without rendering values. |
| `docker-compose -f infra/docker-compose.prod.yml --env-file infra/.env.production config --quiet` | repository root | 0 | 0.81s | PASS | Production Compose parse passed outside the sandbox Snap confinement limitation. |
| `git diff --check` | repository root | 0 | <1s | PASS | No whitespace errors. |

Callback architecture: **NOT APPLICABLE**. There is no production worker/provider
callback or webhook boundary. Status changes happen through the in-process execution
service after enqueue, with Jungle Grid provider polling; no artificial callback
architecture was introduced.

Exact coverage method: the test runner reports 72 named integration tests: smoke 4,
document 20, run 19, cancellation 13, artifact lifecycle 16. Action counts overlap
where one named isolation test exercises both artifact deletion and retry: artifact
deletion 11, artifact retry 6. There are 27 CSRF assertion cases, 11 organization-
isolation assertion cases, 13 storage-failure cases, and 11 concurrency/idempotency
cases. The detailed mapping is in `docs/INTEGRATION_TESTING.md`.

Regression assertions cover archived-active cancellation 409; document/run cleanup
failure 502; unauthorized run lifecycle 403; retry-without-failure 409; unresolved
remote cancellation 409 with unchanged status; and storage uncertainty without false
deletion success. Final security review found no auth/CSRF bypass, request-supplied
ownership/storage-key trust, test-only production route, destructive migration, or
remaining presenter storage-path exposure in the lifecycle responses.

| Command | Working directory | Exit | Duration | Tests | Status | Sanitized result |
|---|---|---:|---:|---:|---|---|
| `TEST_DATABASE_URL="$DATABASE_URL" corepack pnpm --filter @substrata/api test:integration` | repository root | 1 | 110.65s | 72 | FAIL | 67 passed, 5 failed; every temporary database was removed. Failures were test code (one reference-equality assertion and four invalid email fixture labels). |
| `TEST_DATABASE_URL="$DATABASE_URL" node --import tsx --test --test-concurrency=1 --test-reporter=spec src/integration-tests/document-lifecycle.integration.test.ts src/integration-tests/run-lifecycle.integration.test.ts` | `apps/api` | 0 | 26.39s | 39 | PASS | Corrected document/run suites passed 39/39; teardown completed. |
| `corepack pnpm --filter @substrata/api typecheck` | repository root | 0 | 6.9s | — | PASS | API and integration TypeScript compiled before the final 502 error-mapping edit; rerun still required. |
| `TEST_DATABASE_URL="$DATABASE_URL" corepack pnpm --filter @substrata/api test:integration` (final) | repository root | 0 | 18.64s | 72 | PASS | 72/72 passed; zero skips and zero failures. |
| `WEB_APP_URL=http://localhost:3000 corepack pnpm --filter @substrata/api test` | repository root | 0 | 4.05s | 18 files | PASS | Existing API regression suite passed. |
| `corepack pnpm --filter @substrata/api typecheck` / `corepack pnpm --filter @substrata/web typecheck` | repository root | 0 / 0 | <10s | — | PASS | API and web typechecks passed after production fixes. |
| `python3 -m unittest discover -s workers/classifier/tests -v` | repository root | 0 | 0.12s | 32 | PASS | Worker suite passed 32/32. |
| `git diff --check` | repository root | 0 | <1s | — | PASS | No whitespace errors. |

Current executable counts: smoke 4, document 21, run 18, cancellation 13,
artifact deletion/retry 16; total 72. Storage-failure cases are nonzero and controlled
at the real storage interface. All nine lifecycle mutations have missing, invalid,
and valid CSRF requests distributed through the dedicated suites. Representative
organization isolation exists for document, run, cancellation, artifact deletion,
and retry, but the requested independently named 10+ security matrix is incomplete.
The final complete suite passes 72/72. Cancellation/callback race count is zero because the application has no worker
callback route or adapter and direct Prisma mutation was not misrepresented as an
integration callback.

Defects discovered/fixed: (1) archived active runs accepted cancellation; now 409.
(2) document/run storage cleanup failures returned generic 500 responses; now sanitized
502 responses without deletion success. Manual frontend validation remains pending at
`docs/AUTHENTICATED_LIFECYCLE_VALIDATION.md`.

All commands used existing dependencies, services, credentials, and fixtures. No install, package download, model pull, container pull, migration application, reseed, destructive database action, or application-code modification was performed.

## Command Results

| Command | Exit | Duration | Status | Result |
|---|---:|---:|---|---|
| `git status --short` | 0 | <1s | WARN | Existing user-authored submission deck changes were present before audit. |
| `corepack pnpm lint` | 0 | 19.26s | PASS | All workspace lint tasks passed. |
| `corepack pnpm typecheck` | 0 | 29.63s | PASS | All workspace TypeScript checks passed. |
| `corepack pnpm build` | 0 | 94.56s | PASS | DB/shared/API build and Next production build passed. |
| `python3 -m unittest discover -s workers/classifier/tests -v` | 0 | 0.45s | PASS | 31/31 Python tests passed. |
| `python3 -m py_compile $(rg --files workers/classifier/src -g '*.py')` | 0 | 0.24s | PASS | Worker Python syntax compiled. |
| `env WEB_APP_URL=http://localhost:3000 corepack pnpm test` | 1 | 5.14s | FAIL | 59/60 API tests passed; presenter expectation mismatch. |
| `set -a; . ./.env; set +a; corepack pnpm --filter @substrata/db exec prisma validate --schema prisma/schema.prisma` | 0 | 7.54s | PASS | Prisma schema valid. |
| `set -a; . ./.env; set +a; corepack pnpm --filter @substrata/db exec prisma migrate status --schema prisma/schema.prisma` | 1 | 7.34s | FAIL | P3015: empty migration directory missing `migration.sql`. |
| `docker-compose -f infra/docker-compose.yml config` | 0 | <1s | PASS | Local Compose configuration rendered. |
| `docker-compose -f infra/docker-compose.prod.yml config` | 1 | <1s | FAIL | `infra/.env.production` is invalid dotenv syntax. |
| Read-only `psql ... 'SELECT 1'` | 0 | 8.3s | PASS | Configured PostgreSQL returned 1. |
| Authenticated `GET /v1/jobs?limit=1` to Jungle Grid | 0 | 4.7s | PASS | Jungle Grid API returned HTTP 200. |
| `JUNGLE_GRID_LIVE_TEST_ENABLED=true python3 workers/classifier/scripts/live_jungle_grid_smoke.py` | 1 | 13.64s | FAIL | Real remote request accepted but ROCm capacity unavailable; no worker/model start. |
| API audit flow (two audit users + public sample) | 0 | 22.37s | PASS/WARN | Auth, isolation, run failure state, memo, artifacts route, and review all exercised; see endpoint matrix. |
| Worker fixtures in forced deterministic fallback mode | 1 | <1s | FAIL | ADC and AX920 passed; Zynq current fixture failed validation. |
| Current sample fixture run | 0 | <1s | PASS | 26 specs, 3 candidates, memo, uncertainty, human review. |
| Node validation of three checked-in expected outputs | 0 | <1s | PASS | Sample, ADC32RF45, and Zynq expected output files passed. |
| Frontend dev-server startup | blocked | — | BLOCKED | Environment denied additional server startup; no workaround used. |

## API Endpoint Matrix

| Method / path | Expected | Actual | Status |
|---|---|---:|---|
| `GET /health` | service + DB healthy | 200 | PASS |
| `GET /v1/documents` without session | reject | 401 | PASS |
| `GET /v1/auth/csrf` | issue CSRF token/cookie | 200 | PASS |
| `POST /v1/auth/sign-up` malformed body | validation error | 400 | PASS |
| `POST /v1/auth/sign-up` valid audit user | account creation | 201 | PASS |
| `POST /v1/auth/sign-in` before verification | reject | 403 | PASS |
| `POST /v1/auth/sign-in` verified audit user | session | 200 | PASS |
| `POST /v1/organizations/current/onboarding` | complete onboarding | 200 | PASS |
| `POST /v1/documents/sample` | sample document | 201 | PASS |
| `POST /v1/documents/:id/classification-runs` | accepted async run | 202 | PASS |
| `GET /v1/classification-runs/:id` | current run | 200 / `needs_attention` | PASS |
| `GET /v1/classification-runs/:id/memo` | draft memo | 200 | PASS |
| `GET /v1/classification-runs/:id/artifacts` | artifact metadata | 200 | WARN: previews null |
| `GET /v1/audit-log` | scoped events | 200 | PASS |
| `POST /v1/classification-runs/:id/review` | human review record | 201 | PASS |
| `GET` first-org run as second-org user | deny/hide | 404 | PASS |
| `GET /v1/classification-runs/not-a-real-id` | not found | 404 | PASS |
| `POST /v1/documents/upload` with PNG | reject unsupported type | 415 | PASS |

## API End-to-End Audit Run

The API was launched only for the audit, with `JUNGLEGRID_ENABLED=true` in that process. A public bundled datasheet was submitted through the authenticated API.

| Field | Sanitized result |
|---|---|
| API request status | 202 accepted |
| Selected backend | `jungle_grid` |
| Final run status | `needs_attention` |
| Human review required | true |
| Extracted specs | 19 |
| ECCN candidates | 3 |
| Review paths | 5 |
| Uncertainty flags | 4 |
| Validation issues | 2 |
| Memo persisted | yes |
| Artifact rows persisted | 5 |
| Run audit events | 5 |
| Execution job | blocked; external job ID persisted; terminal error persisted |
| Fallback | deterministic heuristic fallback; not a Gemma result |

The audit run correctly did not become `completed` after remote failure. It recorded a human-review-required workup but cannot be used as evidence of real Gemma or AMD execution.

## Live Jungle Grid / Gemma Result

| Field | Result |
|---|---|
| Test path | Repository-provided `live_jungle_grid_smoke.py` |
| Job ID | `job-1783785317868949954` |
| Requested model | `gemma4:12b` |
| Image | `ghcr.io/jungle-grid/substrata-jungle-grid-inference:rocm` |
| Requested vendor/runtime | AMD / ROCm |
| Created | 2026-07-11T15:55:19Z |
| Terminal state | failed / cleanup |
| Worker assigned | false |
| Artifact ready | false |
| Provider/GPU name | none assigned |
| Model response | none |
| Schema validation | not reached |
| Sanitized failure | `CAPACITY_UNAVAILABLE`: ROCm workloads unsupported by currently configured capacity |

## Worker Fixture Results

| Fixture | Backend mode | Result |
|---|---|---|
| `adc32rf45-input.json` | deterministic fallback after disabled Fireworks key | PASS: 18 specs, 2 candidates, 3 review paths, memo, human review. |
| `ax920-input.json` | deterministic fallback after disabled Fireworks key | PASS: 18 specs, 4 candidates, 5 review paths, memo, human review. |
| `sample-input.json` | deterministic fallback after disabled Fireworks key | PASS: 26 specs, 3 candidates, 4 review paths, memo, human review. |
| `zynq-ultrascale-plus-input.json` | deterministic fallback after disabled Fireworks key | FAIL: validation rejects non-SoC-specific candidates/reviewer questions. |

These fixture runs did not mock Gemma. They intentionally exercised the existing deterministic fallback path without spending remote tokens. The separate live Jungle Grid test was the real Gemma/AMD attempt.

## Sanitized Failures and Warnings

1. **Jungle Grid AMD/ROCm capacity** — managed job failed before worker readiness; no real Gemma/AMD verification.
2. **Prisma migration chain** — empty `20260710202549_init` directory causes P3015.
3. **Production Compose env** — `infra/.env.production` contains non-dotenv text.
4. **API test regression** — presenter now emits `executionMode` and `selectedProvider`, test expected older shape.
5. **Zynq dynamic fixture regression** — profile-specific review paths/questions fail worker validation.
6. **Artifact previews** — route returns path metadata but null previews for audit run.
7. **Data logging** — source-derived retrieval query is logged by API diagnostics.
8. **Seed risk** — fixed demo password and destructive replacement of fixed seed-run children.

## Test Count Summary

- Pass: 12
- Fail: 6
- Warn: 5
- Blocked: 5
- Real Gemma verified: no
- AMD execution verified: no

Detailed conclusion and remediation order: [`SUBSTRATA_AUDIT_REPORT.md`](SUBSTRATA_AUDIT_REPORT.md).

# Remediation Pass

## Command Results

| Command | Exit | Status | Result |
|---|---:|---|---|
| `WEB_APP_URL=http://localhost:3000 corepack pnpm test` | 0 | PASS | API suite: 60/60 passing, zero skips. |
| `python3 -m unittest discover -s workers/classifier/tests -v` | 0 | PASS | Worker suite: 32/32 passing, including Zynq regression. |
| `python3 -m py_compile $(rg --files workers/classifier/src -g '*.py')` | 0 | PASS | Worker Python syntax check passed. |
| Deterministic ADC32RF45 fixture run + `validate-worker-output.mjs` | 0 | PASS | 18 specs, 2 candidates, memo, cited review paths, uncertainty, human review. |
| Deterministic sample fixture run + `validate-worker-output.mjs` | 0 | PASS | 26 specs, 3 candidates, memo, cited review paths, uncertainty, human review. |
| Deterministic Zynq fixture run + `validate-worker-output.mjs` | 0 | PASS | 48 specs, 3 candidates, memo, citations, uncertainty, human review. |
| AX920 fixture in its configured local-Gemma mode | 1 | BLOCKED | Local Gemma endpoint/model unavailable; no model download, mock, or fixture reclassification was used. |
| `corepack pnpm lint` | 0 | PASS | All workspace lint tasks passed. |
| `corepack pnpm typecheck` | 0 | PASS | All workspace TypeScript checks passed. |
| `corepack pnpm build` | 0 | PASS | DB/shared/API build and Next production build passed. |
| `psql ... 'SELECT 1'` | 0 | PASS | Existing configured PostgreSQL returned 1; no data was changed by connectivity check. |
| `prisma validate --schema prisma/schema.prisma` | 0 | PASS | Prisma schema valid. |
| `prisma migrate deploy --schema prisma/schema.prisma` | 0 | PASS | Applied reviewed non-destructive preference migrations after restored history reconciliation. |
| `prisma migrate status --schema prisma/schema.prisma` | 0 | PASS | 13 migrations found; database schema up to date. |
| `docker-compose -f infra/docker-compose.prod.yml --env-file infra/.env.production config --quiet` | 0 | PASS | Production dotenv and Compose configuration parse successfully without rendering secrets. |
| `git diff --check` | 0 | PASS | No whitespace errors; focused secret-exposure scan found no frontend backend-secret identifiers. |

## Migration Repair Record

`20260710202549_init` was present in `_prisma_migrations` with a completed
timestamp but absent from Git. A read-only Prisma schema diff from the preceding
repository schema to the configured database showed the historical change:
adding `Organization.defaultExecutionPreference` with default `auto`. The
restored migration contains that additive change. Its migration-record checksum
was reconciled only after confirming the completed database record and schema
state; no migration was falsely marked as applied. `migrate deploy` then
applied the two later reviewed migrations that retain the column and normalize
the default/data to `remote`. No reset, drop, truncate, reseed, or dump was
performed.

## Deferred / Unverified Infrastructure

- **DEFERRED — UNVERIFIED — OUTSIDE CURRENT REMEDIATION SCOPE:** live AMD GPU
  execution, ROCm runtime execution, live Gemma-on-AMD proof, AMD provider
  availability, Jungle Grid capacity configuration, and Jungle Grid scheduler
  or fallback changes.
- **Gemma status:** TESTED THROUGH EXISTING NON-LIVE TESTS; LIVE EXECUTION
  UNVERIFIED. No new remote worker, model download, or AMD provision was run.

## Remediation Totals

- Pass: 15
- Fail: 0
- Warn: 1
- Blocked: 1
- Deferred: 6
- API: 60/60 passing
- Python worker: 32/32 passing

# Deletion and Retention Readiness

| Command | Exit | Status | Result |
|---|---:|---|---|
| `corepack pnpm db:generate` | 0 | PASS | Prisma client regenerated for nullable archive lifecycle fields. |
| `prisma migrate deploy --schema prisma/schema.prisma` | 0 | PASS | Applied `20260711100000_archive_lifecycle`; additive fields and indexes only. |
| `prisma migrate status --schema prisma/schema.prisma` | 0 | PASS | 14 migrations; database schema up to date. |
| `corepack pnpm --filter @substrata/api typecheck` | 0 | PASS | API lifecycle routes/services typecheck. |
| Focused auth test | 0 | PASS | Existing auth/CSRF service contract remains green. |

Deletion implementation status: archive/restore and scoped permanent document/run
deletion are implemented. Active-run cancellation, remote cancellation, individual
artifact deletion, frontend lifecycle controls, and dedicated lifecycle test coverage
are **NOT TESTED / incomplete** and remain follow-up work.

## Cancellation and artifact-cleanup increment

| Command | Exit | Status | Result |
|---|---:|---|---|
| `corepack pnpm --filter @substrata/api typecheck` | 0 | PASS | Cancellation and artifact-cleanup routes/services typecheck. |
| `WEB_APP_URL=http://localhost:3000 corepack pnpm test` | 0 | PASS | Existing API suite remains 60/60. |
| `prisma migrate deploy` / `prisma migrate status` | 0 | PASS | `20260711110000_cancellation_and_artifact_cleanup` applied; 15 migrations up to date. |

Remote cancellation is deliberately represented as unresolved unless provider
confirmation exists. Frontend lifecycle UX and dedicated cancellation/artifact
failure-path tests are still NOT TESTED / incomplete.

## Deletion and Retention Readiness Follow-up

| Command | Working directory | Exit | Status | Result |
|---|---|---:|---|---|
| `corepack pnpm --filter @substrata/api typecheck` | repository root | 0 | PASS | Lifecycle query and parent-run artifact ownership changes typecheck. |
| `corepack pnpm --filter @substrata/web typecheck` | repository root | 0 | PASS | Archived views and confirmation controls typecheck. |
| `WEB_APP_URL=http://localhost:3000 corepack pnpm test` | repository root | 0 | PASS | Existing API suite remains 60/60. |
| `python3 -m unittest discover -s workers/classifier/tests -v` | repository root | 0 | PASS | Worker baseline remains 32/32. |
| `corepack pnpm --filter @substrata/web build` | repository root | 1 | FAIL | Initial build caught unused review-list imports after the lifecycle-view edit; fixed, rerun is required. |

### Current lifecycle contract

- Document and run lists now accept `?lifecycle=active|archived|all`; the default is `active` and invalid values return the existing Zod validation response.
- Lifecycle mutations require an authenticated session and CSRF header/cookie. Document archive/restore require a classification-capable role; permanent document deletion requires workspace management. Run archive/restore/cancel require review permission; run/artifact permanent deletion requires workspace management.
- Ownership is derived from the authenticated organization. Artifact deletion additionally verifies the route run ID against the stored artifact `classificationRunId`.
- Permanent deletion requires the exact resource ID in `{ "confirmation": "<id>" }`, requires prior archive, and rejects active runs. Storage failures do not return success; artifact cleanup remains retryable.
- Remote cancellation remains a truthful `409` unresolved state unless a provider confirms cancellation. It records an audit failure event and does not set `cancelled`.

### Follow-up verdict

**NOT READY.** Archived document/run views and detail lifecycle controls are implemented, but dedicated lifecycle, CSRF, organization-isolation, storage-failure, cancellation-race, artifact UI, and frontend destructive-workflow tests have not been added or executed. The failed initial web build must also be rerun after the import cleanup.

## Final deletion and retention verification pass

| Command | Working directory | Exit | Status | Result |
|---|---|---:|---|---|
| `corepack pnpm --filter @substrata/api typecheck` | repository root | 0 | PASS | Lifecycle routes and safe artifact manifest response typecheck. |
| `corepack pnpm --filter @substrata/web typecheck` | repository root | 0 | PASS | Artifact confirmation/retry controls and run-detail integration typecheck. |
| `WEB_APP_URL=http://localhost:3000 corepack pnpm test` | repository root | 0 | PASS | Existing API suite: 60/60 passing. |
| `corepack pnpm lint` | repository root | 0 | PASS | Workspace lint passed. |
| `corepack pnpm --filter @substrata/web build` | repository root | 0 | PASS | Next production build passed. |
| `python3 -m py_compile $(rg --files workers/classifier/src -g '*.py')` | repository root | 0 | PASS | Worker Python syntax passed. |
| `python3 -m unittest discover -s workers/classifier/tests -v` | repository root | 0 | PASS | Worker suite: 32/32 passing. |
| `corepack pnpm db:generate` | repository root | 0 | PASS | Prisma client generated. |
| `prisma validate --schema prisma/schema.prisma` | repository root | 0 | PASS | Prisma schema valid. |
| `prisma migrate deploy --schema prisma/schema.prisma` | repository root | 0 | PASS | No pending migrations. |
| `prisma migrate status --schema prisma/schema.prisma` | repository root | 0 | PASS | 15 migrations found; database schema up to date. |
| `psql "$DATABASE_URL" -c 'SELECT 1 AS database_connectivity;'` | repository root | 0 | PASS | Read-only database connectivity check passed. |
| `docker-compose -f infra/docker-compose.prod.yml --env-file infra/.env.production config --quiet` | repository root | 0 | PASS | Production dotenv and Compose configuration parse. |
| `git diff --check` | repository root | 0 | PASS | No whitespace errors. |

Artifact lifecycle UX is now mounted on the run-detail audit panel. It uses a
destructive confirmation dialog, shows pending/failed/retry state from the API,
and refreshes only after a confirmed successful response. The artifact manifest
endpoint no longer returns storage paths or file previews; it returns safe
artifact metadata and deletion eligibility only.

**Verdict remains NOT READY.** The repository has no usable frontend interaction
test runner beyond static server-render tests, and dedicated API lifecycle CSRF,
organization-isolation, storage-failure/retry, and cancellation-race tests have
not been added in this pass. No manual authenticated browser walkthrough was
performed in this environment.

## Lifecycle test-hardening follow-up

| Command | Working directory | Exit | Status | Result |
|---|---|---:|---|---|
| `corepack pnpm --filter @substrata/api typecheck` | repository root | 0 | PASS | Lifecycle authorization and retry-eligibility hardening typechecks. |
| `WEB_APP_URL=http://localhost:3000 corepack pnpm test` | repository root | 0 | PASS | Existing API suite remains 60/60. |

### Defects found and fixed

- Run lifecycle routes previously threw a generic `Error` for unauthorized
  archive, restore, cancel, artifact, and permanent-delete requests. They now
  return the established sanitized `HttpError(403, ...)` contract.
- Artifact retry previously accepted any terminal artifact. Retry now requires
  the persisted failed-cleanup state, returning `409` otherwise. This preserves
  the API’s server-side lifecycle truth and prevents retry abuse.

### Dedicated coverage and authenticated frontend validation

No dedicated document, run, cancellation, artifact, lifecycle-CSRF,
organization-isolation, storage-failure, or cancellation-race test file has
been added. The present API test helper invokes individual route handlers and
does not provision authenticated sessions, CSRF middleware, isolated database
records, or injectable lifecycle/storage dependencies. Adding assertions around
that helper would not verify the required persisted effects and would violate
the test-quality requirement.

Authenticated frontend lifecycle validation was **BLOCKED**: this environment
does not provide a browser interaction runner or screenshot facility, and no
safe authenticated audit-only session was available to exercise destructive UI
flows. No manual action was represented as passed.

**Verdict: NOT READY.** The explicit dedicated lifecycle test categories and
authenticated manual validation remain blockers.

## Integration-test bootstrap assessment

Testability map: test process → `DATABASE_URL` selected before module import →
`createApp()` (no listener) → real session/auth and CSRF middleware → route
authorization → lifecycle services → Prisma → storage driver → audit events.
`apps/api/src/server.ts` is the listener-only entry point. The local PostgreSQL
role has permission to create a uniquely named temporary database, so an
integration harness can safely use `TEST_DATABASE_URL` and run the existing
migration chain without touching the configured development database.

The harness has not yet been implemented. No integration test was executed
against a temporary database in this pass. The user-executable authenticated
frontend validation package is available at
[`docs/AUTHENTICATED_LIFECYCLE_VALIDATION.md`](docs/AUTHENTICATED_LIFECYCLE_VALIDATION.md);
it intentionally does not mark manual validation complete.

## API integration harness

`apps/api/src/integration-tests/integration-smoke.test.ts` creates a unique
temporary PostgreSQL database from `TEST_DATABASE_URL`, applies all 15 Prisma
migrations, sets `DATABASE_URL` before dynamically importing Prisma-dependent
modules, starts `createApp()` on port 0, and drops only that temporary database
at teardown. The command is:

`TEST_DATABASE_URL="$DATABASE_URL" corepack pnpm --filter @substrata/api test:integration`

The executed smoke suite passed **4/4**: real health/Prisma startup; real
password session cookies; missing/invalid/valid CSRF archive behavior with
persisted `archivedAt`, `archivedByUserId`, and audit event; and real
cross-organization archive denial with unchanged target data. See
`docs/INTEGRATION_TESTING.md` for safety guards and extension guidance.
