# Classification pipeline research basis

Research snapshot: 2026-07-12. Runtime legal evaluation must use the versioned corpus available during each run; this document is design context, not a frozen substitute for current regulation.

## Authoritative software and AI-pipeline sources

- NIST AI RMF and the Generative AI Profile emphasize lifecycle risk management, measurement, provenance, incident handling, and documentation: https://airc.nist.gov/airmf-resources/airmf/ and https://nvlpubs.nist.gov/nistpubs/ai/NIST.AI.600-1.pdf
- W3C PROV defines interoperable entities, activities, agents, and derivations suitable for a provenance graph: https://www.w3.org/TR/prov-overview/
- JSON Schema and the Zod/Prisma contracts used by this repository support constrained intermediate representations and rejection of malformed provider output: https://json-schema.org/specification and https://zod.dev/
- OWASP guidance treats indirect prompt injection in retrieved/uploaded content as an application-layer threat and recommends instruction/data separation, least privilege, and output validation: https://genai.owasp.org/llmrisk/llm01-prompt-injection/
- Lewis et al., *Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks*, establishes the separation between parametric generation and retrieved non-parametric evidence: https://arxiv.org/abs/2005.11401
- Guo et al., *On Calibration of Modern Neural Networks*, motivates evaluating confidence calibration rather than treating model scores as probabilities: https://proceedings.mlr.press/v70/guo17a.html
- Geifman and El-Yaniv, *Selective Classification for Deep Neural Networks*, formalizes risk/coverage and abstention: https://arxiv.org/abs/1705.08500
- Hypothesis documents property-based and stateful testing; metamorphic tests here additionally assert invariance under renaming, formatting, ordering, duplication, and irrelevant prose: https://hypothesis.readthedocs.io/

Design consequences: use typed stage boundaries; preserve quote-level provenance; keep hypotheses out of primary retrieval; make contradictions and abstention explicit; calibrate with labeled evaluation sets; validate deterministic invariants after every provider; and use document text only as untrusted data.

## Official export-control sources

- BIS publishes the current EAR and Commerce Control List, including Supplement No. 1 to Part 774: https://www.bis.gov/regulations/ear/774
- The official eCFR source for 15 CFR Part 774 is: https://www.ecfr.gov/current/title-15/subtitle-B/chapter-VII/subchapter-C/part-774
- Definitions, including ECCN terminology and cross-references, are in Part 772: https://www.bis.gov/regulations/ear/772
- Current end-use controls, including § 744.23, are in Part 744: https://www.bis.gov/regulations/ear/744
- BIS product guidance and FAQs provide agency guidance distinct from the binding CCL text: https://www.bis.gov/guidance-frequently-asked-questions
- Federal Register rulemaking is the amendment history and effective-date source: https://www.federalregister.gov/agencies/industry-and-security-bureau

Design consequences: the system stores authority, official identifier/URL, paragraph, effective/retrieval dates, corpus version, and content hash. It keeps agency guidance distinct from regulation and internal precedent. If current text was unavailable during a run, regulatory evaluation is `unavailable` and the candidate remains preliminary/incomplete.
