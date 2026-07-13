# Production environment and VPS deployment

Substrata production deployments use the root `compose.yml`. Every Compose command must explicitly name the untracked production environment file:

```bash
docker compose --env-file infra/.env.production ...
```

Never commit, print, or copy `infra/.env.production` into an image. Start from `infra/.env.production.example` and enter real values directly on the VPS.

## Environment inventory

“Conditional” means required only when the related feature is enabled. The API launches the Python classifier as a child process, so worker variables belong on the API container at runtime.

### Database and one-shot services

| Variable            | Service                      | Requirement / default                                                                        | Secret | Phase   |
| ------------------- | ---------------------------- | -------------------------------------------------------------------------------------------- | ------ | ------- |
| `POSTGRES_DB`       | postgres, migrate, seed, API | Required; no production default                                                              | No     | Runtime |
| `POSTGRES_USER`     | postgres, migrate, seed, API | Required; no production default                                                              | No     | Runtime |
| `POSTGRES_PASSWORD` | postgres, migrate, seed, API | Required; no production default; URL-safe characters only                                    | Yes    | Runtime |
| `POSTGRES_PORT`     | postgres host binding        | Optional; `5433`                                                                             | No     | Runtime |
| `DATABASE_URL`      | Prisma in migrate, seed, API | Constructed inside Compose with host `postgres:5432`; a supplied production value is ignored | Yes    | Runtime |
| `NODE_ENV`          | migrate, seed, API, web      | `production`                                                                                 | No     | Runtime |

### API, web, sessions, and storage

| Variable                             | Service                          | Requirement / default                                         | Secret | Phase             |
| ------------------------------------ | -------------------------------- | ------------------------------------------------------------- | ------ | ----------------- |
| `APP_URL`                            | API                              | Required public web origin                                    | No     | Runtime           |
| `WEB_APP_URL`                        | API                              | Required canonical public web origin                          | No     | Runtime           |
| `API_URL`                            | API                              | Required public API origin                                    | No     | Runtime           |
| `API_CORS_ORIGIN`                    | API                              | Required public web origin                                    | No     | Runtime           |
| `API_PORT`                           | API, web internal API URL, Nginx | Optional; `4100`                                              | No     | Runtime           |
| `WEB_PORT`                           | web, Nginx                       | Optional; `3100`                                              | No     | Runtime           |
| `NEXT_PUBLIC_API_BASE_URL`           | web/browser                      | Required public API origin                                    | No     | Build and runtime |
| `SESSION_SECRET`                     | API                              | Required, minimum 32 characters, no known demo value          | Yes    | Runtime           |
| `SESSION_COOKIE_NAME`                | API                              | Optional; `substrata_session`                                 | No     | Runtime           |
| `SESSION_COOKIE_DOMAIN`              | API                              | Optional; needed for appropriate cross-subdomain cookie scope | No     | Runtime           |
| `STORAGE_DRIVER`                     | API                              | Optional; current Compose supports only `local`               | No     | Runtime           |
| `LOCAL_STORAGE_ROOT`                 | API/worker                       | Optional; `/app/tmp/storage` on the named volume              | No     | Runtime           |
| `PUBLIC_DEMO_ADMIN_EMAILS`           | API                              | Optional comma-separated account list                         | No     | Runtime           |
| `CLASSIFICATION_HISTORY_DIAGNOSTICS` | API                              | Optional; `0`                                                 | No     | Runtime           |

The web server receives `API_URL=http://api:${API_PORT}` internally. That value is server-only. The browser receives only `NEXT_PUBLIC_API_BASE_URL`, which must be publicly reachable and must never contain a credential.

### OAuth and email

