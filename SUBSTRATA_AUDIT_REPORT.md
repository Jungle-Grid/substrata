# Substrata Final Readiness Verdict

Overall verdict: **READY FOR MANUAL VALIDATION**

> Final readiness verification (2026-07-11): callback delivery is **NOT
> APPLICABLE**. Repository-wide inspection found no worker/provider callback route,
> webhook, completion endpoint, callback signature/secret, or reconciliation callback;
> execution is an in-process queued task and the managed backend polls the provider.
> The lifecycle integration suite passes 72/72, API regression 18/18, worker tests
> 32/32, lint/typechecks/builds/Prisma/configuration checks pass, all 15 migrations
> deploy to an isolated database, and zero disposable databases remain. Storage paths
> are no longer returned in document/run presenters. The only remaining requirement is
> the authenticated browser walkthrough in `docs/AUTHENTICATED_LIFECYCLE_VALIDATION.md`.

> Lifecycle integration expansion (2026-07-11): reusable isolated-database,
> ephemeral-server, cookie/auth, fixture, controlled-storage, and controlled remote
> cancellation helpers are implemented. Dedicated document, run, cancellation, and
> artifact deletion/retry suites now contain 68 lifecycle tests plus the preserved
> four smoke tests. The first complete run executed 72 tests (67 passed, 5 failed);
> all five failures were test-authoring defects, and the corrected document/run files
> reran 39/39. Two production defects were identified and fixed: archived active runs
> could be cancelled, and permanent-deletion storage failures surfaced as unsanitized
> 500 errors rather than honest 502 cleanup failures. **NOT READY remains required**:
> no worker callback endpoint/boundary exists, so the required callback/cancellation
> race integration category is still zero. The post-fix complete integration suite
> passes 72/72, API regression passes, and worker regression passes 32/32. Browser validation remains
> explicitly unperformed.

> Deletion and retention follow-up (2026-07-11): the API now supports a consistent, organization-scoped `lifecycle=active|archived|all` list filter, with active as the default. The web workspace has active/archived document and run views plus document/run confirmation controls. Artifact deletion/retry controls are integrated into the run-detail audit panel with explicit deletion confirmation and server-driven pending/failure/retry state. Lifecycle and artifact-manifest responses do not expose storage keys. Artifact route ownership verifies both authenticated organization and parent run. Migration deploy/status was rerun successfully: 15 migrations and schema up to date. This remains **NOT READY** because dedicated lifecycle/CSRF/IDOR/storage failure/cancellation-race tests and authenticated frontend manual validation are not complete; remote cancellation remains safely unresolved without provider confirmation.

> Test-hardening follow-up: unauthorized run lifecycle mutations now return
> explicit `403` HTTP errors rather than a generic server error, and artifact
> retry is restricted to persisted failed-cleanup state. API typecheck and the
> 60-test regression suite pass. Dedicated persisted lifecycle/CSRF/isolation/
> storage/race coverage and authenticated browser validation are still absent,
> therefore the deletion and retention verdict remains **NOT READY**.

> Integration-test assessment: `createApp()` is importable without binding a
> listener, while `server.ts` binds the production listener. Prisma selects its
> database at process start, enabling a separate test process to use an isolated
> `TEST_DATABASE_URL`. A dedicated harness and executable lifecycle integration
> suite are still pending. A manual authenticated validation handoff is provided
> in `docs/AUTHENTICATED_LIFECYCLE_VALIDATION.md`; it is not evidence of a
> completed browser walkthrough.

> Integration harness implemented: `apps/api/src/integration-tests/integration-smoke.test.ts`
> creates and drops an isolated temporary PostgreSQL database, applies the
> migration chain, starts the real Express app on an ephemeral port, and proves
> real session cookies, CSRF middleware, Prisma archive persistence, audit event
> persistence, and cross-organization denial (4/4 smoke tests passing). The
> full lifecycle matrix and storage-adapter injection remain follow-up work.

## Executive Summary

Substrata has a substantial, working local product core: the API starts, the database is reachable, authentication and organization isolation work, the sample document workflow persists extracted facts, review paths, candidates, a memo draft, artifacts, and audit events, and the frontend/API builds pass.

