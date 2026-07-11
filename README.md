
<div align="center">
  <a href="https://github.com/Jungle-Grid/substrata">
    <img src="apps/web/public/brand/substrata-logo.png" alt="Substrata logo" width="160">
  </a>

  <h1>Substrata</h1>

  <p><strong>Evidence-backed ECCN review assistant for semiconductor and advanced hardware teams.</strong></p>

</div>

Substrata is an evidence-backed ECCN review assistant for semiconductor and advanced hardware teams. Upload a datasheet to extract technical facts, generate cited review paths, identify uncertainty flags, and produce a human-review-ready classification memo draft with an audit trail.

## What is in this repo

- `apps/web` - Next.js frontend
- `apps/api` - Express API and auth
- `packages/db` - Prisma schema and database client
- `packages/shared` - shared TypeScript types and zod schemas
- `workers/classifier` - Python classification worker
- `docs` - product, architecture, and human-review guidance
- `infra` - local and packaging infrastructure

## Quick start

1. Copy `.env.example` to `.env` and set `SESSION_SECRET`.
2. Start Postgres: `docker compose -f infra/docker-compose.yml up -d`.
3. Install dependencies: `COREPACK_HOME=/tmp/corepack corepack pnpm install`.
4. Generate and migrate the DB: `pnpm db:generate && pnpm db:migrate`.
5. Seed demo data: `pnpm db:seed`.
6. Start services: `pnpm dev:api` and `pnpm dev:web` (or `pnpm dev`).

## Execution modes

- **Local** runs the configured local Gemma model with Substrata’s deterministic review engine.
- **Remote** lets Substrata select the configured remote provider internally.

Provider names such as Fireworks and Jungle Grid are recorded in execution details, not exposed as top-level user choices. See [Execution modes](docs/EXECUTION_MODES.md) for configuration and fallback behavior.

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [Execution modes](docs/EXECUTION_MODES.md)
- [Human-review guidance](docs/README.md)

## Contributing

Please follow the contribution guidelines in `CONTRIBUTING.md`. Keep examples runnable and avoid committing secrets.

## License

This repository is licensed under the MIT License. See `LICENSE`.

Human review is required for every classification output. Do not commit credentials or provider API keys.
