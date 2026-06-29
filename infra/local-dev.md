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
  - create or select the ZeptoMail Agent you want Substrata to use
  - verify the sender domain and the sender address configured in `EMAIL_FROM_ADDRESS`
  - open `Agents -> SMTP/API` and copy the Send Mail Token from the API section into `ZEPTOMAIL_SEND_MAIL_TOKEN`
  - set `EMAIL_PROVIDER=zeptomail` in the environment where you want real delivery
  - keep `WEB_APP_URL` aligned with the public web app origin used in verification and reset links
  - manually test sign-up, resend verification, and forgot password in production after the Agent token and sender identity are live
- Local console mode:
  - keep `EMAIL_PROVIDER=console` for local development
  - console mode never calls ZeptoMail; it logs a masked recipient preview and a masked verification or reset URL instead
- Public demo classification run:
  - leave `PUBLIC_DEMO_CLASSIFICATION_RUN_ID` unset locally unless you intentionally want to expose one safe demo run without sign-in
  - in production, set it only to a completed run backed by a public, non-confidential sample or seeded datasheet