However, the required hackathon proof path is not ready. A real, non-mocked Jungle Grid submission using `ghcr.io/jungle-grid/substrata-jungle-grid-inference:rocm` and the effective model `gemma4:12b` was accepted but failed before worker assignment: Jungle Grid reported that ROCm workloads are unsupported by currently configured capacity. Therefore no Gemma inference, AMD GPU runtime, hardware metadata, or successful remote artifact path was proven. The normal remote selector also defaults to Fireworks because `JUNGLEGRID_ENABLED` is absent.

There are additional submission blockers: Prisma migration status fails because `20260710202549_init` has no `migration.sql`, and the checked local production env file is not valid dotenv syntax. One API test and the current Zynq fixture also fail.

## Critical User Journey

Required path:

`Upload datasheet → launch classification → Jungle Grid job → AMD GPU → Gemma inference → extracted specifications → ECCN candidates → citations → uncertainty flags → compliance memo → human review → artifacts → completed UI state`

Result: **PARTIAL / FAILED AT AMD PROVISIONING**

- Upload/sample creation, run queueing, local worker launch, deterministic fallback output persistence, memo generation, human review, and audit records: **PASS**.
- Jungle Grid accepted the direct live smoke request and the API-triggered audit request: **PASS**.
- AMD GPU allocation: **FAIL**. No AMD/ROCm capacity was available.
- Real Gemma response, schema validation of a real response, and remote worker artifacts: **BLOCKED** by the failed AMD allocation.
- API run state after remote failure: **PASS**. It became `needs_attention`, not `completed`.
- Browser UI exercise of the authenticated workflow: **BLOCKED** by the execution environment denying startup of an additional web server; the frontend production build did pass.

## Real Architecture Map

```text
Next.js web app (apps/web; App Router)
  → credentialed fetch using NEXT_PUBLIC_API_BASE_URL
  → Express API (apps/api/src/server.ts; createApp())
  → session + organization authorization + CSRF
  → Prisma/PostgreSQL + local private storage
  → classification.service.enqueueClassificationRun()
  → queueMicrotask(executeClassificationRun())
  → worker-runtime.runLocalWorker() invokes python3 workers/classifier/src/main.py
  → selected backend:
       local: LocalBackend (Ollama or Transformers/ROCm)
       remote Fireworks: Fireworks OpenAI-compatible chat completions
       remote Jungle Grid: POST /v1/jobs with ROCm image and AMD GPU constraint
  → deterministic heuristic engine controls review paths/candidates
  → source citations + uncertainty flags + Markdown memo
  → Prisma persistence: facts, review paths, candidates, citations, memo,
    human review, artifacts, execution job, and audit events
  → presentRun() API payload → server-rendered review UI
```

Jungle Grid and AMD enter only when `selectedProvider` is `junglegrid`. The Python worker itself remains locally launched by the API; it submits the remote managed job. The Jungle Grid payload requests one GPU with `gpu_vendor: AMD`, ROCm runtime, the configured/default ROCm image, and model `gemma4:12b`.

## Repository Inventory

| Component | Verified implementation |
|---|---|
| Frontend | Next.js 15 / React 19, entrypoint `apps/web/src/app/page.tsx`; protected workspace under `apps/web/src/app/app/`. |
| API | Express 5, entrypoint `apps/api/src/server.ts`; routes mounted beneath `/v1`, health at `/health`. |
| Database | PostgreSQL via Prisma 6, schema `packages/db/prisma/schema.prisma`. |
| Worker | Python 3 worker at `workers/classifier/src/main.py`; deterministic extract/heuristic/memo pipeline plus optional model backends. |
| Gemma | Local backend supports Ollama or Transformers/ROCm. Managed Jungle Grid backend defaults to `gemma4:12b`. |
| Jungle Grid | `workers/classifier/src/backends/jungle_grid_backend.py`; image default `ghcr.io/jungle-grid/substrata-jungle-grid-inference:rocm`. |
| AuthN/AuthZ | Password + Google OAuth, opaque hashed sessions, CSRF cookie/header, organization membership roles. |
| Artifacts/memo | Local private storage; extracted text, structured output, memo, worker log, and source artifact rows. |
| Containers | `infra/Dockerfile`, local/prod Compose files, ROCm worker image under `infra/jungle-grid-image/`. |
| CI | `.github/workflows/ci.yml` and `.github/workflows/jungle-grid-image.yml`. |
| Submission files | `docs/submission/`, including demo runbook, AMD notes, and pitch deck assets. |
| Tests/samples | Node API/web unit tests; Python unittest suite; semiconductor, ADC, AX920, Zynq, RF, FPGA, and sensor fixtures. |

