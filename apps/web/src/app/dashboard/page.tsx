import Link from 'next/link';
import { fetchDocuments } from '../../lib/api';
import { ActionLink, Badge, Panel, Shell, StatCard } from '../../components/ui';
import { ApiNotice, EmptyState } from '../../components/api-state';
import { SampleDatasheetButton } from '../../components/sample-datasheet-button';

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
      eyebrow="Operations Console"
      title="Review queued documents, active runs, and draft classification memos."
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
        <StatCard label="Classification Runs" value={String(totalRuns)} />
        <StatCard label="Pending Human Review" value={String(pendingReviews)} />
        <StatCard
          label="Review Source"
          value={result.fallback ? 'Fallback' : 'Live'}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_22rem]">
        <Panel>
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-ink">Recent documents</h2>
              <p className="text-sm text-slate-500">
                Upload a real PDF or text file, or use the bundled public/sample
                datasheet to demonstrate the memo review workflow.
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
            <div className="space-y-4">
              {documents.map((document) => (
                <Link
                  key={document.id}
                  href={`/documents/${document.id}`}
                  className="block rounded-2xl border border-slate-200 p-4 transition hover:border-steel"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-medium text-ink">{document.title}</p>
                      <p className="mt-1 text-sm text-slate-500">
                        {document.fileName}
                      </p>
                    </div>
                    <Badge tone="warning">
                      {document.classificationRuns?.[0]?.humanReviews?.[0]
                        ?.status ?? 'pending_review'}
                    </Badge>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Panel>

        <Panel>
          <h2 className="text-xl font-semibold text-ink">Review posture</h2>
          <div className="mt-4 space-y-4 text-sm leading-6 text-slate-600">
            <p>Every classification output remains a draft for expert review until a reviewer records an explicit disposition.</p>
            <p>Artifacts, citations, reviewer questions, and memo content are structured as an evidence package rather than a final determination.</p>
          </div>
        </Panel>
      </div>
    </Shell>
  );
}
