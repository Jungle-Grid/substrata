'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { fetchCsrfToken, startClassificationRun } from '../lib/api';
import { InlineNotice } from './ui';

type ExecutionMode = 'local' | 'remote';
type ExecutionSelection = ExecutionMode | 'workspace_default';

const executionModeLabel: Record<ExecutionMode, string> = {
  local: 'Local',
  remote: 'Remote',
};

export function StartClassificationButton({
  documentId,
  defaultExecutionPreference = 'remote',
}: {
  documentId: string;
  defaultExecutionPreference?: ExecutionMode;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [executionPreference, setExecutionPreference] =
    useState<ExecutionSelection>('workspace_default');
  const [isPending, startTransition] = useTransition();

  return (
    <div className="space-y-3">
      <InlineNotice tone="info" title="Workspace guidance">
        Upload prior classification records, datasheets, technical notes, and review memos. Substrata uses workspace materials to surface relevant internal references during future export-control reviews.
      </InlineNotice>
      <label className="block space-y-2">
        <span className="text-sm font-medium text-slate-900">Execution mode</span>
        <select
          value={executionPreference}
          onChange={(event) =>
            setExecutionPreference(event.target.value as ExecutionSelection)
          }
          disabled={isPending}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 transition hover:border-slate-400 focus:border-steel focus:outline-none focus:ring-2 focus:ring-steel/20 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <option value="workspace_default">Workspace default ({executionModeLabel[defaultExecutionPreference]})</option>
          <option value="local">Local</option>
          <option value="remote">Remote</option>
        </select>
        <span className="block text-xs leading-5 text-slate-500">
          {(executionPreference === 'workspace_default' ? defaultExecutionPreference : executionPreference) === 'local'
            ? 'Run using the local Gemma model and Substrata’s deterministic review engine.'
            : 'Let Substrata choose the best configured remote backend for this review.'}
        </span>
      </label>
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
                executionPreference === 'workspace_default' ? undefined : executionPreference,
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
        {isPending ? 'Queueing review run...' : 'Start review run'}
      </button>
      {error ? (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
          {error}
        </p>
      ) : null}
    </div>
  );
}
