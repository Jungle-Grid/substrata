# Validation Plan

## Objective

Validate within one week whether compliance teams care enough about faster datasheet classification drafting to adopt and pay for the workflow.

## Plan

### Fake-Door Demo

Create a polished upload-and-review experience that shows the intended workflow even if some output is manually supported behind the scenes.

### Concierge Workflow

For early pilots, manually inspect uploaded datasheets and improve the draft output by hand where needed. The goal is to learn what evidence and memo quality buyers actually require.

### 10 Compliance Manager Interviews

Interview target users across:

- in-house compliance leads
- trade counsel serving hardware companies
- operations leaders involved in shipment approvals

Focus questions:

- how often does datasheet classification happen
- who is involved
- what slows the work
- what evidence format is required
- how risky is current tooling

### Datasheet Upload Pilot

Ask pilot users to submit a small set of real or sanitized datasheets and compare current process time vs. Substrata-assisted draft time.

### Willingness-to-Pay Tests

Test pricing and packaging assumptions early:

- per-seat expert workflow
- per-document review volume
- annual platform contract with pilot support

## Validation Signals

- users volunteer real documents
- users ask for saved history and review traceability
- users care about memo quality and citations
- buyers discuss procurement path rather than only feature ideas

## Current Product QA Signals

Recent frontend QA for the authenticated workspace focused on:

- auth/session UX across sign-in, sign-up, verify-email, forgot-password, reset-password, and OAuth callback states
- responsive navigation and data surfaces under `/app`
- review-oriented status language such as `Needs human review`, `Needs more information`, and `Escalated for review`
- empty, loading, error, and permission-aware states

Current validated outcomes:

- unauthenticated route protection works for `/app`
- auth pages present intentional validation and recovery states
- raw backend exception text is no longer exposed to users on auth failure

Current validation gap:

- authenticated browser smoke coverage remains blocked until local Postgres connectivity is restored for successful sign-in
