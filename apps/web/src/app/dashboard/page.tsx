import Link from 'next/link';
import { fetchDocuments } from '../../lib/api';
import { ActionLink, Badge, Panel, Shell, StatCard } from '../../components/ui';
import { ApiNotice, EmptyState } from '../../components/api-state';
import { SampleDatasheetButton } from '../../components/sample-datasheet-button';

function reviewStatusLabel(status?: string) {
  if (!status || status === 'pending_review') {
    return 'Needs human review';
  }
  if (status === 'approved' || status === 'reviewed') {
    return 'Approved';
  }
  if (status === 'needs_more_information') {
    return 'Blocked';
  }
  return status.replace(/_/g, ' ');
}

function runStatusLabel(status?: string) {
  if (!status) {
    return 'Uploaded';
  }
  if (status === 'completed') {
    return 'Memo drafted';
  }
  if (status === 'running' || status === 'processing') {
    return 'Facts extracting';
  }
  if (status === 'queued' || status === 'pending') {
    return 'Uploaded';
  }
  if (status === 'failed') {
    return 'Needs attention';
  }
  return status.replace(/_/g, ' ');
}

export default async function DashboardPage() {
  const result = await fetchDocuments();
  const documents = result.data ?? [];
  const totalRuns = documents.reduce(
    (count, document) => count + (document.classificationRuns?.length ?? 0),
    0,
  );
  const pendingReviews = documents.reduce(
    (count, document) =>
      count +
      (document.classificationRuns?.filter(
        (run) => !['reviewed', 'approved'].includes(run.humanReviews?.[0]?.status ?? ''),
      ).length ?? 0),
    0,
  );

  return (
    <Shell
      eyebrow="Compliance workspace"
      title="Documents, memo drafts, review paths, and human review status."
    >
      <ApiNotice fallback={result.fallback} error={result.error} />
      {!result.fallback && result.error ? (
        <EmptyState
          title="Dashboard unavailable"
          body={result.error}
        />
      ) : null}
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Documents" value={String(documents.length)} />
        <StatCard label="Review runs" value={String(totalRuns)} />
        <StatCard label="Human review queue" value={String(pendingReviews)} />
        <StatCard
          label="Data source"
          value={result.fallback ? 'Fallback' : 'Live'}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_22rem]">
        <Panel className="p-0">
          <div className="flex flex-col gap-4 border-b border-slate-200 px-5 py-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-ink">Document review queue</h2>
              <p className="mt-1 text-sm text-slate-500">
                Sample/dev data is labeled through the fallback notice when the local API is unavailable.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <ActionLink href="/documents/new">New upload</ActionLink>
              <SampleDatasheetButton />
            </div>
          </div>
          {documents.length === 0 ? (
            <EmptyState
              title="No documents yet"
              body="Create a document from the upload page, then start a classification run."
            />
          ) : (
            <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full border-collapse text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-[0.14em] text-slate-500">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Document</th>
                    <th className="px-5 py-3 font-semibold">Memo status</th>
                    <th className="px-5 py-3 font-semibold">Human review</th>
                    <th className="px-5 py-3 font-semibold">Uncertainty</th>
                    <th className="px-5 py-3 font-semibold">Audit record</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {documents.map((document) => {
                    const latestRun = document.classificationRuns?.[0];
                    const reviewStatus = latestRun?.humanReviews?.[0]?.status;

                    return (
                      <tr key={document.id} className="bg-white hover:bg-slate-50">
                        <td className="px-5 py-4">
                          <Link
                            href={`/documents/${document.id}`}
                            className="font-semibold text-ink hover:text-steel focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-steel"
                          >
                            {document.title}
                          </Link>
                          <p className="mt-1 text-xs text-slate-500">{document.fileName}</p>
                        </td>
                        <td className="px-5 py-4">
                          <Badge tone={latestRun?.status === 'completed' ? 'success' : 'default'}>
                            {runStatusLabel(latestRun?.status)}
                          </Badge>
                        </td>
                        <td className="px-5 py-4">
                          <Badge tone={reviewStatus === 'approved' || reviewStatus === 'reviewed' ? 'success' : 'warning'}>
                            {reviewStatusLabel(reviewStatus)}
                          </Badge>
                        </td>
                        <td className="px-5 py-4 text-slate-600">
                          {latestRun?.uncertaintyFlags?.length
                            ? `${latestRun.uncertaintyFlags.length} flags`
                            : 'No flags yet'}
                        </td>
                        <td className="px-5 py-4 text-slate-600">
                          {latestRun ? 'Run + memo artifacts' : 'Document uploaded'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="divide-y divide-slate-200 md:hidden">
              {documents.map((document) => {
                const latestRun = document.classificationRuns?.[0];
                const reviewStatus = latestRun?.humanReviews?.[0]?.status;

                return (
                  <article key={document.id} className="space-y-4 px-5 py-4">
                    <div>
                      <Link
                        href={`/documents/${document.id}`}
                        className="font-semibold text-ink hover:text-steel focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-steel"
                      >
                        {document.title}
                      </Link>
                      <p className="mt-1 text-xs text-slate-500">{document.fileName}</p>
                    </div>
                    <dl className="grid gap-3 text-sm">
                      <div className="flex items-center justify-between gap-4">
                        <dt className="text-xs uppercase tracking-[0.14em] text-slate-500">Memo</dt>
                        <dd>
                          <Badge tone={latestRun?.status === 'completed' ? 'success' : 'default'}>
                            {runStatusLabel(latestRun?.status)}
                          </Badge>
                        </dd>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <dt className="text-xs uppercase tracking-[0.14em] text-slate-500">Human review</dt>
                        <dd>
                          <Badge tone={reviewStatus === 'approved' || reviewStatus === 'reviewed' ? 'success' : 'warning'}>
                            {reviewStatusLabel(reviewStatus)}
                          </Badge>
                        </dd>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <dt className="text-xs uppercase tracking-[0.14em] text-slate-500">Uncertainty</dt>
                        <dd className="text-slate-600">
                          {latestRun?.uncertaintyFlags?.length
                            ? `${latestRun.uncertaintyFlags.length} flags`
                            : 'No flags yet'}
                        </dd>
                      </div>
                    </dl>
                  </article>
                );
              })}
            </div>
            </>
          )}
        </Panel>

        <Panel>
          <h2 className="text-lg font-semibold text-ink">Workspace posture</h2>
          <div className="mt-4 space-y-4 text-sm leading-6 text-slate-600">
            <p>
              Substrata prepares evidence-backed recommendations, cited review paths, and classification memo drafts for compliance review.
            </p>
            <p>
              Each run keeps extracted technical facts, uncertainty flags, memo artifacts, reviewer notes, and audit trail context together.
            </p>
          </div>
          <div className="mt-5 space-y-2 border-t border-slate-200 pt-4 text-sm">
            {['Uploaded', 'Facts extracted', 'Review paths generated', 'Memo drafted', 'Needs human review'].map((status) => (
              <div key={status} className="grid grid-cols-[0.75rem_1fr] items-center gap-3">
                <span className="h-2 w-2 rounded-full bg-steel" aria-hidden="true" />
                <span className="text-slate-600">{status}</span>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </Shell>
  );
}
