# Authenticated Lifecycle Validation

Manual frontend validation requires execution by a person with an authenticated
browser session. Use only an audit-only workspace and records created for this
check; do not use customer documents or a production workspace.

## Prerequisites

1. Start the installed API and web applications with the configured local URLs:
   `http://localhost:4000` and `http://localhost:3000`.
2. Sign in as an organization owner or administrator in a dedicated audit-only
   organization.
3. Create two disposable source documents, one terminal review run with two
   artifacts, one local queued/run-in-progress test run, and one remote-linked
   run. Record their IDs in the table below.
4. Record identifiers: organization `_____`, document A `_____`, document B `_____`,
   terminal run `_____`, sibling run `_____`, local run `_____`, remote run `_____`,
   artifact A `_____`, artifact B `_____`.
5. Obtain the CSRF token from `GET /v1/auth/me`; browser requests supply it as
   `x-csrf-token` through the application client.

## Lifecycle walkthrough

| Area | Page / action | Expected UI message / result | API status | PASS | FAIL | Screenshot |
|---|---|---|---:|---|
| Document | `/app/documents`: open Active then Archived | Lists are separate; active is default | 200 | | | |
| Document | Open an active document, choose Archive | Reversible archive confirmation; no success before response | 200 | | | |
| Document | Refresh Active and Archived | Document leaves Active and appears Archived; no stale content | 200 | | | |
| Document | Choose Restore | Document returns to Active | 200 | | | |
| Document | Archive, choose Permanently delete, submit wrong ID | Confirmation mismatch; no success state | 400 | | | |
| Document | Submit exact document ID | Redirect to `/app/documents`; safe redirect and no stale detail | 200 | | | |
| Document | Use the approved failed-cleanup audit fixture, then permanently delete | Error is shown; document remains; no success toast or redirect | 502 | | | |
| Run | `/app/reviews`: open Active then Archived | Histories are separate | 200 | | | |
| Run | Terminal active run: Archive, then Restore | Run moves between matching histories | 200 | | | |
| Run | Archived terminal run: permanent delete with wrong/exact ID | Wrong ID errors; exact ID removes selected run only | 400 / 200 | | | |
| Run | Confirm parent document and sibling run | Parent document and sibling runs remain | 200 | | | |
| Cancellation | Local queued/running run: Cancel run | Confirmed response becomes `cancelled` | 200 | | | |
| Cancellation | Remote-linked run: Cancel run | Visible conflict; not marked cancelled; no false success toast | 409 | | | |
| Artifact | Run Audit tab: Permanently delete artifact | Confirmation and pending state; only selected artifact disappears | 200 | | | |
| Artifact | Forced cleanup failure fixture | `Cleanup failed; retry required`; unknown state never appears successful | 502 | | | |
| Artifact | Retry deletion | Retry shown only after failure; clears on success; parent/sibling remain | 200 | | | |

## Expected safety messages

- Remote cancellation: “Remote cancellation could not be confirmed; the run remains active.”
- Artifact cleanup failure: “Artifact storage cleanup failed; retry is required.”
- Confirmation mismatch: API response says confirmation must match the resource
  identifier.

## Read-only verification queries

Run through the local database connection after recording the audit-only IDs;
never include connection strings in notes.

```sql
SELECT id, "archivedAt" FROM "Document" WHERE id = '<document-id>';
SELECT id, status, "archivedAt", "cancelledAt" FROM "ClassificationRun" WHERE id = '<run-id>';
SELECT id, "deletionAttemptCount", "deletionFailureReason" FROM "Artifact" WHERE "classificationRunId" = '<run-id>';
SELECT action, "entityId" FROM "AuditEvent" WHERE "entityId" IN ('<document-id>', '<run-id>') ORDER BY "createdAt";
```

## Cleanup

Permanently delete eligible audit-only records through the UI. Retain the
minimal audit tombstones. Remove only the temporary local files created for the
audit workspace after confirming their metadata is removed.

Capture the list before/after, each confirmation modal, each error banner/toast,
the post-delete redirect, the failed-cleanup state, and successful retry. Attach
screenshots to the validation record using the identifiers above. A failed expected
cleanup is a pass only when no false success is shown and retry state remains visible.
Afterward permanently delete eligible disposable records through the UI, verify parent
and sibling records remain as expected, retain audit tombstones, and remove only the
temporary local files after their metadata is gone. Leave every PASS/FAIL cell blank
until the browser action is actually performed.
