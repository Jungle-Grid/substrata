# Substrata Test Results

Audit date: 2026-07-11

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
