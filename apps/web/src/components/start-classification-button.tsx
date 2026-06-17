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
      <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm font-medium leading-6 text-amber-950">
        For early validation, please use public datasheets only. Do not upload
        confidential or proprietary documents.
      </p>
      <button
        type="button"
        disabled={isPending}
        className="inline-flex items-center rounded-full bg-ink px-4 py-2 text-sm font-medium text-white transition hover:bg-steel disabled:opacity-50"
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
                  : 'Classification run failed.',
              );
            }
          });
        }}
      >
        {isPending ? 'Generating draft memo...' : 'Start classification run'}
      </button>
      {error ? (
        <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-900">
          {error}
        </p>
      ) : null}
    </div>
  );
}
