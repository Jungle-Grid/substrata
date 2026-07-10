import Link from 'next/link';
import { AppShell } from '../../../components/app-shell';
import { Icon } from '../../../components/icon';
import { EmptyState, FilterBar, Panel, StatusBadge } from '../../../components/ui';
import { requireCompletedOnboarding } from '../../../lib/server-auth';
import { fetchServerReviewQueue } from '../../../lib/server-api';
import { formatDateTime } from '../../../lib/workspace';

type SearchParams = Promise<{ tab?: string; reviewer?: string }>;

const tabs = [
  { key: 'needs-review', label: 'Needs review' },
  { key: 'waiting', label: 'Waiting on info' },
  { key: 'signoff', label: 'Ready for signoff' },
  { key: 'approved', label: 'Approved' },
  { key: 'blocked', label: 'Blocked' },
];

export default async function ReviewQueuePage({ searchParams }: { searchParams: SearchParams }) {
  const session = await requireCompletedOnboarding('/app/review-queue');
  const { tab = 'needs-review', reviewer = 'all' } = await searchParams;
  const canReview = ['OWNER', 'ADMIN', 'REVIEWER'].includes(session.membership?.role ?? '');
  const queue = canReview ? await fetchServerReviewQueue() : [];
  const filtered = queue.filter((run) => {
    const reviewState = run.reviewStatus ?? run.humanReviews[0]?.status ?? 'pending_review';
    const matchesTab = tab === 'needs-review' ? !['approved', 'reviewed', 'rejected'].includes(reviewState) : tab === 'waiting' ? reviewState === 'needs_more_information' : tab === 'signoff' ? reviewState === 'reviewed' : tab === 'approved' ? reviewState === 'approved' : run.status === 'blocked' || reviewState === 'rejected';
    const assigned = Boolean(run.humanReviews[0]?.reviewer?.name);
    return matchesTab && (reviewer === 'all' || (reviewer === 'assigned' ? assigned : !assigned));
  });

  return (
    <AppShell session={session} currentPath="/app/review-queue" title="Review queue" description="Classification runs waiting for expert review, clarification, or internal signoff.">
      {!canReview ? <EmptyState icon="shield-check" title="Reviewer access required" body="This queue is limited to owners, admins, and reviewers who can record human review decisions." /> : (
        <div className="space-y-5">
          <div className="flex gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1.5">{tabs.map((item) => <Link key={item.key} href={`/app/review-queue?tab=${item.key}&reviewer=${reviewer}`} className={`shrink-0 rounded-lg px-3 py-2 text-sm font-semibold transition ${tab === item.key ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'}`}>{item.label}{item.key === 'needs-review' ? <span className={`ml-2 rounded-md px-1.5 py-0.5 text-[10px] ${tab === item.key ? 'bg-white/15 text-white' : 'bg-slate-100 text-slate-500'}`}>{queue.length}</span> : null}</Link>)}</div>
          <FilterBar><form action="/app/review-queue" className="flex flex-1 flex-wrap items-center gap-3"><input type="hidden" name="tab" value={tab} /><span className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700"><Icon name="sliders" size={16} /> Filter queue</span><select name="reviewer" defaultValue={reviewer} className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-sky-400"><option value="all">All reviewers</option><option value="assigned">Assigned</option><option value="unassigned">Unassigned</option></select><button type="submit" className="h-10 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">Apply</button></form></FilterBar>
          {filtered.length === 0 ? <EmptyState icon={tab === 'approved' ? 'check-circle' : 'inbox'} title="No reviews in this queue" body="When a classification run reaches this review state, it will appear here with its evidence and reviewer requirements." /> : <div className="space-y-3">{filtered.map((run) => { const questionCount = run.reviewPaths.reduce((count, path) => count + path.reviewerQuestions.length, 0); const latestReview = run.humanReviews[0]; return <Panel key={run.id} className="p-4"><div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"><div className="flex min-w-0 gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-700"><Icon name="clipboard-check" size={19} /></span><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><Link href={`/app/reviews/${run.id}`} className="truncate font-semibold text-slate-950 hover:underline">{run.document.title}</Link><StatusBadge status={run.reviewStatus ?? latestReview?.status} /></div><p className="mt-1 text-sm text-slate-600">{run.reviewPaths[0]?.title ?? 'Review path pending'} · {run.uncertaintyFlags.length} uncertainty flags · {questionCount} reviewer questions</p><p className="mt-1 text-xs text-slate-500">Assigned to {latestReview?.reviewer?.name ?? 'Unassigned'} · updated {formatDateTime(run.completedAt ?? run.createdAt)}</p></div></div><Link href={`/app/reviews/${run.id}`} className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">Open review</Link></div></Panel>; })}</div>}
        </div>
      )}
    </AppShell>
  );
}
