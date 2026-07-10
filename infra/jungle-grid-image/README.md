# Jungle Grid Execution Image

## Image Reference

Primary image reference:

`ghcr.io/jungle-grid/substrata-jungle-grid-inference:rocm`

Versioned image references will also be published by commit SHA from CI:

`ghcr.io/jungle-grid/substrata-jungle-grid-inference:sha-<git-sha>`

## Baked Model

- Model baked into the image: `gemma4:12b`
- Runtime: `ollama/ollama:rocm`. Pin the resolved image digest in production before the demo.

### Why `gemma4:12b`

This image is intended to be a clear step up from the local `gemma4:e2b` tier already used in the worker.

The current Ollama model page lists `gemma4:12b` as a workstation-tier model and shows the pulled Ollama artifact at roughly 7.6 GB total (7.4 GB model plus 175 MB projector), which is a materially larger deployment target than `gemma4:e2b` while still being a realistic fit for common Jungle Grid GPU placements.

Source:

- Ollama model page: https://ollama.com/library/gemma4:12b

Operational assumption:

- Prefer `gemma4:12b` for first deployment.
- Defer `gemma4:26b` and `gemma4:31b` until Jungle Grid routing is pinned to GPU classes that can absorb the extra memory and latency reliably.

## Runtime Contract

- Job entrypoint: `/app/run-extraction.sh`
- Required job environment: `SUBSTRATA_MODEL`, `SUBSTRATA_PROMPT`
- Output: the entrypoint prints the model's structured JSON response to stdout.
- The Substrata worker validates that response before persistence.

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

## Verification

The submitter passes model/prompt in the job `environment` payload and invokes the
entrypoint. Confirm this exact provider contract before the live demo with:

```bash
python3 workers/classifier/scripts/live_jungle_grid_smoke.py
```
