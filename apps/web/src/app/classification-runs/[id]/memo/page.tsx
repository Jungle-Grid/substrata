import Link from 'next/link';
import { fetchRun } from '../../../../lib/api';
import { ApiNotice, EmptyState } from '../../../../components/api-state';
import { MarkdownRenderer } from '../../../../components/markdown-renderer';
import { MemoToolbar } from '../../../../components/memo-toolbar';
import { Panel, Shell } from '../../../../components/ui';

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000';

function memoFileName(fileName: string, title: string) {
  const baseName = fileName
    .replace(/\.[^.]+$/, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
  const fallbackTitle = title
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
  return `substrata-eccn-review-${baseName || fallbackTitle || 'memo'}.md`;
}

export default async function ClassificationRunMemoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await fetchRun(id);
  const run = result.data;

  if (!run) {
    return (
      <Shell eyebrow="Memo Review" title="Memo unavailable">
        <ApiNotice fallback={result.fallback} error={result.error} />
        <EmptyState
          title="Memo unavailable"
          body={result.error ?? 'The requested memo could not be loaded.'}
        />
      </Shell>
    );
  }

  const memoMarkdown = run.reviewMemo?.contentMarkdown ?? null;
  const memoDownloadHref = `${API_BASE}/classification-runs/${run.id}/memo/download`;

  return (
    <Shell
      eyebrow="Memo Review"
      title="ECCN Review Recommendation"
      headerActions={
        <Link
          href={`/classification-runs/${run.id}`}
          className="inline-flex min-h-10 items-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-steel focus-visible:ring-offset-2"
        >
          Back to run
        </Link>
      }
    >
      <ApiNotice fallback={result.fallback} error={result.error} />

      <Panel className="overflow-hidden p-0">
        <div className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 px-5 py-4 backdrop-blur md:px-7">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Recommended review paths
              </p>
              <h2 className="mt-1 text-2xl font-semibold tracking-tight text-ink">
                ECCN Review Recommendation
              </h2>
            </div>
            {memoMarkdown ? (
              <MemoToolbar
                markdown={memoMarkdown}
                downloadFilename={memoFileName(run.document.fileName, run.document.title)}
                downloadHref={memoDownloadHref}
              />
            ) : null}
          </div>
        </div>

        <div className="border-b border-blue-200 bg-blue-50 px-5 py-3 md:px-7">
          <p className="text-sm leading-6 text-steel">
            Classification memo draft prepared for reviewer signoff with evidence and cited review paths.
          </p>
        </div>

        <div className="bg-white px-5 py-7 md:px-8 lg:px-10">
          {run.status === 'failed' ? (
            <div className="rounded-lg border border-rose-200 bg-rose-50 p-5 text-sm leading-6 text-rose-950">
              Memo drafting needs attention for this run. No stale memo content is shown.
            </div>
          ) : memoMarkdown ? (
            <article className="mx-auto max-w-4xl">
              <MarkdownRenderer markdown={memoMarkdown} />
            </article>
          ) : run.status === 'processing' || run.status === 'queued' ? (
            <p className="rounded-lg border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">
              Loading memo preview...
            </p>
          ) : (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-5">
              <p className="font-medium text-ink">Memo has not been generated yet.</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Return to the run detail page to start or inspect the review run.
              </p>
            </div>
          )}
        </div>
      </Panel>
    </Shell>
  );
}
