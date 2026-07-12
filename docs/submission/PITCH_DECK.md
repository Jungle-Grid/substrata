# Substrata pitch deck

This 12-slide, 16:9 presentation is designed for the AMD Developer Hackathon: ACT II Track 3 (Unicorn Track). It maps directly to the published judging criteria: creativity and originality, product/market potential, completeness, and use of AMD platforms.

## Files

- Editable presentation: [`pitch-deck/index.html`](pitch-deck/index.html)
- Submission PDF: [`Substrata-AMD-Track-3-Pitch-Deck.pdf`](Substrata-AMD-Track-3-Pitch-Deck.pdf)

## Talk track

1. **Title — 15 seconds.** “Substrata turns a semiconductor datasheet into a cited, human-review-ready ECCN memo. We prepare the evidence-backed workup a qualified reviewer needs.”
2. **Problem — 25 seconds.** “The facts are in datasheets, institutional context is in old memos and spreadsheets, and uncertainty is buried in email. The bottleneck is assembling a defensible review record.”
3. **Solution — 25 seconds.** “The authenticated product turns a source package into extracted facts, candidate ECCNs, citations, uncertainty flags, and a human-review-ready memo draft.”
4. **Workflow — 30 seconds.** “Upload a source package, extract normalized facts, compare company history, generate gated review paths, draft the memo, and route it to a human review queue.”
5. **Early validation and product progress — 35 seconds.** “Approximately 200 targeted outreach emails have led to around 10 active industry discussions. These conversations validate the problem, shape the functioning product, and identify potential design partners. Anna Goncz’s feedback directly influenced the company-history and precedent workflow; she is a potential design partner or industry adviser in discussion, not a confirmed partner. No paid pilots or formal partnerships are claimed.”
6. **Originality — 30 seconds.** “Models capture technical evidence. A deterministic engine controls routing, missing-evidence gates, and contradictions. A qualified reviewer owns the conclusion.”
7. **AMD use — 35 seconds.** “AMD infrastructure accelerates model-assisted extraction and future document batches. The containerized worker has a stable artifact contract and ROCm-capable path. This is our hackathon execution path, not a production claim.”
8. **Market — 30 seconds.** “Datasheet-to-ECCN is the wedge. The product screenshot shows the organization-scoped company-history library that makes recurring workups more consistent without treating precedent as regulatory authority.”
9. **Why now — 25 seconds.** “Hardware complexity is rising while reviewer capacity and institutional knowledge remain constrained. Open models can structure the evidence when paired with deterministic controls and human approval.”
10. **Roadmap — 25 seconds.** “Substrata is raising $750K for 15–18 months of runway. The round funds production security, expanded rule coverage, expert-reviewed validation, five to ten design partners, three to five paid enterprise pilots, and measurable workflow evidence.”
11. **Team — 25 seconds.** “Nathan brought the original Substrata product direction: turn manual export-control research into a cited, human-review-ready workflow. Benedict brings the AI execution and infrastructure experience behind Jungle Grid. Together, we connect product insight, full-stack delivery, and dependable compute.”
12. **Close — 15 seconds.** “Raising $750K to turn Substrata into the classification system of record for advanced-hardware companies.”

Target delivery: about 5 minutes.

## Export

From the repository root:

```bash
google-chrome \
  --headless \
  --disable-gpu \
  --no-pdf-header-footer \
  --print-to-pdf=docs/submission/Substrata-AMD-Track-3-Pitch-Deck.pdf \
  docs/submission/pitch-deck/index.html
```

The deck uses local HTML/CSS and existing Substrata brand assets. Open the HTML in a browser to edit or review it.

## Typography

- Headlines: Syne SemiBold/Bold
- Body and interface text: DM Sans Regular/Medium
- Numbers and labels: DM Sans Medium
- Technical execution snippets: Space Mono

The official Google Fonts files are stored under `pitch-deck/assets/fonts/` and embedded in the exported PDF. Their Open Font License files are included alongside the fonts.

## Claim boundaries

- AMD/ROCm execution is described as a hackathon/prototype path, consistent with [`AMD_INTEGRATION.md`](AMD_INTEGRATION.md).
- Product screenshots come from an authenticated demo workspace. Counts shown are demo records, not customer traction.
- Approximately 200 targeted outreach emails and approximately 10 active discussions are founder-reported discovery counts. Recipients and participants are not described as users, customers, leads, pilots, partners, revenue, or validated demand.
- Anna Goncz is described only as a potential design partner or industry adviser in discussion. No formal commitment is claimed.
- Team roles are limited to public details supported by the founders’ LinkedIn profiles and Substrata announcement.
- The deck does not claim customers, revenue, existing pilots, measured time savings, a market-size estimate, or production AMD deployment.
- The $750K ask and 15–18-month targets are fundraising goals, not completed traction.
- Substrata is described as an ECCN review assistant and human-review workflow, not a final legal decision-maker.

## Sources

- [`SUBMISSION.md`](SUBMISSION.md)
- [`PRODUCT_BRIEF.md`](PRODUCT_BRIEF.md)
- [`TECHNICAL_ARCHITECTURE.md`](TECHNICAL_ARCHITECTURE.md)
- [`EVIDENCE_MODEL.md`](EVIDENCE_MODEL.md)
- [`AMD_INTEGRATION.md`](AMD_INTEGRATION.md)
- [`ROADMAP.md`](ROADMAP.md)
- [AMD Developer Hackathon: ACT II](https://lablab.ai/ai-hackathons/amd-developer-hackathon-act-ii)
