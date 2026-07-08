# Jungle Grid Execution Image

## Image Reference

Primary image reference:

`ghcr.io/jungle-grid/substrata-jungle-grid-inference:latest`

Versioned image references will also be published by commit SHA from CI:

`ghcr.io/jungle-grid/substrata-jungle-grid-inference:sha-<git-sha>`

## Baked Model

- Model baked into the image: `gemma4:12b`
- Runtime: default `ollama/ollama:latest` image

### Why `gemma4:12b`

This image is intended to be a clear step up from the local `gemma4:e2b` tier already used in the worker.

The current Ollama model page lists `gemma4:12b` as a workstation-tier model and shows the pulled Ollama artifact at roughly 7.6 GB total (7.4 GB model plus 175 MB projector), which is a materially larger deployment target than `gemma4:e2b` while still being a realistic fit for common Jungle Grid GPU placements.

Source:

- Ollama model page: https://ollama.com/library/gemma4:12b

Operational assumption:

- Prefer `gemma4:12b` for first deployment.
- Defer `gemma4:26b` and `gemma4:31b` until Jungle Grid routing is pinned to GPU classes that can absorb the extra memory and latency reliably.

## Runtime Contract

- Exposed port: `11434`
- API shape: standard Ollama HTTP API
- Primary generation endpoint: `POST /api/generate`

Example request:

```bash
curl http://localhost:11434/api/generate \
  -d '{"model":"gemma4:12b","prompt":"Say hello.","stream":false}'
```

## Build and Publish Strategy

The heavy model pull is intentionally expected to happen in GitHub Actions, not on the developer workstation.

The workflow that publishes this image is:

`/.github/workflows/jungle-grid-image.yml`

It builds `infra/jungle-grid-image/Dockerfile` and pushes to GHCR using the repository owner namespace.

## Important Note

This image reference is not yet wired into `jungle_grid_backend.py`'s submit payload. That's separate follow-up work, not part of this step.
