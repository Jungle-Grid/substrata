
<div align="center">
  <a href="https://substrata.example">
    <img src="/public/brand/substrata-logo.png" alt="Substrata logo" width="160">
  </a>

  <h1>Substrata</h1>

  <p><strong>Evidence-backed ECCN review assistant for semiconductor and advanced hardware teams.</strong></p>

  <p>
    <a href="https://substrata.example"><img alt="Website" src="https://img.shields.io/badge/Visit-website-111827?style=for-the-badge"></a>
    <a href="https://substrata.example/docs"><img alt="Docs" src="https://img.shields.io/badge/Read-the_docs-2563eb?style=for-the-badge"></a>
    <a href="https://discord.gg"><img alt="Join Discord" src="https://img.shields.io/badge/Join-Discord-5865f2?style=for-the-badge&logo=discord&logoColor=white"></a>
    <a href="mailto:run@substrata.example"><img alt="Email" src="https://img.shields.io/badge/Email-run@substrata.example-16a34a?style=for-the-badge"></a>
    <a href="./LICENSE"><img alt="License: MIT" src="https://img.shields.io/badge/License-MIT-f97316?style=for-the-badge"></a>
  </p>
</div>

Runnable templates and an ECCN review assistant for building auditable classification workflows.

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

See `docs/` for detailed developer and runbook instructions.

## Contributing

Please follow the contribution guidelines in `CONTRIBUTING.md`. Keep examples runnable and avoid committing secrets.

## License

This repository is licensed under the MIT License. See `LICENSE`.

## Notes

- Human review is required for all classification outputs.
- Do not commit credentials such as `JUNGLE_GRID_API_KEY` or other secrets.

> To display the logo above, add the provided Substrata logo file at `public/brand/substrata-logo.png`.
