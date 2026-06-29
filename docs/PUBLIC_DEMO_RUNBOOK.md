# Public Demo Runbook

Substrata supports one controlled public demo run at a time. The public demo uses the existing canonical route format:

- `/classification-runs/:runId`

The public preview is read-only and anonymous only for the actively published demo run. All other runs remain private behind the normal workspace authorization checks.

## Production Admin Configuration

Configure the first production demo admin with both of the following:

1. Add the internal operator email to `PUBLIC_DEMO_ADMIN_EMAILS`.
2. Ensure that same user has an `OWNER` or `ADMIN` membership in the internal Substrata workspace.

## Safety Rules

- Never publish a run by default.
- Publish only source PDFs that are public, non-confidential, and legally shareable.
- Do not publish confidential, customer, personal, export-controlled, or otherwise sensitive documents.
- Review the classification output before publishing.
- Use the required public-sharing attestation before confirming publication.

## Publish the First Demo

1. Deploy the Prisma migration and application code.
2. Sign in as a configured public demo admin.
3. Open the completed run at `/app/reviews/cmqj7n97d003vmw10si9skovh`.
4. Review the extracted technical facts, recommended review paths, citations, uncertainty flags, and classification memo draft.
5. Click `Publish as public demo`.
6. Confirm the attestation:
   `I confirm this document and its classification output are approved for public sharing and contain no confidential, personal, customer, export-controlled, or sensitive information.`
7. Save any optional public title, summary, or source document display name overrides and confirm publication.
8. Verify the canonical public URL in an incognito browser:
   `https://substrata.junglegrid.dev/classification-runs/cmqj7n97d003vmw10si9skovh`

## Replace or Unpublish Later

1. Sign in as a configured public demo admin.
2. Open another completed run and publish it to replace the current public demo, or return to the current live run and click `Unpublish demo`.
3. Re-test the active public URL in an incognito browser.
4. Confirm that previously published canonical URLs now return a clean public not-found state unless they are the currently active demo.