## Results Table

| Area | Status | Evidence | Severity | Required action |
|---|---|---|---|---|
| Repository/build quality | PASS | lint, TypeScript typecheck, and full monorepo build exit 0. | — | Keep in CI. |
| Python worker test suite | PASS | 31/31 unittest cases passed. | — | Keep in CI. |
| API test suite | FAIL | 59/60 tests passed; one deep-equality expectation is stale. | medium | Update the expectation or presenter contract. |
| Prisma schema | PASS | `prisma validate` passed with configured DB URL. | — | Keep validation in CI. |
| Migration deployment path | FAIL | `prisma migrate status` P3015: migration directory `20260710202549_init` lacks `migration.sql`. | blocker | Restore/remove the invalid migration directory through a reviewed migration repair. |
| Current DB connectivity | PASS | Read-only `SELECT 1` returned 1. | — | None. |
| Local API health | PASS | `/health` returned 200 with database healthy. | — | Add readiness endpoint if desired. |
| Auth/CSRF/session flow | PASS | Anonymous protected access 401; malformed signup 400; signup 201; pre-verification signin 403; verified audit signin 200. | — | None. |
| Organization isolation | PASS | Second audit organization received 404 for first organization’s run. | — | Expand to integration CI. |
| Upload validation | PASS | Unsupported PNG upload returned 415. | — | Add oversized-file integration coverage. |
| API-run failure state | PASS | API-submitted Jungle Grid run ended `needs_attention`; not falsely `completed`. | — | Retain this behavior. |
| Persisted fallback workup | WARN | Failed remote job generated 19 facts, 3 candidates, 5 review paths, memo, 4 uncertainty flags, and 5 artifact rows through deterministic fallback. | high | Do not present this as Gemma/AMD output. |
| Artifact endpoint preview | WARN | Artifacts endpoint returned 200 and three paths, but both memo and extracted-text previews were null. | medium | Diagnose storage-path/preview mismatch before demo. |
| Real Gemma smoke | BLOCKED | No model response: managed job failed at scheduling before worker assignment. | blocker | Configure live AMD/ROCm capacity, then rerun. |
| Real AMD GPU proof | FAIL | Live job explicitly requested AMD/ROCm; Jungle Grid rejected it for unavailable ROCm capacity. | blocker | Configure an AMD/ROCm-capable provider and verify runtime metadata. |
| Default remote routing | FAIL | `JUNGLEGRID_ENABLED` is missing; selector chooses Fireworks when remote execution is requested. | blocker | Enable Jungle Grid and make AMD route explicit for the demonstration environment. |
| Jungle Grid provenance | WARN | API audit run persisted external job ID, but provider/model/GPU fields were blank after failure. | high | Persist requested model/provider and terminal scheduling metadata even on failed jobs. |
| Zynq worker fixture | FAIL | Current Zynq fixture fails `validate_worker_output`: generated paths/questions are not SoC-specific enough. | high | Repair heuristic/candidate generation and add regression coverage. |
| Existing expected sample outputs | PASS | `output-sample`, `output-adc32rf45`, and `output-zynq-ultrascale-plus` passed the Node validator. | — | Reconcile with current Zynq failure. |
| Frontend build | PASS | Next production build completed. Bundle scan found no backend secret identifiers. | — | Keep build gate. |
| Browser UI exercise | BLOCKED | Web dev server launch was denied by the execution environment after API checks; no workaround used. | medium | Run browser smoke locally/CI before submission. |
| Markdown safety | PASS | Renderer creates React text nodes and does not use `dangerouslySetInnerHTML`. | — | Keep this renderer model. |
| Production Compose config | FAIL | `infra/.env.production` contains seven non-dotenv lines; Compose cannot parse it. | blocker | Replace it with a valid secret-managed dotenv file only. |
| Container image contract | WARN | Image tag/entrypoint configured; image was not pulled locally by design. Entrypoint uses `ollama run`, not enforced JSON mode. | high | Validate image remotely after AMD capacity is available; enforce JSON output. |
| Seed safety | WARN | Seed uses upserts but overwrites fixed demo records and contains a fixed demo password. | high | Never run against non-demo DB; remove hard-coded password or guard seed. |
| Datasheet logging | WARN | API logged a large source-derived company-history retrieval query during audit run. | high | Redact/limit document-derived text in application logs. |

## Environment Readiness

Values were never printed. “Unverifiable” means only presence was checked without sending or revealing the value.

