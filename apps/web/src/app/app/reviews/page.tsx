import Link from 'next/link';
import { AppShell } from '../../../components/app-shell';
import { Icon } from '../../../components/icon';
import { EmptyState, Panel, SectionHeader, StatusBadge, TableContainer } from '../../../components/ui';
import { requireCompletedOnboarding } from '../../../lib/server-auth';
import { fetchServerRuns } from '../../../lib/server-api';
import { formatDateTime } from '../../../lib/workspace';

export default async function ReviewsPage({ searchParams }: { searchParams: Promise<{ lifecycle?: 'active' | 'archived' }> }) {
  const session = await requireCompletedOnboarding('/app/reviews');
  const { lifecycle = 'active' } = await searchParams;
  const runs = await fetchServerRuns(lifecycle);
  return (
    <AppShell session={session} currentPath="/app/reviews" title="Classification reviews" description="Case files with source-grounded facts, recommended ECCN review paths, reviewer questions, memo drafts, and audit-ready history." actions={<Link href="/app/documents/new" className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"><Icon name="plus" size={16} /> New classification</Link>}>
      <nav aria-label="Review lifecycle" className="mb-5 flex gap-4 border-b border-slate-200 text-sm font-semibold"><Link href="/app/reviews" className={lifecycle === 'active' ? 'border-b-2 border-slate-900 pb-3 text-slate-950' : 'pb-3 text-slate-500'}>Active reviews</Link><Link href="/app/reviews?lifecycle=archived" className={lifecycle === 'archived' ? 'border-b-2 border-slate-900 pb-3 text-slate-950' : 'pb-3 text-slate-500'}>Archived reviews</Link></nav>
      {runs.length === 0 ? <EmptyState icon="clipboard-check" title={lifecycle === 'archived' ? 'No archived classification reviews' : 'No classification reviews yet'} body="Archived and active review histories are kept separate." /> : <Panel className="p-0"><div className="border-b border-slate-200 px-5 py-4"><SectionHeader eyebrow={lifecycle === 'archived' ? 'Archived case file register' : 'Case file register'} title={`${runs.length} review${runs.length === 1 ? '' : 's'}`} description="Operational state, reviewer ownership, and evidence completeness for each workup." /></div><TableContainer><table className="min-w-full text-left text-sm"><thead className="border-b border-slate-200 bg-slate-50/80 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500"><tr><th className="px-5 py-3">Review case</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Updated</th></tr></thead><tbody className="divide-y divide-slate-100">{runs.map((run) => <tr key={run.id}><td className="px-5 py-4"><Link href={`/app/reviews/${run.id}`} className="font-semibold text-slate-950 hover:underline">{run.document.title}</Link><p className="text-xs text-slate-500">{run.reviewPaths.length} recommended paths</p></td><td className="px-5 py-4"><StatusBadge status={run.status} /></td><td className="px-5 py-4 text-slate-600">{formatDateTime(run.completedAt ?? run.createdAt)}</td></tr>)}</tbody></table></TableContainer></Panel>}
    </AppShell>
  );
}
