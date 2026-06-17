# Substrata Monorepo

Substrata is an AI-native export control and trade compliance review assistant for semiconductor and advanced hardware teams. This repository contains a validation-ready MVP for datasheet upload, local text extraction, export-relevant spec extraction, ECCN candidate drafting, citations, memo generation, and mandatory human review tracking.

## Monorepo Layout

- `apps/web`: Next.js frontend
- `apps/api`: Express API
- `packages/db`: Prisma schema and database client
- `packages/shared`: shared TypeScript types and zod schemas
- `workers/classifier`: Python classification worker
- `docs`: product, architecture, compliance, and engineering docs
- `infra`: local infrastructure for development

## Local Development

1. Copy `.env.example` to `.env`.
2. Start Postgres:
   - `docker compose -f infra/docker-compose.yml up -d`
   - if your Docker install does not support `docker compose`, use `docker-compose -f infra/docker-compose.yml up -d`
3. Install JavaScript dependencies:
   - `COREPACK_HOME=/tmp/corepack corepack pnpm install`
   - if the npm registry times out, retry the same command; `.npmrc` now increases retry/timeouts
4. Generate Prisma client:
   - `COREPACK_HOME=/tmp/corepack corepack pnpm db:generate`
5. Create the development schema:
   - `COREPACK_HOME=/tmp/corepack corepack pnpm db:migrate`
6. Seed the database with a development organization, user, sample document, completed classification run, citations, memo, human review record, and audit events:
   - `COREPACK_HOME=/tmp/corepack corepack pnpm db:seed`
7. Start the API:
   - `COREPACK_HOME=/tmp/corepack corepack pnpm dev:api`
8. Start the frontend in a second terminal:
   - `COREPACK_HOME=/tmp/corepack corepack pnpm dev:web`
9. Optionally run both with one command:
   - `COREPACK_HOME=/tmp/corepack corepack pnpm dev`
10. Run the sample Python worker locally:
   - `COREPACK_HOME=/tmp/corepack corepack pnpm worker:sample`
11. Verify the API manually:
   - `COREPACK_HOME=/tmp/corepack corepack pnpm smoke:api`

## Acceptance Paths

- API health: `GET http://localhost:4000/health`
- Dashboard: `http://localhost:3000/dashboard`
- Upload flow: `http://localhost:3000/documents/new`
- Sample datasheet demo: use `Try sample datasheet` from the dashboard
- Seeded document: `http://localhost:3000/documents/doc_seed_orion_x7`
- Seeded run: `http://localhost:3000/classification-runs/run_seed_orion_x7`
- Worker sample output: `workers/classifier/samples/output-sample.json`

## Demo Workflow

1. Open `http://localhost:3000/dashboard`.
2. Either click `Try sample datasheet` for the bundled public/sample demo file, or go to `Upload` and submit a PDF or text datasheet.
3. Open the created document and start a classification run.
4. Review the extracted specs, ECCN candidate cards, citations, reviewer questions, and draft memo.
5. Record a reviewer disposition and note from the run page.
6. Download the memo Markdown from the run page when you want the full expert-review artifact.

## Notes

- Real auth is intentionally deferred.
- Human review is mandatory for every classification output.
- The upload flow stores original files locally and extracts PDF text with local tooling when available.
- Jungle Grid is a future execution target; local execution is the MVP default.
