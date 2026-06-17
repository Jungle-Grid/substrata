'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { submitReview } from '../lib/api';

const reviewStatuses = [
  { value: 'pending_review', label: 'Pending review' },
  { value: 'reviewed', label: 'Reviewed' },
  { value: 'needs_more_information', label: 'Needs more information' },
  { value: 'rejected', label: 'Rejected' },
] as const;

export function ReviewActionForm({
  runId,
  defaultStatus,
  defaultNote,
}: {
  runId: string;
  defaultStatus: 'pending_review' | 'reviewed' | 'needs_more_information' | 'rejected';
  defaultNote?: string | null;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState(defaultStatus);
  const [note, setNote] = useState(defaultNote ?? '');
  const [isPending, startTransition] = useTransition();

  return (
    <div className="space-y-4">
      <label className="space-y-2">
        <span className="text-sm font-medium text-ink">Reviewer disposition</span>
        <select
          className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm"
          value={status}
          onChange={(event) =>
            setStatus(
              event.target.value as
                | 'pending_review'
                | 'reviewed'
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
          className="min-h-32 w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Record reasoning, open questions, or follow-up requested from engineering."
        />
      </label>

      {error ? (
        <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-900">
          {error}
        </p>
      ) : null}

      <button
        type="button"
        disabled={isPending}
        className="inline-flex items-center rounded-full bg-ink px-4 py-2 text-sm font-medium text-white transition hover:bg-steel disabled:opacity-50"
        onClick={() => {
          setError(null);
          startTransition(async () => {
            try {
              await submitReview({ runId, status, note });
              router.refresh();
            } catch (reviewError) {
              setError(
                reviewError instanceof Error
                  ? reviewError.message
                  : 'Failed to save review decision.',
              );
            }
          });
        }}
      >
        {isPending ? 'Saving review...' : 'Save review decision'}
      </button>
    </div>
  );
}