| Variable | Required scope | State | Assessment |
|---|---|---|---|
| `DATABASE_URL` | required runtime | present | likely valid: parsed as local PostgreSQL and read-only probe passed. |
| `WEB_APP_URL`, `APP_URL`, `API_URL`, `API_CORS_ORIGIN`, `NEXT_PUBLIC_API_BASE_URL` | required deployment URLs | present | unverifiable externally; configured hosts are local. |
| `SESSION_SECRET` | required production | present | unverifiable. |
| Google OAuth client ID/secret | optional unless Google sign-in enabled | missing | Google login correctly returns unavailable configuration. |
| ZeptoMail token/from address | required only for ZeptoMail | missing | current API started with console mail, so non-production only. |
| `FIREWORKS_API_KEY` | required for Fireworks remote route | present | unverifiable; default remote routing can select it. |
| `JUNGLE_GRID_API_URL`, `JUNGLE_GRID_API_KEY` | required Jungle Grid | present | likely valid: authenticated list request returned 200. |
| `JUNGLEGRID_ENABLED` | required to select Jungle Grid remotely | **missing** | default remote route does not use Jungle Grid. |
| `JUNGLE_GRID_MODEL` | optional in worker, required for complete provenance | missing | worker effective default is `gemma4:12b`; API execution record model is blank. |
| `JUNGLE_GRID_IMAGE` | optional in worker, required for complete provenance | missing | worker effective image is the configured ROCm default. |
| `JUNGLE_GRID_RUNTIME_BACKEND`, `JUNGLE_GRID_GPU_VENDOR` | optional | missing | worker defaults to `rocm` and `AMD`. |
| `LOCAL_GEMMA_*` | required only local Gemma mode | missing | real local Gemma not available/proven. |
| `AMD_NOTEBOOK_MANUAL_ENABLED` | optional | missing | manual AMD provider disabled. |

### Gemma Verification

- Was real Gemma used? **No; not verified.**
- Intended model identifier: **`gemma4:12b`**, selected by `JUNGLE_GRID_MODEL` or the Jungle Grid backend default.
- Where selected: `workers/classifier/src/backends/jungle_grid_backend.py`; hardcoded default but environment-configurable.
- Was the response mocked? The **live attempt was not mocked**. Python contract tests do use mocked Jungle Grid responses.
- Did schema validation pass for a real Gemma response? **BLOCKED**; there was no worker/model response.
- Did complete real classification output generate? **No**. The API test run produced a deterministic fallback workup, not a Gemma workup.
- Silent fallback: remote worker enables `AI_FALLBACK_TO_HEURISTIC` by default. It records fallback and the API correctly uses `needs_attention`, but a memo/facts/candidates still exist after the model backend fails.

### AMD Verification

- Did the workload run on an AMD GPU? **No.**
- Requested hardware: AMD GPU, ROCm runtime, one GPU.
- Requested image: `ghcr.io/jungle-grid/substrata-jungle-grid-inference:rocm`.
- Provider: no provider assigned.
- Runtime evidence: live job `job-1783785317868949954` reached `failed/cleanup`, `worker_assigned=false`, `gpu_vendor=amd`, `runtime=rocm`, no GPU name, and no artifacts.
- Provider error: `CAPACITY_UNAVAILABLE`; ROCm workloads are unsupported by currently configured capacity.
- NVIDIA fallback: **none observed.** This is not a successful AMD test; the job never started.

## API Audit

| Endpoint / behavior | Actual result |
|---|---|
| `GET /health` | 200, `{ ok: true, service, database }`. |
| `GET /v1/documents` unauthenticated | 401. |
| `GET /v1/auth/csrf` | 200; CSRF flow usable. |
| malformed `POST /v1/auth/sign-up` | 400. |
| valid audit signup | 201. |
| sign-in before email verification | 403. |
| verified audit sign-in | 200. |
| onboarding | 200. |
| `POST /v1/documents/sample` | 201. |
| `POST /v1/documents/:id/classification-runs` | 202; queued then async execution. |
| `GET /v1/classification-runs/:id` | 200; terminal `needs_attention`. |
| memo/artifacts/audit endpoints | 200. |
| reviewer submission | 201. |
| other-organization run access | 404. |
| invalid run ID | 404. |
| unsupported PNG upload | 415. |