| Variable                    | Service            | Requirement / default                     | Secret | Phase   |
| --------------------------- | ------------------ | ----------------------------------------- | ------ | ------- |
| `GOOGLE_OAUTH_ENABLED`      | API and validation | Optional; `false`                         | No     | Runtime |
| `GOOGLE_CLIENT_ID`          | API                | Conditional when Google OAuth is enabled  | No     | Runtime |
| `GOOGLE_CLIENT_SECRET`      | API                | Conditional when Google OAuth is enabled  | Yes    | Runtime |
| `GOOGLE_OAUTH_REDIRECT_URI` | API                | Conditional when Google OAuth is enabled  | No     | Runtime |
| `EMAIL_PROVIDER`            | API                | Required; production must use `zeptomail` | No     | Runtime |
| `ZEPTOMAIL_SEND_MAIL_TOKEN` | API                | Required when ZeptoMail is selected       | Yes    | Runtime |
| `ZEPTO_MAIL_API_TOKEN`      | API                | Deprecated fallback only                  | Yes    | Runtime |
| `EMAIL_FROM_ADDRESS`        | API                | Required with ZeptoMail                   | No     | Runtime |
| `EMAIL_FROM_NAME`           | API                | Optional; `Substrata`                     | No     | Runtime |
| `EMAIL_REPLY_TO`            | API                | Optional                                  | No     | Runtime |

### Classifier execution and providers

| Variable                                                  | Service                | Requirement / default                                            | Secret            | Phase          |
| --------------------------------------------------------- | ---------------------- | ---------------------------------------------------------------- | ----------------- | -------------- |
| `AI_MAX_INPUT_CHARS`                                      | worker via API         | Optional; `120000`                                               | No                | Runtime        |
| `AI_FALLBACK_TO_HEURISTIC`                                | worker/API presenter   | Optional; production default `false`                             | No                | Runtime        |
| `SUBSTRATA_MIN_OWNED_PRODUCT_EVIDENCE`                    | worker                 | Optional; `1`                                                    | No                | Runtime        |
| `REMOTE_PROVIDER_PRIORITY`                                | API router             | Optional; `junglegrid,fireworks,amd_notebook_manual`             | No                | Runtime        |
| `AMD_NOTEBOOK_MANUAL_ENABLED`                             | API router             | Optional; `false`                                                | No                | Runtime        |
| `LOCAL_GEMMA_ENABLED`                                     | API router             | Optional; `false`                                                | No                | Runtime        |
| `LOCAL_GEMMA_RUNTIME`                                     | worker                 | Optional; `ollama`                                               | No                | Runtime        |
| `LOCAL_GEMMA_MODEL`, `GEMMA_MODEL`                        | API/worker             | Optional model identifiers                                       | No                | Runtime        |
| `LOCAL_GEMMA_BASE_URL`, `OLLAMA_HOST`                     | worker                 | Conditional when local Gemma is enabled                          | No                | Runtime        |
| `OLLAMA_BASE_URL`                                         | worker                 | Deprecated local-runtime alias, not passed by Compose            | No                | Runtime        |
| `LOCAL_GEMMA_DEVICE`                                      | worker                 | Optional; `cuda`                                                 | No                | Runtime        |
| `LOCAL_GEMMA_ATTENTION`                                   | worker                 | Optional; `eager`                                                | No                | Runtime        |
| `LOCAL_GEMMA_MAX_NEW_TOKENS`                              | worker                 | Optional; `1024`                                                 | No                | Runtime        |
| `LOCAL_GEMMA_TEMPERATURE`                                 | worker                 | Optional; `0`                                                    | No                | Runtime        |
| `FIREWORKS_ENABLED`                                       | API router             | Optional; `false`                                                | No                | Runtime        |
| `FIREWORKS_API_KEY`                                       | API/worker             | Conditional when Fireworks is enabled                            | Yes               | Runtime        |
| `FIREWORKS_MODEL`                                         | API/worker             | Optional; repository template value                              | No                | Runtime        |
| `FIREWORKS_BASE_URL`                                      | worker                 | Optional; Fireworks inference URL                                | No                | Runtime        |
| `FIREWORKS_TIMEOUT_SECONDS`                               | worker                 | Optional; `90`                                                   | No                | Runtime        |
| `FIREWORKS_MAX_RETRIES`                                   | worker                 | Optional; `3`                                                    | No                | Runtime        |
| `FIREWORKS_INPUT_TOKEN_USD`, `FIREWORKS_OUTPUT_TOKEN_USD` | worker                 | Optional accounting rates                                        | No                | Runtime        |
| `JUNGLE_GRID_ENABLED`                                     | API router             | Canonical toggle; optional, `false`                              | No                | Runtime        |
| `JUNGLEGRID_ENABLED`                                      | API router             | Deprecated fallback toggle                                       | No                | Runtime        |
| `JUNGLE_GRID_API_KEY`                                     | API/worker             | Conditional when Jungle Grid is enabled                          | Yes               | Runtime        |
| `JUNGLE_GRID_API_URL`                                     | worker                 | Optional; Jungle Grid API URL                                    | No                | Runtime        |
| `JUNGLE_GRID_BASE_URL`                                    | worker                 | Deprecated URL alias, not passed by Compose                      | No                | Runtime        |
| `JUNGLE_GRID_IMAGE`, `JUNGLE_GRID_MODEL`                  | API/worker             | Optional prototype image/model identifiers                       | No                | Runtime        |
| `JUNGLE_GRID_RUNTIME_BACKEND`, `JUNGLE_GRID_GPU_VENDOR`   | worker                 | Optional provenance values                                       | No                | Runtime        |
| `JUNGLE_GRID_LIVE_TEST_ENABLED`                           | live smoke script only | Optional explicit billable-test opt-in; not passed to production | No                | Test runtime   |
| `GEMINI_ENABLED`, `GEMINI_API_KEY`                        | validation only        | Reserved; Gemini is not wired into the current router            | API key is secret | Preflight only |

