import Link from 'next/link';
import { fetchDocument } from '../../../lib/api';
import { ApiNotice, EmptyState } from '../../../components/api-state';
import { StartClassificationButton } from '../../../components/start-classification-button';
import { Badge, Panel, Shell } from '../../../components/ui';

function runStatusLabel(status: string) {
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

function reviewStatusLabel(status?: string) {
  if (!status || status === 'pending_review') {
    return 'Needs human review';
  }
  if (status === 'reviewed' || status === 'approved') {
    return 'Approved';
  }
  if (status === 'needs_more_information') {
    return 'Blocked';
  }
  return status.replace(/_/g, ' ');
}

export default async function DocumentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await fetchDocument(id);
  const document = result.data;

  if (!document) {
    return (
      <Shell eyebrow="Document Detail" title="Document unavailable">
        <ApiNotice fallback={result.fallback} error={result.error} />
        <EmptyState
          title="Document unavailable"
          body={result.error ?? 'The requested document could not be loaded.'}
        />
      </Shell>
    );
  }

  return (
    <Shell eyebrow="Document workspace" title={document.title}>
      <ApiNotice fallback={result.fallback} error={result.error} />
      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <Panel className="p-0">
          <div className="space-y-5">
            <div className="border-b border-slate-200 px-5 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Source document
              </p>
              <p className="mt-2 font-medium text-ink">{document.fileName}</p>
              <p className="mt-2 text-sm text-slate-500">
                {document.mimeType} / {document.sizeBytes ?? 'Not recorded'} bytes / {document.sourceType}
              </p>
              {document.sourceType === 'seed' ? (
                <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  This is a bundled public/sample datasheet for local demo
                  purposes.
                </p>
              ) : null}
            </div>
            <div className="px-5 pb-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-ink">Review runs</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Generated review paths, memo drafts, and human review status.
                  </p>
                </div>
                <StartClassificationButton documentId={document.id} />
              </div>
              {(document.classificationRuns ?? []).length === 0 ? (
                <div className="mt-3">
                  <EmptyState
                    title="No classification runs yet"
                    body="Start a review run to extract technical facts, recommend ECCN review paths, and draft a classification memo."
                  />
                </div>
              ) : (
                <div className="mt-4 divide-y divide-slate-200 rounded-lg border border-slate-200">
                  {(document.classificationRuns ?? []).map((run) => (
                    <Link
                      key={run.id}
                      href={`/classification-runs/${run.id}`}
                      className="block bg-white p-4 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-steel"
                    >
                      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div>
                          <p className="font-medium text-ink">{run.id}</p>
                          <p className="text-sm text-slate-500">
                            {run.eccnCandidates?.length ?? 0} recommended review paths / {run.uncertaintyFlags?.length ?? 0} uncertainty flags
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Badge tone={run.status === 'completed' ? 'success' : 'default'}>
                            {runStatusLabel(run.status)}
                          </Badge>
                          <Badge tone="warning">
                            {reviewStatusLabel(run.humanReviews?.[0]?.status)}
                          </Badge>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Panel>
        <Panel>
          <h2 className="text-lg font-semibold text-ink">Review packet</h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Each run prepares extracted technical facts, evidence-backed recommendations, cited review paths, uncertainty flags, and a classification memo draft.
          </p>
          <div className="mt-5 space-y-3 border-t border-slate-200 pt-4 text-sm text-slate-600">
            <p>1. Facts extracted</p>
            <p>2. Review paths generated</p>
            <p>3. Memo drafted</p>
            <p>4. Human review queue updated</p>
          </div>
        </Panel>
      </div>
    </Shell>
  );
}
