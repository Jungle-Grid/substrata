'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { fetchCsrfToken, startClassificationRun } from '../lib/api';
import { InlineNotice } from './ui';

type ExecutionPreference = 'local' | 'fireworks' | 'jungle_grid' | 'auto';

export function StartClassificationButton({
  documentId,
  documentOrigin,
  documentVisibility,
}: {
  documentId: string;
  documentOrigin?: string | null;
  documentVisibility?: string | null;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [executionPreference, setExecutionPreference] =
    useState<ExecutionPreference>('auto');
  const [isPending, startTransition] = useTransition();
  const isNonPublicDocument =
    documentOrigin !== 'public' || documentVisibility === 'private';
  const isRemoteOverride =
    isNonPublicDocument &&
    (executionPreference === 'fireworks' || executionPreference === 'jungle_grid');

  return (
    <div className="space-y-3">
      <InlineNotice tone="warning" title="Execution guidance">
        Early validation workspace: use public datasheets or sanitized technical text.
      </InlineNotice>
      <label className="block space-y-2">
        <span className="text-sm font-medium text-slate-900">Execution backend</span>
        <select
          value={executionPreference}
          onChange={(event) =>
            setExecutionPreference(event.target.value as ExecutionPreference)
          }
          disabled={isPending}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 transition hover:border-slate-400 focus:border-steel focus:outline-none focus:ring-2 focus:ring-steel/20 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <option value="auto">Auto (recommended)</option>
          <option value="local">Local</option>
          <option value="fireworks">Fireworks</option>
          <option value="jungle_grid">Jungle Grid</option>
        </select>
      </label>
      {isNonPublicDocument && executionPreference === 'auto' ? (
        <InlineNotice tone="info">
          Auto will prefer local execution for this document because it is not marked public.
        </InlineNotice>
      ) : null}
      {isRemoteOverride ? (
        <InlineNotice tone="warning" title="Remote execution override">
          This document is not marked public. You can still continue, but the selected backend may send source text to a remote execution service.
        </InlineNotice>
      ) : null}
      <button
        type="button"
        disabled={isPending}
        className="inline-flex min-h-10 items-center rounded-lg bg-ink px-4 text-sm font-semibold text-white transition hover:bg-steel focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-steel focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        onClick={() => {
          setError(null);
          startTransition(async () => {
            try {
              const run = await startClassificationRun(
                documentId,
                await fetchCsrfToken(),
                executionPreference,
              );
              router.push(`/app/reviews/${run.id}`);
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
