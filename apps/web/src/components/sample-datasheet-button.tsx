'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { createSampleDocument } from '../lib/api';

export function SampleDatasheetButton() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="space-y-3">
      <button
        type="button"
        disabled={isPending}
        className="inline-flex min-h-10 items-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-ink transition hover:border-steel hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-steel focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        onClick={() => {
          setError(null);
          startTransition(async () => {
            try {
              const document = await createSampleDocument();
              router.push(`/documents/${document.id}`);
            } catch (creationError) {
              setError(
                creationError instanceof Error
                  ? creationError.message
                  : 'Sample datasheet creation did not complete.',
              );
            }
          });
        }}
      >
        {isPending ? 'Preparing sample review...' : 'Run sample review'}
      </button>
      <p className="text-xs leading-5 text-slate-500">
        Uses a bundled public/sample semiconductor datasheet text file for demo
        purposes.
      </p>
      {error ? (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
          {error}
        </p>
      ) : null}
    </div>
  );
}
