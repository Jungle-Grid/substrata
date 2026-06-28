# Local Development

## Requirements

- Node.js 20+
- Corepack
- Python 3.11+
- Docker

## Start Postgres

```bash
docker compose -f infra/docker-compose.yml up -d
```

If your Docker install does not support `docker compose`, use:

```bash
docker-compose -f infra/docker-compose.yml up -d
```

## Install JavaScript Dependencies

```bash
COREPACK_HOME=/tmp/corepack corepack pnpm install
```

If registry fetches time out, retry the same command. The repo now includes `.npmrc` with higher retry and timeout settings.

## Initialize Database

```bash
COREPACK_HOME=/tmp/corepack corepack pnpm db:generate
COREPACK_HOME=/tmp/corepack corepack pnpm db:migrate
COREPACK_HOME=/tmp/corepack corepack pnpm db:seed
```

The seed script creates:

- `owner@substrata.local / SubstrataDemoPass123!`
- `reviewer@substrata.local / SubstrataDemoPass123!`
- one sample organization with a sample seeded document, completed review run, memo, and audit events

## Start API

```bash
COREPACK_HOME=/tmp/corepack corepack pnpm dev:api
```

## Start Web App

```bash
COREPACK_HOME=/tmp/corepack corepack pnpm dev:web
```

## Run Both Apps Together

```bash
COREPACK_HOME=/tmp/corepack corepack pnpm dev
```

## Run Worker Sample

```bash
COREPACK_HOME=/tmp/corepack corepack pnpm worker:sample
```

## Run Smoke Check

```bash
COREPACK_HOME=/tmp/corepack corepack pnpm smoke:api
```

## Local Demo Flow

1. Open `http://localhost:3000/sign-in`.
2. Sign in with one of the seeded local users.
3. Open the seeded document at `http://localhost:3000/app/documents/doc_seed_orion_x7`.
4. Start a new classification run from the document detail page, or create a new document at `http://localhost:3000/app/documents/new`.
5. Review extracted technical facts, recommended review paths, citations, uncertainty flags, human review status, and the draft memo on the run detail page.

## Frontend QA Notes

- Primary authenticated routes live under `/app`.
- Mobile QA should cover at least `320px`, `375px`, `390px`, `768px`, `1024px`, and `1440px`.
- Validate the mobile drawer, empty states, status badges, and confirmation dialogs in addition to basic page rendering.
- If `/app` immediately redirects back to `/sign-in` after entering valid seeded credentials, verify that Postgres is running and that the API can connect with the credentials in `.env`.

## Known Local Caveats

- If the API cannot connect to Postgres, auth form submissions will fail even when frontend validation is correct.
- In this environment, `pnpm --filter @substrata/web build` may finish compilation and static generation but remain stuck at `Collecting build traces ...`.

## Optional External Services

- Google OAuth:
  - create a web OAuth client in Google Cloud Console
  - add `http://localhost:4000/v1/auth/google/callback` as an authorized redirect URI
  - copy the client ID and secret into `.env`
- ZeptoMail:
  - create an API token in ZeptoMail
  - verify the sender domain and sender address used in `EMAIL_FROM`
  - copy the API token into `.env`
- If ZeptoMail is not configured locally, Substrata falls back to deterministic console-logged mail attempts for development.
