import Link from 'next/link';
import { ActionMenu } from '../../../components/action-menu';
import { AppShell } from '../../../components/app-shell';
import { CompanyHistoryUploadForm } from '../../../components/company-history-upload-form';
import { Icon } from '../../../components/icon';
import { ActionLink, EmptyState, FilterBar, InlineNotice, MetricCard, Panel, SectionHeader, StatusBadge, TableContainer } from '../../../components/ui';
import { requireCompletedOnboarding } from '../../../lib/server-auth';
import { fetchServerCompanyHistoryBatches } from '../../../lib/server-api';
import { formatDateTime } from '../../../lib/workspace';

type SearchParams = Promise<{ q?: string; status?: string }>;

export default async function CompanyHistoryPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await requireCompletedOnboarding('/app/company-history');
  const [{ q = '', status = 'all' }, { batches }] = await Promise.all([searchParams, fetchServerCompanyHistoryBatches()]);
  const canManage = session.membership?.role === 'OWNER' || session.membership?.role === 'ADMIN';
  const query = q.trim().toLowerCase();
  const filteredBatches = batches.filter((batch) => (status === 'all' || batch.status === status) && (!query || `${batch.name} ${batch.documents.map((document) => document.fileName).join(' ')}`.toLowerCase().includes(query)));
  const totals = batches.reduce((current, batch) => ({ files: current.files + batch.fileCount, indexed: current.indexed + (batch.totals?.indexed ?? 0), failed: current.failed + (batch.totals?.failed ?? 0) }), { files: 0, indexed: 0, failed: 0 });

  return (
    <AppShell
      session={session}
      currentPath="/app/company-history"
      title="Company history"
      description="Approved classifications, reviewer notes, and prior decisions used to ground future company-aware review paths."
      actions={<a href="#import-history" className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"><Icon name="upload" size={16} /> Import history</a>}
    >
      <div className="space-y-6">
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><MetricCard label="Reference batches" value={batches.length} hint="Organized internal imports" icon="archive" /><MetricCard label="Reference files" value={totals.files} hint="Company-controlled materials" icon="file-text" /><MetricCard label="Indexed sources" value={totals.indexed} hint="Available for comparison" icon="history" tone="blue" /><MetricCard label="Needs attention" value={totals.failed} hint="Failed files to reprocess" icon="activity" tone={totals.failed ? 'amber' : 'slate'} /></section>
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(22rem,0.65fr)]">
          <div className="space-y-5">
            <FilterBar>
              <form action="/app/company-history" className="flex flex-1 flex-col gap-3 md:flex-row"><div className="relative flex-1"><Icon name="file-search" size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input name="q" defaultValue={q} placeholder="Search prior decisions, product families, ECCNs, reviewer notes…" className="h-10 w-full rounded-lg border border-slate-200 pl-9 pr-3 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100" /></div><select name="status" defaultValue={status} className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-sky-400"><option value="all">All index states</option><option value="completed">Completed batches</option><option value="processing">Processing</option><option value="failed">Needs attention</option></select><button type="submit" className="h-10 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">Filter</button></form>
            </FilterBar>
            {filteredBatches.length === 0 ? <EmptyState icon="history" title={batches.length ? 'No company history matches these filters' : 'No company history imported yet'} body={batches.length ? 'Try a broader search or choose a different indexing state.' : 'Import prior classifications, reviewer notes, and approved memos so new ECCN reviews can compare against company precedent.'} action={!batches.length && canManage ? <ActionLink href="#import-history">Import company history</ActionLink> : undefined} /> : <Panel className="p-0"><div className="border-b border-slate-200 px-5 py-4"><SectionHeader eyebrow="Internal reference library" title={`${filteredBatches.length} history batch${filteredBatches.length === 1 ? '' : 'es'}`} description="Operational status and source coverage for internal comparison material." /></div><TableContainer><table className="min-w-full text-left text-sm"><thead className="border-b border-slate-200 bg-slate-50/80 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500"><tr><th className="px-5 py-3">History set</th><th className="px-5 py-3">Coverage</th><th className="px-5 py-3">Index state</th><th className="px-5 py-3">Imported</th><th className="w-12 px-3 py-3" /></tr></thead><tbody className="divide-y divide-slate-100">{filteredBatches.map((batch) => <tr key={batch.id} className="transition hover:bg-slate-50/70"><td className="px-5 py-4"><div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-50 text-sky-700"><Icon name="archive" size={17} /></span><div className="min-w-0"><Link href={`/app/company-history/batches/${batch.id}`} className="block max-w-[28rem] truncate font-semibold text-slate-950 hover:underline">{batch.name}</Link><p className="mt-0.5 max-w-[28rem] truncate text-xs text-slate-500">{batch.documents.slice(0, 2).map((document) => document.fileName).join(' · ')}{batch.documents.length > 2 ? ` · +${batch.documents.length - 2} more` : ''}</p></div></div></td><td className="px-5 py-4 text-slate-600"><p>{batch.fileCount} source files</p><p className="mt-0.5 text-xs text-slate-400">{batch.totals?.indexed ?? 0} indexed · {batch.totals?.failed ?? 0} failed</p></td><td className="px-5 py-4"><StatusBadge status={batch.status} /></td><td className="px-5 py-4 text-slate-600">{formatDateTime(batch.createdAt)}</td><td className="px-3 py-4"><ActionMenu items={[{ label: 'Open history set', href: `/app/company-history/batches/${batch.id}` }, { label: 'View library', href: '/app/company-history' }]} /></td></tr>)}</tbody></table></TableContainer></Panel>}
          </div>
          <aside id="import-history" className="space-y-6"><Panel><SectionHeader eyebrow="Add internal precedent" title="Import company history" description="Upload a well-scoped batch so reviewers can compare new products against relevant internal context." /><div className="mt-5">{canManage ? <CompanyHistoryUploadForm /> : <InlineNotice tone="default" title="Owner or admin access required">You can inspect this workspace library, but only owners and admins can import or reprocess source files.</InlineNotice>}</div></Panel><Panel><SectionHeader eyebrow="How history is used" title="Comparison context, not authority" /><div className="mt-4 space-y-3 text-sm text-slate-600"><div className="flex gap-3"><Icon name="history" size={17} className="mt-0.5 shrink-0 text-sky-700" /><p>Source files are parsed, indexed, and retrieved only inside this workspace.</p></div><div className="flex gap-3"><Icon name="link" size={17} className="mt-0.5 shrink-0 text-sky-700" /><p>Matching records remain linked to source excerpts and the audit-ready trail.</p></div><div className="flex gap-3"><Icon name="shield-check" size={17} className="mt-0.5 shrink-0 text-sky-700" /><p>Qualified reviewers confirm whether precedent remains applicable to the new product.</p></div></div></Panel></aside>
        </div>
      </div>
    </AppShell>
  );
}
