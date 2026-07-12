# Substrata investor pitch deck

This 12-slide, 16:9 presentation is a YC-style pre-seed investor deck. It is intentionally concise, factual, and designed to stand on its own without a spoken presentation.

## Files

- Editable presentation: [`index.html`](index.html)
- Exported PDF: [`Substrata-Investor-Pitch-Deck.pdf`](Substrata-Investor-Pitch-Deck.pdf)
- Product screenshots: [`assets/`](assets/)

## Export

From the repository root:

```bash
google-chrome \
  --headless \
  --disable-gpu \
  --no-pdf-header-footer \
  --print-to-pdf=docs/investor-deck/Substrata-Investor-Pitch-Deck.pdf \
  docs/investor-deck/index.html
```

## Evidence and claim boundaries

- Product screenshots are from an authenticated demo workspace. Counts shown in screenshots are demo records, not customer traction.
- Product and architecture claims are supported by `apps/web`, `apps/api`, `workers/classifier`, `packages/db`, and the submission documentation.
- Test counts come from `SUBSTRATA_TEST_RESULTS.md`: 72/72 lifecycle integration tests, 18/18 API regression tests, and 32/32 worker tests passing on July 11, 2026.
- Founder-reported discovery status: approximately 200 targeted outreach emails and approximately 10 active discussions with relevant industry professionals. These are outreach and discussions, not users, customers, leads, pilots, partnerships, revenue, or validated demand.
- Feedback from Anna Goncz directly influenced the company-history and precedent-based workflow. She is described only as a potential design partner or industry adviser in discussion; no formal commitment is claimed.
- The market slide is explicitly a founder estimate. It uses a sensitivity range of 1,500–3,000 target organizations and $30K–$75K ACV, with a 2,000 × $40K = $80M midpoint. These inputs remain to be validated and are not presented as verified market data.
- Live Gemma and AMD execution remain unverified. The deck claims no paying traction, paid pilots, formal partnerships, customer commitments, revenue, or measured performance improvement.
- Substrata is presented as an ECCN review assistant and compliance workspace. Qualified human review remains mandatory.

## Primary sources

- `SUBSTRATA_TEST_RESULTS.md`
- `SUBSTRATA_AUDIT_REPORT.md`
- `docs/submission/VALIDATION_NOTES.md`
- `docs/submission/PRODUCT_BRIEF.md`
- `docs/submission/TECHNICAL_ARCHITECTURE.md`
- `docs/submission/COMPANY_HISTORY_WORKFLOW.md`
- `docs/EVIDENCE_AND_DECISION_MODEL.md`
- `docs/SECURITY.md`