Not fully exercised: malformed JSON parser behavior, oversized upload, duplicate submission, API restart during execution, unavailable database/API provider, callback duplication, and authenticated browser flow. See **Untested Areas**.

## Database and Data Model Audit

- Organization scoping is present on documents, runs, facts, candidates, citations, memos, reviews, artifacts, execution jobs, and audit events.
- Two-audit-organization request verified the run detail route returns 404 cross-organization.
- `ExecutionJob` uses unique `classificationRunId` and nullable unique `externalJobId`; this helps duplicate-job prevention.
- API-run audit persisted 5 artifact rows and 5 run-scoped audit events.
- Failed remote output does preserve diagnostics in `ExecutionJob.errorMessage`; the execution job was `blocked` and stored an external job ID.
- The schema validates, but migration deployment is broken by the empty migration directory. A clean migration path is therefore **not validated**.
- Do not run `db:seed` against a non-demo database: the seed upserts fixed records and deletes/recreates data for that fixed seed run.

## Security and Compliance Boundary Audit

- API session cookies use opaque hashes; state-changing protected routes require CSRF token matching.
- Protected data uses organization-scoped queries; cross-org route test passed.
- Local storage path resolution rejects absolute and traversal paths.
- Upload policy restricts extensions/MIME types and caps uploads at 12 MiB.
- Child-process calls use `execFile`, not shell interpolation, for `pdftotext` and the Python worker.
- Markdown is rendered as React text, not raw HTML.
- Build output did not contain the scanned server-secret identifiers.
- **High concern:** the seed file contains a fixed demo password and mutates fixed demo records; it is unsuitable for a non-demo environment.
- **High concern:** `Company History retrieval completed` logs a large source-derived query containing datasheet facts and candidate context. This can unnecessarily retain sensitive customer technical content in logs.
- Product copy and memo prompt use human-review language and avoid a final legal decision claim. API audit memo contained a qualified-review/human-review disclaimer.

## Container and Submission Readiness

- `infra/jungle-grid-image/Dockerfile` builds from `ollama/ollama:rocm`, pre-bakes `gemma4:12b` in CI, and defines `/app/run-extraction.sh` as entrypoint.
- No image was pulled locally during this audit.
- The entrypoint exists and is executable in the Dockerfile, but it runs `ollama run "${SUBSTRATA_MODEL}" "${SUBSTRATA_PROMPT}"` without a JSON-enforcement flag. The caller requires strict JSON; validate this remotely once capacity exists.
- CI builds/pushes the ROCm image to the expected GHCR tag, but the audit could not verify registry manifest metadata or a running container because no local pull was allowed and the provider did not assign capacity.
- Local Compose render passed. Production Compose render failed because `infra/.env.production` is not valid dotenv syntax; it includes seven non-assignment lines.

## Defects

### 1. AMD/ROCm capacity unavailable

- Severity: **blocker**
- Component: Jungle Grid provider configuration
- Reproduction: run `JUNGLE_GRID_LIVE_TEST_ENABLED=true python3 workers/classifier/scripts/live_jungle_grid_smoke.py` with configured credentials.
- Expected: provider assigns AMD GPU, worker starts, `gemma4:12b` responds, runtime metadata confirms ROCm.
- Actual: job `job-1783785317868949954` failed in cleanup before assignment with `CAPACITY_UNAVAILABLE`.
- Sanitized log: `ROCm workloads are not supported by the currently configured capacity.`
- Recommended fix: configure a healthy AMD/ROCm provider/pool and rerun the live smoke and API submission.

### 2. Default remote route does not choose Jungle Grid

- Severity: **blocker** for AMD demonstration
- Component: `execution-router.service.ts` / deployment environment
- Reproduction: inspect runtime env and call remote selector.
- Expected: hackathon demo remote requests choose Jungle Grid AMD path.
- Actual: `JUNGLEGRID_ENABLED` is absent; remote selection falls through to Fireworks when configured.
- Recommended fix: set `JUNGLEGRID_ENABLED=true`, pin the provider priority for demo, and surface provider/model in UI provenance.

### 3. Prisma migration chain is invalid

- Severity: **blocker**
- Component: `packages/db/prisma/migrations/20260710202549_init`
- Reproduction: `prisma migrate status --schema prisma/schema.prisma`.
- Expected: migration status reports database state.
- Actual: P3015 because directory lacks `migration.sql`.
- Recommended fix: restore the committed migration file or remove the accidental empty directory through a reviewed migration repair; then verify a fresh database path.