### Development, testing, and script-only variables

| Variable                                | Consumer                     | Requirement / default                                       |
| --------------------------------------- | ---------------------------- | ----------------------------------------------------------- |
| `TEST_DATABASE_URL`                     | API integration-test harness | Required only for integration tests                         |
| `API_BASE_URL`                          | `scripts/smoke-api.mjs`      | Optional; `http://localhost:4000`                           |
| `FIREWORKS_FIXTURES`                    | Fireworks comparison script  | Optional fixture list                                       |
| `SUBSTRATA_APP_DIR`, `SUBSTRATA_BRANCH` | deployment helper            | Optional deployment-script controls                         |
| `SUBSTRATA_MODEL`, `SUBSTRATA_PROMPT`   | Jungle Grid image entrypoint | Required per remote worker job, supplied by the job payload |

The removed template names `AI_ENABLED`, `AI_PROVIDER`, `AI_MODEL`, `AI_DEMO_PUBLIC_DOCS_ONLY`, and `SUBSTRATA_EXECUTION_MODES` are not consumed by the current runtime. Remove them from the VPS file rather than treating them as active configuration.

## Exact changes required in infra/.env.production

Populate secrets directly on the VPS. Empty secret assignments below are intentional placeholders and will cause validation to fail until filled.

```dotenv
# Application URLs and current VPS ports
NODE_ENV=production
APP_URL=https://substrata.example.com
WEB_APP_URL=https://substrata.example.com
API_URL=https://api.substrata.example.com
API_CORS_ORIGIN=https://substrata.example.com
NEXT_PUBLIC_API_BASE_URL=https://api.substrata.example.com
API_PORT=4100
WEB_PORT=3100
POSTGRES_PORT=5433

# Database: retain names, populate a URL-safe secret, remove DATABASE_URL
POSTGRES_DB=substrata
POSTGRES_USER=substrata
POSTGRES_PASSWORD=

# Sessions and cookies
SESSION_SECRET=
SESSION_COOKIE_NAME=substrata_session
SESSION_COOKIE_DOMAIN=.example.com

# Google OAuth: retain credentials only when enabled
GOOGLE_OAUTH_ENABLED=false
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_OAUTH_REDIRECT_URI=https://api.substrata.example.com/v1/auth/google/callback

# Email: rename ZEPTO_MAIL_API_TOKEN after copying its value to the canonical key
EMAIL_PROVIDER=zeptomail
ZEPTOMAIL_SEND_MAIL_TOKEN=
EMAIL_FROM_ADDRESS=noreply@example.com
EMAIL_FROM_NAME=Substrata
EMAIL_REPLY_TO=support@example.com

# Execution defaults
AI_FALLBACK_TO_HEURISTIC=false
AI_MAX_INPUT_CHARS=120000
SUBSTRATA_MIN_OWNED_PRODUCT_EVIDENCE=1
REMOTE_PROVIDER_PRIORITY=junglegrid,fireworks,amd_notebook_manual
AMD_NOTEBOOK_MANUAL_ENABLED=false

# Gemini is reserved and not wired into the current execution router
GEMINI_ENABLED=false
GEMINI_API_KEY=

# Local Gemma: credentials are not required; runtime is conditional
LOCAL_GEMMA_ENABLED=false
LOCAL_GEMMA_RUNTIME=ollama
LOCAL_GEMMA_MODEL=gemma4:e2b
LOCAL_GEMMA_BASE_URL=http://host.docker.internal:11434

# Fireworks: FIREWORKS_API_KEY is required only when enabled
FIREWORKS_ENABLED=false
FIREWORKS_API_KEY=
FIREWORKS_MODEL=accounts/fireworks/models/gpt-oss-120b
FIREWORKS_INPUT_TOKEN_USD=0.0000018
FIREWORKS_OUTPUT_TOKEN_USD=0.0000030

# Jungle Grid: rename JUNGLEGRID_ENABLED to JUNGLE_GRID_ENABLED
JUNGLE_GRID_ENABLED=false
JUNGLE_GRID_API_KEY=
JUNGLE_GRID_API_URL=https://api.junglegrid.dev
JUNGLE_GRID_GPU_VENDOR=AMD
JUNGLE_GRID_IMAGE=ghcr.io/jungle-grid/substrata-jungle-grid-inference:rocm
JUNGLE_GRID_LIVE_TEST_ENABLED=false
JUNGLE_GRID_MODEL=gemma4:12b
JUNGLE_GRID_RUNTIME_BACKEND=rocm

# Storage and public demo
STORAGE_DRIVER=local
LOCAL_STORAGE_ROOT=/app/tmp/storage
PUBLIC_DEMO_ADMIN_EMAILS=
```

