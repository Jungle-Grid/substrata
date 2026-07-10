import Link from 'next/link';
import { ActionMenu } from '../../../components/action-menu';
import { AppShell } from '../../../components/app-shell';
import { Icon } from '../../../components/icon';
import { EmptyState, Panel, SectionHeader, StatusBadge, TableContainer } from '../../../components/ui';
import { requireCompletedOnboarding } from '../../../lib/server-auth';
import { fetchServerMemos } from '../../../lib/server-api';
import { formatDateTime } from '../../../lib/workspace';

export default async function MemosPage() {
  const session = await requireCompletedOnboarding('/app/memos');
  const memos = await fetchServerMemos();

  return (
    <AppShell session={session} currentPath="/app/memos" title="Memos" description="Formal classification memo drafts prepared from source-grounded facts, cited review paths, uncertainty flags, and reviewer context.">
      {memos.length === 0 ? <EmptyState icon="file-search" title="No memo drafts yet" body="Generated human-review-ready memo drafts appear after a classification workup completes." /> : (
        <Panel className="p-0"><div className="border-b border-slate-200 px-5 py-4"><SectionHeader eyebrow="Formal work product" title={`${memos.length} memo draft${memos.length === 1 ? '' : 's'}`} description="Open a memo to inspect its evidence package, reviewer status, and supporting source document." /></div><TableContainer><table className="min-w-full text-left text-sm"><thead className="border-b border-slate-200 bg-slate-50/80 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500"><tr><th className="px-5 py-3">Memo draft</th><th className="px-5 py-3">Review state</th><th className="px-5 py-3">Generated</th><th className="px-5 py-3">Updated</th><th className="w-12 px-3 py-3" /></tr></thead><tbody className="divide-y divide-slate-100">{memos.map((memo) => <tr key={memo.id} className="transition hover:bg-slate-50/70"><td className="px-5 py-4"><div className="flex items-center gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-sky-700"><Icon name="file-search" size={17} /></span><div className="min-w-0"><Link href={`/app/reviews/${memo.classificationRunId}`} className="block max-w-[30rem] truncate font-semibold text-slate-950 hover:underline">{memo.documentTitle}</Link><p className="mt-0.5 max-w-[30rem] truncate text-xs text-slate-500">{memo.documentFileName}</p></div></div></td><td className="px-5 py-4"><StatusBadge status={memo.humanReviewStatus} /></td><td className="px-5 py-4 text-slate-600">Version {memo.versionNumber ?? 1}</td><td className="px-5 py-4 text-slate-600">{formatDateTime(memo.updatedAt)}</td><td className="px-3 py-4"><ActionMenu items={[{ label: 'Open memo draft', href: `/app/reviews/${memo.classificationRunId}` }, { label: 'Open source document', href: `/app/documents/${memo.documentId}` }]} /></td></tr>)}</tbody></table></TableContainer></Panel>
      )}
    </AppShell>
  );
}