### 4. Production env file is not dotenv-valid

- Severity: **blocker**
- Component: `infra/.env.production`
- Reproduction: `docker-compose -f infra/docker-compose.prod.yml config`.
- Expected: Compose config renders with secret values provided by a valid dotenv file.
- Actual: dotenv parser rejects a non-assignment line (`unexpected character "/" in variable name "cd /opt/substrata"`).
- Recommended fix: keep deployment instructions outside the env file; use only `NAME=value` assignments and secret management.

### 5. Current Zynq fixture fails worker validation

- Severity: **high**
- Component: deterministic review-path/candidate generation
- Reproduction: run current Zynq input in deterministic fallback mode.
- Expected: SoC/programmable-logic Category 3 review path and specific reviewer questions.
- Actual: worker rejects its output because generated paths/questions are not Zynq/MPSoC-specific enough.
- Recommended fix: repair profile-sensitive path selection/questions and add this exact current-input regression to CI.

### 6. API suite regression

- Severity: **medium**
- Component: classification-run presenter test
- Reproduction: `WEB_APP_URL=http://localhost:3000 corepack pnpm test`.
- Expected: all route tests pass.
- Actual: 59/60 pass; expected execution summary lacks newly returned `executionMode` and `selectedProvider` fields.
- Recommended fix: update test expectation if these fields are intentional, or restore previous presentation contract.

### 7. Remote failure provenance is incomplete

- Severity: **high**
- Component: execution-job persistence
- Reproduction: API-triggered Jungle Grid run with failed ROCm scheduling.
- Expected: requested provider/model/image plus terminal provider/scheduling metadata remain visible.
- Actual: external job ID and image persisted, but provider/model/GPU fields are blank (`JUNGLE_GRID_MODEL` defaults only in Python backend, not API execution record).
- Recommended fix: persist requested model/provider defaults before submission and terminal scheduling metadata independently of successful GPU assignment.

### 8. Artifact endpoint cannot preview available audit-run artifacts

- Severity: **medium**
- Component: `/v1/classification-runs/:id/artifacts`
- Reproduction: audit API run after deterministic fallback.
- Expected: artifact preview text is readable when five artifact rows are persisted.
- Actual: endpoint returns 200 and paths, but `memoPreview` and `extractedTextPreview` are null.
- Recommended fix: reconcile artifact storage keys with `createStorageDriver()` resolution and add integration coverage.

### 9. Source-derived technical content is logged

- Severity: **high**
- Component: Company History retrieval diagnostics
- Reproduction: complete API audit classification; inspect server diagnostic output.
- Expected: logs identify request/run safely without retaining material datasheet text.
- Actual: retrieval query includes document title, extracted facts, candidate details, review paths, and questions.
- Recommended fix: log IDs/counts/hashes only; gate detailed diagnostics behind a secure, short-lived debug mode.

## Untested Areas

- Successful real Gemma inference and schema-valid response: blocked by ROCm capacity.
- Successful real AMD GPU metadata, ROCm availability, provider identity, image digest, artifacts, teardown, and orphan cleanup: blocked by no worker assignment.
- Browser-console, responsive desktop/tablet/mobile, and authenticated Next.js flow: blocked by execution environment refusing additional web-server startup; production build passed.
- Current API readiness endpoint: not implemented; only `/health` exists.
- Oversized file behavior, malformed JSON transport, duplicate submissions, callback duplication, API restart during execution, unavailable database, and remote provider outage: not deliberately induced to avoid disruptive changes; partially covered by tests/static paths.
- Docker image manifest/entrypoint execution: local pull prohibited and remote capacity unavailable.
- Clean-database migration deploy: blocked until missing migration file is repaired.

## Submission Blockers

1. No configured AMD/ROCm capacity in Jungle Grid.
2. `JUNGLEGRID_ENABLED` missing, so normal remote routing can use Fireworks instead of Jungle Grid.
3. Missing `migration.sql` makes Prisma migration status/deploy fail.
4. Invalid `infra/.env.production` makes production Compose parsing fail.
5. Real Gemma response and successful AMD runtime cannot be proven.

## Recommended Fix Order

