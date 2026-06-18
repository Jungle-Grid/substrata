'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { startClassificationRun } from '../lib/api';

export function StartClassificationButton({ documentId }: { documentId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="space-y-3">
      <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium leading-6 text-amber-950">
        Early validation workspace: use public datasheets or sanitized technical text.
      </p>
      <button
        type="button"
        disabled={isPending}
        className="inline-flex min-h-10 items-center rounded-lg bg-ink px-4 text-sm font-semibold text-white transition hover:bg-steel focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-steel focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        onClick={() => {
          setError(null);
          startTransition(async () => {
            try {
              const run = await startClassificationRun(documentId);
              router.push(`/classification-runs/${run.id}`);
            } catch (runError) {
              setError(
                runError instanceof Error
                  ? runError.message
                  : 'Review run did not complete.',
              );
            }
          });
        }}
      >
        {isPending ? 'Generating memo draft...' : 'Start review run'}
      </button>
      {error ? (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
          {error}
        </p>
      ) : null}
    </div>
  );
}
