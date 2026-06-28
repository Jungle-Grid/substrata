'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState, useTransition } from 'react';
import { fetchCsrfToken, submitReview } from '../lib/api';
import { ConfirmationDialog } from './confirmation-dialog';
import { InlineNotice } from './ui';

const reviewStatuses = [
  { value: 'pending_review', label: 'Needs human review' },
  { value: 'approved', label: 'Approved' },
  { value: 'needs_more_information', label: 'Needs more information' },
  { value: 'rejected', label: 'Escalated for review' },
] as const;

export function ReviewActionForm({
  runId,
  defaultStatus,
  defaultNote,
  canReview,
}: {
  runId: string;
  defaultStatus:
    | 'pending_review'
    | 'approved'
    | 'needs_more_information'
    | 'rejected';
  defaultNote?: string | null;
  canReview: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [status, setStatus] = useState(defaultStatus);
  const [note, setNote] = useState(defaultNote ?? '');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const selectedLabel = useMemo(
    () => reviewStatuses.find((option) => option.value === status)?.label ?? 'Review decision',
    [status],
  );

  if (!canReview) {
    return (
      <InlineNotice tone="warning" title="Reviewer access required">
        Only owners, admins, and reviewers can record a human review disposition.
      </InlineNotice>
    );
  }

  return (
    <div className="space-y-4">
      <label className="space-y-2">
        <span className="text-sm font-medium text-ink">Reviewer disposition</span>
        <select
          className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-950 focus:ring-2 focus:ring-slate-200"
          value={status}
          onChange={(event) =>
            setStatus(
              event.target.value as
                | 'pending_review'
                | 'approved'
                | 'needs_more_information'
                | 'rejected',
            )
          }
        >
          {reviewStatuses.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <label className="space-y-2">
        <span className="text-sm font-medium text-ink">Reviewer note</span>
        <textarea
          className="min-h-32 w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-950 focus:ring-2 focus:ring-slate-200"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Record reasoning, open questions, or follow-up requested from engineering."
        />
      </label>

      <InlineNotice tone="default" title="Human review record">
        Saving this updates the review-ready memo posture and audit trail. It does not present an automated final legal determination.
      </InlineNotice>

      {error ? <InlineNotice tone="error">{error}</InlineNotice> : null}
      {message ? <InlineNotice tone="success">{message}</InlineNotice> : null}

      <button
        type="button"
        disabled={isPending}
        className="inline-flex items-center rounded-lg bg-ink px-4 py-2.5 text-sm font-medium text-white transition hover:bg-steel disabled:opacity-50"
        onClick={() => {
          setError(null);
          setMessage(null);
          setConfirmOpen(true);
        }}
      >
        {isPending ? 'Saving review...' : 'Save review decision'}
      </button>

      <ConfirmationDialog
        open={confirmOpen}
        title={`Confirm: ${selectedLabel}`}
        description="This records a human review disposition for the current run and updates the organization audit trail."
        confirmLabel="Record decision"
        pending={isPending}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => {
          setError(null);
          setMessage(null);
          startTransition(async () => {
            try {
              await submitReview({
                runId,
                status,
                note,
                csrfToken: await fetchCsrfToken(),
              });
              setConfirmOpen(false);
              setMessage('Review decision saved.');
              router.refresh();
            } catch (reviewError) {
              setConfirmOpen(false);
              setError(
                reviewError instanceof Error
                  ? reviewError.message
                  : 'Review decision was not saved.',
              );
            }
          });
        }}
      />
    </div>
  );
}