1. Repair Jungle Grid AMD/ROCm capacity and explicitly enable/pin Jungle Grid for the demo environment.
2. Run the live Gemma smoke again and capture AMD GPU/provider/ROCm/model/artifact metadata.
3. Repair the empty Prisma migration directory; validate clean migration deploy.
4. Replace invalid production env content with a valid dotenv/secrets file and rerun Compose config.
5. Fix Zynq profile review-path generation and the stale API test expectation.
6. Persist requested/terminal execution provenance on failures and repair artifact previews.
7. Redact source-derived technical content from routine logs; harden demo seed behavior.
8. Run browser and responsive smoke tests after the above succeeds.

## Final Checklist

- [x] frontend build passes
- [ ] API tests pass
- [x] worker tests pass
- [x] database schema validated
- [ ] real Gemma test passes
- [ ] AMD GPU test passes
- [ ] Jungle Grid job completes
- [x] citations generated in deterministic/API fallback workup
- [x] uncertainty displayed/persisted
- [x] memo generated
- [x] human review required
- [ ] artifacts retrievable with previews
- [~] secrets protected (bundle scan clean; seed password and source-derived logs need remediation)
- [~] container path validated (static contract only; no live AMD startup)
- [ ] demo procedure validated end to end
- [x] no local downloads required during this audit

## Terminal Summary

Overall verdict: **NOT READY**

- Total passed: 12
- Total failed: 6
- Total warnings: 5
- Total blocked: 5
- Real Gemma verified: **no**
- AMD execution verified: **no**
- Reports: `SUBSTRATA_AUDIT_REPORT.md`, `SUBSTRATA_TEST_RESULTS.md`

# Remediation Pass

## Scope and Verdict

**Current application-readiness verdict: READY WITH WARNINGS.** The four
in-scope audit blockers are repaired and the application/repository checks run
in this pass are green. The warnings below are explicitly deferred external
infrastructure verification and one locally unavailable live-model sample;
neither is evidence of a successful live Gemma or AMD run.

The following were excluded from this remediation pass at the user's direction:
live AMD GPU execution, ROCm runtime execution, live Gemma-on-AMD proof, AMD
provider availability, Jungle Grid capacity configuration, and Jungle Grid
scheduler or fallback changes. They are **DEFERRED**, **UNVERIFIED**, and
**OUTSIDE CURRENT REMEDIATION SCOPE**.

## In-scope blocker repairs

| Original blocker | Root cause and change | Files changed | Evidence | Status / remaining risk |
|---|---|---|---|---|
| `20260710202549_init` had no `migration.sql` | The database recorded this migration as applied immediately after the hybrid migration, while Git contained no file. A schema diff proved it added `Organization.defaultExecutionPreference` with default `auto`. The additive SQL was restored; its checksum was reconciled to the existing applied record; then the two already-reviewed later migrations were deployed to normalize the default to `remote`. | `packages/db/prisma/migrations/20260710202549_init/migration.sql` | `prisma validate`, `prisma migrate deploy`, and `prisma migrate status` all passed; status reports 13 migrations and schema up to date. | **PASS.** No tables, columns, or data were dropped; the restored migration is additive and the database already contained its column. |
| `infra/.env.production` was not dotenv-valid | Seven shell/deployment commands at lines 53–62 caused Compose parsing failure. They were replaced with comments, and the file now documents required/optional groups, public frontend exposure, server-only secrets, and `CHANGE_ME_` placeholder convention. | `infra/.env.production` (ignored local deployment file) | Existing dotenv parser accepted 31 assignments; `docker-compose -f infra/docker-compose.prod.yml --env-file infra/.env.production config --quiet` exited 0. | **PASS.** No values were added or printed; deployment secrets remain server-side. |
| API presenter suite had one stale expectation | The route presenter intentionally added `executionMode` and `selectedProvider`; the response type and frontend consume both fields. The exact deep-equality expectation was updated, retaining the full contract assertion. | `apps/api/src/routes/classification-runs.test.ts` | `WEB_APP_URL=http://localhost:3000 corepack pnpm test`: 60/60 passing, zero skips. | **PASS.** |
| Zynq fixture failed worker validation | The hybrid profile engine treated peripheral ADC/Ethernet evidence as primary routes and replaced the extracted MPSoC profile. A Zynq-specific SoC profile now takes precedence, suppresses those peripheral routes, emits the Category 3 programmable-logic/SoC and Category 5 Part 2 questions, and keeps evidence technical. The validator label map was aligned with the worker's clocking fact label. | `workers/classifier/src/classification_heuristics/{__init__,profiles,rules,signals}.py`, `workers/classifier/tests/test_classification_heuristics.py`, `scripts/validate-worker-output.mjs` | Actual fallback fixture run: 48 specs, 3 candidates, grounded citations, uncertainty flags, memo, and `requires_human_review=true`; worker tests 32/32. | **PASS.** |

