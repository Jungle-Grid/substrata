# Substrata — Evidence-backed ECCN review workups for semiconductor compliance teams

**One-liner:** Substrata turns semiconductor datasheets and company classification history into cited ECCN review memo drafts for human approval.

## Problem

Semiconductor export-control review is document-heavy. Technical facts, prior company decisions, reviewer notes, and control-list interpretation are often scattered across PDFs, spreadsheets, email, and internal systems. Teams repeatedly reconstruct the same workup without a reliable evidence chain.

## Why now

Advanced hardware teams face more complex architectures, accelerating product cycles, and an expanding need to make technical review traceable. The bottleneck is not only finding a possible control path; it is preparing a defensible, review-ready record quickly.

## What we built

Substrata is a compliance workspace for source packages, extracted technical facts, candidate review paths, cited evidence, uncertainty flags, reviewer questions, memo drafts, company history, and audit events.

## Demo workflow

Upload a datasheet, start a review, inspect source-grounded facts and candidate review paths, compare relevant company history, review the memo draft, and record a qualified reviewer conclusion.

## How it works

The product stores the source package, extracts normalized technical facts, routes those facts through deterministic review logic, and generates a cited review-ready memo draft. Local mode uses Gemma plus the deterministic engine; Remote mode routes to a configured provider internally. See [Technical architecture](TECHNICAL_ARCHITECTURE.md).

## AMD integration

AMD/ROCm-capable execution is a prototype and hackathon-oriented path for structured extraction workloads. It is not presented as a production deployment claim. See [AMD integration](AMD_INTEGRATION.md).

## Why it matters

The output is a faster, more consistent workup: reviewers can see which source facts support each candidate review path and what remains uncertain.

## Compliance and human review

Substrata is a decision-support workspace. Drafts require qualified human approval before they become an internal conclusion. See [Compliance boundaries](COMPLIANCE_BOUNDARIES.md).

## What is next

We are extending company-history import, parsing quality, reviewer collaboration, export workflows, and enterprise controls. See [Roadmap](ROADMAP.md).

## Closing summary

Substrata is building the compliance workspace for semiconductor export-control review: source-grounded evidence in, human-review-ready memo drafts out.
