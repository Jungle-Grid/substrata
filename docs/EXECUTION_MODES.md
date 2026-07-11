# Execution modes

Substrata exposes two execution modes:

- **Local** uses the configured local Gemma model plus the deterministic heuristic engine.
- **Remote** uses the provider router to select the first healthy configured provider in `REMOTE_PROVIDER_PRIORITY` (Jungle Grid, Fireworks, then AMD Notebook manual when explicitly enabled).

Providers are operational details, not user-facing choices. Each run records `executionMode`, `selectedProvider`, provider-selection reason, and fallback state in its classification trace.

`fallbackEnabled` means heuristic fallback is permitted. `fallbackUsed` means the selected provider actually failed and the deterministic fallback produced the run. Remote execution never silently switches to the local Gemma provider.

Set `LOCAL_GEMMA_ENABLED=true` and configure `LOCAL_GEMMA_MODEL`/`LOCAL_GEMMA_BASE_URL` for Local. Configure remote provider flags and credentials before selecting Remote.
