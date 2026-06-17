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

1. Open `http://localhost:3000/dashboard`.
2. Open the seeded document at `http://localhost:3000/documents/doc_seed_orion_x7`.
3. Start a new classification run from the document detail page, or create a new document at `http://localhost:3000/documents/new`.
4. Review extracted specs, ECCN candidates, citations, uncertainty flags, human review status, and the draft memo on the run detail page.
