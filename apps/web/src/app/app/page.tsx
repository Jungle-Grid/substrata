import Link from 'next/link';
import { AppShell } from '../../components/app-shell';
import { Icon } from '../../components/icon';
import { ActionLink, EmptyState, MetricCard, Panel, SectionHeader, StatusBadge } from '../../components/ui';
import { requireCompletedOnboarding } from '../../lib/server-auth';
import {
  fetchServerAuditLog,
  fetchServerCompanyHistoryBatches,
  fetchServerDocuments,
  fetchServerReviewQueue,
  fetchServerRuns,
} from '../../lib/server-api';
import { formatDateTime } from '../../lib/workspace';

export default async function AppOverviewPage() {
  const session = await requireCompletedOnboarding('/app');
  const [documents, reviewQueue, audit, runs, history] = await Promise.all([
    fetchServerDocuments(),
    fetchServerReviewQueue(),
    fetchServerAuditLog(),
    fetchServerRuns(),
    fetchServerCompanyHistoryBatches(),
  ]);
  const openUncertaintyFlags = runs.reduce((count, run) => count + run.uncertaintyFlags.length, 0);
  const memoCount = runs.filter((run) => Boolean(run.reviewMemo?.contentMarkdown)).length;
  const approvedCount = runs.filter((run) => run.reviewStatus === 'approved' || run.humanReviewStatus === 'approved').length;
  const historyFileCount = history.batches.reduce((count, batch) => count + batch.fileCount, 0);
  const reviewerQuestions = runs
    .flatMap((run) => run.reviewPaths.flatMap((path) => path.reviewerQuestions.map((question) => ({ run, question, path: path.title }))))
    .slice(0, 4);

  return (
    <AppShell
      session={session}
      currentPath="/app"
      title="Workspace overview"
      description="Track review-ready workups, bottlenecks, reviewer actions, and recent audit activity across the compliance workspace."
      actions={<Link href="/app/documents/new" className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"><Icon name="plus" size={17} /> New classification</Link>}
    >
      {documents.length === 0 ? (
        <EmptyState
          icon="clipboard-check"
          title="Start your first classification review"
          body="Upload a source package, extract source-grounded technical facts, and prepare an evidence-backed ECCN review memo for human approval."
          action={<ActionLink href="/app/documents/new">Create first classification</ActionLink>}
        />
      ) : (
        <div className="space-y-6">
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
            <MetricCard label="Documents uploaded" value={documents.length} hint="Organization source packages" icon="file-text" />
            <MetricCard label="Awaiting review" value={reviewQueue.length} hint="Human decision required" icon="inbox" tone={reviewQueue.length ? 'amber' : 'slate'} />
            <MetricCard label="Memos generated" value={memoCount} hint="Review-ready drafts" icon="file-search" tone="blue" />
            <MetricCard label="History records" value={historyFileCount} hint="Internal comparison material" icon="history" />
            <MetricCard label="Open uncertainty flags" value={openUncertaintyFlags} hint="Needs evidence or reviewer input" icon="activity" tone={openUncertaintyFlags ? 'amber' : 'slate'} />
            <MetricCard label="Approved workups" value={approvedCount} hint="Approved for internal use" icon="check-circle" tone="green" />
          </section>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(22rem,0.8fr)]">
            <div className="space-y-6">
              <Panel>
                <SectionHeader
                  eyebrow="Human review queue"
                  title="Reviews awaiting human decision"
                  description="Prioritize the evidence packages that need qualified reviewer confirmation, clarification, or signoff."
                  action={<Link href="/app/review-queue" className="inline-flex items-center gap-1 text-sm font-semibold text-slate-700 hover:text-slate-950">Open queue <Icon name="arrow-up-right" size={15} /></Link>}
                />
                {reviewQueue.length === 0 ? <div className="mt-5"><EmptyState icon="check-circle" title="Nothing is waiting for review" body="Completed workups that require a human decision appear here." /></div> : (
                  <div className="mt-5 divide-y divide-slate-100">
                    {reviewQueue.slice(0, 5).map((run) => (
                      <div key={run.id} className="flex flex-col gap-3 py-4 first:pt-0 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex min-w-0 gap-3">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-700"><Icon name="clipboard-check" size={18} /></span>
                          <div className="min-w-0"><Link href={`/app/reviews/${run.id}`} className="block truncate font-semibold text-slate-950 hover:underline">{run.document.title}</Link><p className="mt-1 text-sm text-slate-500">{run.reviewPaths.length} review paths · {run.uncertaintyFlags.length} uncertainty flags · {run.humanReviews[0]?.reviewer?.name ?? 'Unassigned'}</p></div>
                        </div>
                        <div className="flex shrink-0 items-center gap-3"><StatusBadge status={run.reviewStatus ?? run.humanReviewStatus} /><Link href={`/app/reviews/${run.id}`} className="text-sm font-semibold text-slate-700 hover:text-slate-950">Open review</Link></div>
                      </div>
                    ))}
                  </div>
                )}
              </Panel>

              <Panel>
                <SectionHeader eyebrow="Recent workups" title="Classification runs" description="Latest source packages, recommendation state, and memo readiness." action={<Link href="/app/reviews" className="text-sm font-semibold text-slate-700 hover:text-slate-950">View all reviews</Link>} />
                <div className="mt-5 grid gap-3 md:grid-cols-2">
                  {runs.slice(0, 4).map((run) => <Link key={run.id} href={`/app/reviews/${run.id}`} className="rounded-lg border border-slate-200 p-4 transition hover:border-slate-300 hover:bg-slate-50"><div className="flex items-start justify-between gap-3"><span className="flex h-8 w-8 items-center justify-center rounded-md bg-sky-50 text-sky-700"><Icon name="file-search" size={16} /></span><StatusBadge status={run.reviewStatus ?? run.humanReviewStatus} /></div><p className="mt-4 truncate font-semibold text-slate-950">{run.document.title}</p><p className="mt-1 text-xs text-slate-500">{run.eccnCandidates.length} candidate paths · updated {formatDateTime(run.completedAt ?? run.createdAt)}</p></Link>)}
                </div>
              </Panel>

              <Panel>
                <SectionHeader eyebrow="Open reviewer questions" title="Evidence still needed" description="Question prompts surfaced by recommended review paths." />
                {reviewerQuestions.length ? <div className="mt-4 space-y-3">{reviewerQuestions.map(({ run, question, path }, index) => <Link key={`${run.id}-${index}`} href={`/app/reviews/${run.id}`} className="flex gap-3 rounded-lg border border-slate-200 p-3 transition hover:border-slate-300 hover:bg-slate-50"><span className="mt-0.5 text-amber-600"><Icon name="activity" size={17} /></span><div><p className="text-sm font-medium text-slate-800">{question}</p><p className="mt-1 text-xs text-slate-500">{path} · {run.document.title}</p></div></Link>)}</div> : <div className="mt-5"><EmptyState icon="check-circle" title="No open reviewer questions" body="New questions will appear as workups identify missing evidence." /></div>}
              </Panel>
            </div>

            <div className="space-y-6">
              <Panel>
                <SectionHeader eyebrow="Recent intake" title="Recently uploaded documents" action={<Link href="/app/documents" className="text-sm font-semibold text-slate-700 hover:text-slate-950">Open documents</Link>} />
                <div className="mt-4 space-y-2">{documents.slice(0, 5).map((document) => <Link key={document.id} href={`/app/documents/${document.id}`} className="flex items-center gap-3 rounded-lg p-2.5 transition hover:bg-slate-50"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-600"><Icon name="file-text" size={16} /></span><div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-900">{document.title}</p><p className="truncate text-xs text-slate-500">{document.fileName}</p></div></Link>)}</div>
              </Panel>
              <Panel>
                <SectionHeader eyebrow="Workspace health" title="Evidence coverage" />
                <div className="mt-4 space-y-4 text-sm"><div className="flex items-center justify-between"><span className="text-slate-600">History library</span><span className="font-semibold text-slate-950">{historyFileCount ? `${historyFileCount} indexed sources` : 'Not imported'}</span></div><div className="h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-sky-500" style={{ width: historyFileCount ? '76%' : '8%' }} /></div><div className="flex items-center justify-between"><span className="text-slate-600">Human-review coverage</span><span className="font-semibold text-slate-950">{runs.length ? `${approvedCount} of ${runs.length} approved` : 'No workups'}</span></div><div className="h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-emerald-500" style={{ width: runs.length ? `${Math.max(8, Math.round((approvedCount / runs.length) * 100))}%` : '8%' }} /></div><p className="rounded-lg bg-slate-50 p-3 text-xs leading-5 text-slate-600">Substrata keeps source-grounded facts, cited review paths, uncertainty flags, and reviewer decisions connected in the audit-ready trail.</p></div>
              </Panel>
              <Panel>
                <SectionHeader eyebrow="Audit-ready trail" title="Recent activity" action={<Link href="/app/audit-log" className="text-sm font-semibold text-slate-700 hover:text-slate-950">View log</Link>} />
                <div className="mt-4 space-y-4">{audit.events.slice(0, 5).map((event) => <div key={event.id} className="relative flex gap-3"><span className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500"><Icon name="activity" size={13} /></span><div className="min-w-0"><p className="truncate text-sm font-medium text-slate-800">{event.action.replace(/_/g, ' ')}</p><p className="mt-0.5 text-xs text-slate-500">{event.actorUser?.name ?? event.actor} · {formatDateTime(event.createdAt)}</p></div></div>)}</div>
              </Panel>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
