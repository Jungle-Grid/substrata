import Link from 'next/link';
import { AppShell } from '../../../../components/app-shell';
import { StartClassificationButton } from '../../../../components/start-classification-button';
import { EmptyState, Panel, StatusBadge } from '../../../../components/ui';
import { requireCompletedOnboarding } from '../../../../lib/server-auth';
import { fetchServerDocument } from '../../../../lib/server-api';
import { formatDateTime, formatFileSize } from '../../../../lib/workspace';

export default async function DocumentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireCompletedOnboarding(`/app/documents/${id}`);
  const document = await fetchServerDocument(id);
  const canCreateClassification = session.membership?.role !== 'VIEWER';

  return (
    <AppShell
      session={session}
      currentPath="/app/documents"
      title={document.title}
      description="Review source document details, launch a classification review, and inspect the related memo drafts and human review status."
    >
      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Panel>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            Source document
          </p>
          <p className="mt-3 break-all text-lg font-semibold text-slate-950">{document.fileName}</p>
          <p className="mt-2 text-sm text-slate-600">
            {document.mimeType} / {formatFileSize(document.sizeBytes)} / {document.sourceType} / uploaded {formatDateTime(document.createdAt)}
          </p>
          <div className="mt-6 border-t border-slate-200 pt-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-950">Classification reviews</h2>
              {canCreateClassification ? (
                <StartClassificationButton
                  documentId={document.id}
                  documentOrigin={document.origin}
                  documentVisibility={document.visibility}
                />
              ) : null}
            </div>
            <div className="mt-4 space-y-3">
              {(document.classificationRuns ?? []).length === 0 ? (
                <EmptyState
                  title="No reviews yet"
                  body="Start a classification review to generate extracted facts, recommended review paths, and a memo draft."
                />
              ) : (
                (document.classificationRuns ?? []).map((run) => (
                  <Link
                    key={run.id}
                    href={`/app/reviews/${run.id}`}
                    className="block rounded-lg border border-slate-200 px-4 py-3 transition hover:border-slate-300 hover:bg-slate-50"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium text-slate-950">{run.reviewMemo ? 'Review-ready memo available' : 'Review in progress'}</p>
                        <p className="mt-1 text-sm text-slate-500">
                          {run.reviewPaths.length} recommended review paths / {run.eccnCandidates.length} potential ECCN candidates
                        </p>
                      </div>
                      <StatusBadge status={run.reviewStatus ?? run.humanReviews[0]?.status} />
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
        </Panel>
        <Panel>
          <h2 className="text-lg font-semibold text-slate-950">Review packet posture</h2>
          <div className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
            <p>1. Extracted technical facts stay tied to the uploaded source material.</p>
            <p>2. Recommended ECCN review paths remain cited and uncertainty-aware.</p>
            <p>3. Human review remains required before any internal decision is recorded.</p>
          </div>
        </Panel>
      </div>
    </AppShell>
  );
}
