<div align="center">
  <a href="https://github.com/Jungle-Grid/substrata">
    <img src="../apps/web/public/brand/substrata-logo.png" alt="Substrata logo" width="160">
  </a>

  <h1>Substrata Documentation</h1>

  <p><strong>Evidence-backed ECCN review workups for semiconductor and advanced hardware teams.</strong></p>
</div>

This documentation explains how Substrata turns source packages and company history into extracted technical facts, cited review paths, uncertainty flags, and human-review-ready classification memo drafts.

## Start here

- [Repository README](../README.md) — local setup and project overview
- [Architecture](ARCHITECTURE.md) — application, API, worker, storage, and tenancy boundaries
- [Execution modes](EXECUTION_MODES.md) — Local Gemma execution and Remote provider routing

## Product and workflow

- [Product](PRODUCT.md) — product thesis, user workflow, and MVP boundaries
- [Evidence and decision model](EVIDENCE_AND_DECISION_MODEL.md) — source document through human signoff and audit record
- [Hybrid classification engine](HYBRID_CLASSIFICATION_ENGINE.md) — deterministic review routing and optional model assistance
- [Human review policy](HUMAN_REVIEW_POLICY.md) — mandatory qualified review requirements
- [Compliance scope](COMPLIANCE_SCOPE.md) — product boundaries and operating assumptions

## Engineering and operations

- [API](API.md) — initial API contract
- [Data model](DATA_MODEL.md) — core entities and audit structure
- [Worker design](WORKER_DESIGN.md) — classifier worker pipeline
- [Security](SECURITY.md) — sensitive-document handling assumptions
- [Jungle Grid integration](JUNGLE_GRID_INTEGRATION.md) — managed execution direction

## Planning and validation

- [Roadmap](ROADMAP.md) — staged product evolution
- [Validation plan](VALIDATION_PLAN.md) — one-week market validation plan
- [Public demo runbook](PUBLIC_DEMO_RUNBOOK.md) — controlled public-sharing workflow

Human review is required for every classification output. Substrata prepares review-ready workups; it does not replace qualified compliance judgment.
