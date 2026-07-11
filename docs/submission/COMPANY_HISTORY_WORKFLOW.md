# Company history workflow

## Why company history matters

New reviews are often evaluated in the context of what the company has already reviewed. Prior work contains product-family knowledge, order-code context, reviewer rationale, and consistency signals that are otherwise difficult to recover.

## What history can include

- Prior classifications and review-ready memos
- Approved memos and reviewer notes
- Product families, order codes, and technical records
- Internal decisions and comparison material

## How Substrata uses it

Owners or admins upload organization-scoped history. Ingestion extracts text and creates record-scoped chunks. A current review retrieves relevant chunks, persists exact matches, and presents excerpts and match reasons to the reviewer.

## Consistency without blind precedent

History informs review priority and comparison; it does not automatically determine a new classification or override current technical evidence. Unrelated CSV/JSON rows are kept separate to avoid evidence leakage.

## Human reviewer role

The reviewer decides whether prior material is relevant, verifies any similarity, and records the current conclusion.

## Example workflow

An AX920 accelerator review retrieves an AX900 prior record with a 3A090 history signal. The reviewer compares architecture and performance evidence, confirms the current control path, and does not inherit unrelated networking-card history.
