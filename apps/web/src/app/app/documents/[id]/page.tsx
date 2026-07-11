import Link from 'next/link';
import { AppShell } from '../../../../components/app-shell';
import { Icon } from '../../../../components/icon';
import { StartClassificationButton } from '../../../../components/start-classification-button';
import { LifecycleControls } from '../../../../components/lifecycle-controls';
import { EmptyState, Panel, SectionHeader, StatusBadge } from '../../../../components/ui';
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
      actions={<LifecycleControls target="document" id={document.id} archived={Boolean(document.archivedAt)} csrfToken={session.csrfToken} canDelete={session.membership?.role === 'OWNER' || session.membership?.role === 'ADMIN'} />}
    >
      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Panel>
          <div className="flex gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-sky-700"><Icon name="file-text" size={19} /></span><div className="min-w-0"><p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500">Source package</p><p className="mt-1 break-all text-lg font-semibold text-slate-950">{document.fileName}</p><p className="mt-1 text-sm text-slate-600">{document.mimeType} · {formatFileSize(document.sizeBytes)} · {document.sourceType} · uploaded {formatDateTime(document.createdAt)}</p></div></div>
          <div className="mt-6 border-t border-slate-200 pt-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <SectionHeader eyebrow="Related workups" title="Classification reviews" description="Open a case file or generate the first review-ready evidence package." />
              {canCreateClassification && !document.archivedAt ? (
                <StartClassificationButton
                  documentId={document.id}
                  defaultExecutionPreference={session.organization?.defaultExecutionPreference}
                />
              ) : document.archivedAt ? <p className="text-sm font-medium text-amber-800">Archived documents cannot start new classification runs.</p> : null}
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
          <SectionHeader eyebrow="Evidence package" title="Review packet posture" description="What remains visible as this source moves through the review workflow." />
          <div className="mt-5 space-y-4 text-sm leading-6 text-slate-600">
            <div className="flex gap-3"><Icon name="link" size={17} className="mt-1 shrink-0 text-sky-700" /><p>Extracted technical facts stay tied to the uploaded source material.</p></div>
            <div className="flex gap-3"><Icon name="file-search" size={17} className="mt-1 shrink-0 text-sky-700" /><p>Recommended review paths remain cited and uncertainty-aware.</p></div>
            <div className="flex gap-3"><Icon name="shield-check" size={17} className="mt-1 shrink-0 text-sky-700" /><p>Human review remains required before any internal decision is recorded.</p></div>
          </div>
        </Panel>
      </div>
    </AppShell>
  );
}