After the canonical values are present and validation passes, remove deprecated `ZEPTO_MAIL_API_TOKEN` and `JUNGLEGRID_ENABLED`. Remove `DATABASE_URL`, `AI_ENABLED`, `AI_PROVIDER`, `AI_MODEL`, `AI_DEMO_PUBLIC_DOCS_ONLY`, and `SUBSTRATA_EXECUTION_MODES`; the production stack does not consume them. Retain provider keys only for providers that are enabled.

## Validate before deployment

The package command explicitly loads `infra/.env.production`, reports variable names only, and never prints values:

```bash
pnpm validate:production-env
docker compose --env-file infra/.env.production config --quiet
```

The validation script accepts a different path for safe testing:

```bash
node scripts/validate-production-env.mjs --env-file /path/to/safe-test.env
```

## VPS deployment

From the repository checkout:

```bash
git pull --ff-only origin main
pnpm install --frozen-lockfile
pnpm validate:production-env
docker compose --env-file infra/.env.production config --quiet
docker compose --env-file infra/.env.production build --pull migrate api web
docker compose --env-file infra/.env.production up -d postgres
docker compose --env-file infra/.env.production run --rm migrate
docker compose --env-file infra/.env.production up -d --remove-orphans api web
docker compose --env-file infra/.env.production ps
docker compose --env-file infra/.env.production logs --since=10m --tail=250 migrate api web
```

The final `up` may execute the idempotent migration service again because the API declares a successful migration dependency. It never starts `seed`.

To seed a new, disposable production-like environment deliberately:

```bash
docker compose --env-file infra/.env.production --profile manual run --rm seed
```

Do not run the seed service during normal production deployments. The committed seed creates known demo credentials and fictional data.

## Health and proxy alignment

On the VPS:

```bash
API_PORT="$(sed -n 's/^API_PORT=//p' infra/.env.production | tail -n 1)"
WEB_PORT="$(sed -n 's/^WEB_PORT=//p' infra/.env.production | tail -n 1)"
case "$API_PORT" in (''|*[!0-9]*) exit 1;; esac
case "$WEB_PORT" in (''|*[!0-9]*) exit 1;; esac
curl --fail --silent --show-error http://127.0.0.1:${API_PORT}/v1/health
curl --fail --silent --show-error http://127.0.0.1:${WEB_PORT}/
unset API_PORT WEB_PORT
```

Nginx must proxy the public API route to `127.0.0.1:${API_PORT}` and the web origin to `127.0.0.1:${WEB_PORT}`. If either port changes, update Nginx in the same maintenance window.

Changes to `NEXT_PUBLIC_API_BASE_URL` require rebuilding the web image. Runtime-only API secret changes normally require recreating only the API container:

```bash
docker compose --env-file infra/.env.production up -d --no-deps --force-recreate api
```

Never run `docker compose down -v` in production; it deletes the named PostgreSQL and storage volumes.