## Gemma integration (non-live verification)

**TESTED THROUGH EXISTING NON-LIVE TESTS / LIVE EXECUTION UNVERIFIED.** The
managed backend defaults to `gemma4:12b` and accepts `JUNGLE_GRID_MODEL`;
request construction, timeouts, polling, parsing through
`validate_ai_extraction_payload`, error handling, citations, uncertainty, and
human-review requirements were inspected. Existing Jungle Grid contract and
local-backend adapter tests pass. Production outputs are validated against
source evidence and remain advisory review paths with required human review;
no normal production path silently substitutes a mock.

The Gemma integration is present and its request, response, and validation
paths were inspected or tested, but live Gemma execution remains unverified in
this remediation pass. **Live Gemma execution was not tested. Live AMD
execution was not tested.**

## Security and configuration sanity

- `git diff --check` passed.
- No credentials, tokens, database URLs, dumps, generated credentials, or test
  tokens were added to the tracked diff.
- No `NEXT_PUBLIC_` backend-secret identifier was found in the frontend source
  or build verifier; `NEXT_PUBLIC_API_BASE_URL` is documented as intentionally
  public.
- The migration contains no destructive statement. Authentication, CSRF, and
  organization-isolation tests remain in the green API suite.
- No Jungle Grid provider, capacity, scheduler, routing, AMD, ROCm, CUDA, or
  Fireworks logic was changed.

## Remaining warning

`ax920-input.json` requests the real local Gemma backend. Its full sample run
is **BLOCKED** because no local Gemma service/model is available and this pass
did not download or mock one. Its installed non-live local-backend tests pass;
the sample fixture itself was not changed or falsely reported as successful.

# Deletion and Retention Readiness

## Lifecycle model and dependency map

Documents and classification runs now have nullable `archivedAt` and
`archivedByUserId` fields. Active lists exclude archived records; archive is
recoverable and permanent deletion is a separate owner/admin-only action.

`Document → ClassificationRun → {ExtractedSpec, ECCNCandidate, Citation,
ReviewPath, ReviewMemo, ReviewMemoVersion, HumanReview, ReviewerAction,
FactIssue, Artifact, ExecutionJob, ClassificationHistoryMatch}`. These child
relations use reviewed Prisma cascades when the explicitly scoped parent is
permanently deleted. `AuditEvent` is independent and remains as a minimal
tombstone; it does not retain raw document text, memo content, facts, or
storage credentials.

## Implemented API behavior

- `POST /v1/documents/:id/archive`, `POST /restore`, and `DELETE /permanent`.
- `POST /v1/classification-runs/:id/archive`, `POST /restore`, and `DELETE
  /permanent`.
- Archive/restore is organization scoped and idempotent. Permanent deletion
  requires an exact entity-ID confirmation, prior archive, and OWNER/ADMIN.
- Active run states return `409`; they are never treated as deleted.
- Local storage cleanup is attempted and confirmed before metadata deletion.
  Missing local objects are idempotent; unknown cleanup errors retain metadata
  and create a failure audit event.
- Deletion request, success, and failure audit events are retained as tombstones.

## Remaining limitations

Cancellation, remote provider cancellation, individual-artifact deletion, and
frontend lifecycle controls remain **NOT TESTED / not implemented in this
increment**. They must be completed before claiming full deletion readiness for
sensitive customer data. No external Jungle Grid behavior was changed.

## Follow-up lifecycle increment

`POST /v1/classification-runs/:id/cancel` now cancels local active runs into an
explicit `cancelled` state and preserves diagnostics. Remote jobs are never
reported cancelled without provider confirmation: the API records a sanitized
failure/pending audit event and returns conflict when remote confirmation is not
available. Artifact deletion and retry routes are available beneath a run:
`DELETE /v1/classification-runs/:id/artifacts/:artifactId` and `POST
/v1/classification-runs/:id/artifacts/:artifactId/retry-deletion`.

Artifact deletion stores a requested timestamp, attempt count, and sanitized
failure reason before cleanup; it deletes metadata only after local storage
returns deleted or confirmed missing. **WARN:** frontend controls, archived-item
views, and dedicated lifecycle failure-path tests remain incomplete, so the
overall deletion-retention verdict remains NOT READY.
