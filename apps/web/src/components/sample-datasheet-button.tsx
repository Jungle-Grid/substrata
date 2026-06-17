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
        className="inline-flex items-center rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-ink transition hover:border-steel disabled:opacity-50"
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
                  : 'Sample datasheet creation failed.',
              );
            }
          });
        }}
      >
        {isPending ? 'Preparing sample datasheet...' : 'Try sample datasheet'}
      </button>
      <p className="text-xs leading-5 text-slate-500">
        Uses a bundled public/sample semiconductor datasheet text file for demo
        purposes.
      </p>
      {error ? (
        <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-900">
          {error}
        </p>
      ) : null}
    </div>
  );
}
