# Execution modes

Substrata exposes two execution modes:

- **Local** uses the configured local Gemma model plus the deterministic heuristic engine.
- **Remote** uses the provider router to select the first healthy configured provider in `REMOTE_PROVIDER_PRIORITY` (Jungle Grid, Fireworks, then AMD Notebook manual when explicitly enabled).

Providers are operational details, not user-facing choices. Each run records `executionMode`, `selectedProvider`, provider-selection reason, and fallback state in its classification trace.

`fallbackEnabled` means heuristic fallback is permitted. `fallbackUsed` means the selected provider actually failed and the deterministic fallback produced the run. Remote execution never silently switches to the local Gemma provider.

Set `LOCAL_GEMMA_ENABLED=true` for Local. The AMD notebook default is `LOCAL_GEMMA_RUNTIME=transformers`, which loads `google/gemma-4-E4B-it` directly through PyTorch ROCm (`LOCAL_GEMMA_DEVICE=cuda`, `LOCAL_GEMMA_ATTENTION=eager`) and keeps the model in worker memory between calls. No Ollama service is required for that runtime.

Set `LOCAL_GEMMA_RUNTIME=ollama` to use an existing Ollama-compatible endpoint instead; configure `LOCAL_GEMMA_MODEL` and `LOCAL_GEMMA_BASE_URL` in that case. Configure remote provider flags and credentials before selecting Remote.
