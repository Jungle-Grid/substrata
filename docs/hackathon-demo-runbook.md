# AMD / Jungle Grid Hackathon Demo Runbook

## Safe claim

Substrata uses Jungle Grid to accelerate structured datasheet fact extraction on
AMD/ROCm-capable infrastructure. Substrata preserves source evidence,
uncertainty, a classification memo draft, execution provenance, and required
human approval. It does not make an automated ECCN classification or legal
determination.

## Preflight

Use only a public, legally shareable datasheet. Do not submit customer,
confidential, export-controlled, or personal material to a remote backend.

Set these variables in `.env` or `infra/.env.production`:

```bash
DATABASE_URL=postgresql://...
SESSION_SECRET=long-random-value
WEB_APP_URL=https://substrata.junglegrid.dev
API_URL=https://api.substrata.junglegrid.dev
NEXT_PUBLIC_API_BASE_URL=https://api.substrata.junglegrid.dev
API_CORS_ORIGIN=https://substrata.junglegrid.dev
JUNGLE_GRID_API_URL=https://api.junglegrid.dev
JUNGLE_GRID_API_KEY=...
JUNGLE_GRID_IMAGE=ghcr.io/jungle-grid/substrata-jungle-grid-inference:rocm
JUNGLE_GRID_MODEL=gemma4:12b
JUNGLE_GRID_RUNTIME_BACKEND=rocm
JUNGLE_GRID_GPU_VENDOR=AMD
AI_FALLBACK_TO_HEURISTIC=false
```

`AI_FALLBACK_TO_HEURISTIC=false` is required for the live AMD path. A fallback
run is intentionally blocked from public publication.

## Local setup

```bash
docker-compose -f infra/docker-compose.yml up -d
pnpm db:generate
pnpm db:migrate
pnpm db:seed
pnpm dev
```

Open the app, sign in with the seeded account documented in
[local-dev.md](../infra/local-dev.md), and choose the bundled public sample.

## Build the ROCm image

The image uses `ollama/ollama:rocm` and runs `/app/run-extraction.sh`, which
starts Ollama and explicitly invokes the selected model with `SUBSTRATA_PROMPT`.

```bash
docker build -t substrata-jungle-grid-inference:rocm infra/jungle-grid-image
```

Before production, resolve and record the pushed image digest in
`JUNGLE_GRID_IMAGE`. Do not call an image AMD-capable unless the selected Grid
provider returns AMD/ROCm placement metadata.

## Verify the live Jungle Grid contract

This creates a billable public-sample test job only after explicit opt-in:

```bash
JUNGLE_GRID_LIVE_TEST_ENABLED=true \
python3 workers/classifier/scripts/live_jungle_grid_smoke.py
```

The command must print a real job ID, provider, GPU vendor/name, runtime
version when supplied, and image digest. It validates the returned structured
extraction contract before succeeding.

## Demo flow

1. Create/select a public datasheet.
2. Select `Jungle Grid` and start the review run.
3. The app returns immediately and shows `Queued`, then `Running`.
4. Open the review. Show the Execution Provenance card with the real job ID.
5. Show extracted technical facts, recommended review paths, citations,
   uncertainty flags, and the classification memo draft.
6. Record a reviewer conclusion. State that human review is required.
7. Publish only a completed, non-fallback, schema-validated run with a real
   execution job ID and public-safe document provenance.

## Known limitations

- Jungle Grid's exact `environment` field must be confirmed against the live
  provider contract before the demo. The mocked contract test verifies the
  Substrata payload and output expectations; the live smoke test verifies the
  provider.
- Exact ECCN identifiers are withheld from the product UI unless their
  regulation source, verification status, version/date, paragraph, fact
  mappings, criteria, and citations are present.
- Filesystem-backed artifacts are acceptable only for a single demo host.
