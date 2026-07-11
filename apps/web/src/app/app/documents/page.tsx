import Link from 'next/link';
import { ActionMenu } from '../../../components/action-menu';
import { AppShell } from '../../../components/app-shell';
import { Icon } from '../../../components/icon';
import { ActionLink, EmptyState, FilterBar, Panel, SectionHeader, StatusBadge, TableContainer } from '../../../components/ui';
import { requireCompletedOnboarding } from '../../../lib/server-auth';
import { fetchServerDocuments } from '../../../lib/server-api';
import { formatDateTime, formatFileSize } from '../../../lib/workspace';

type SearchParams = Promise<{ q?: string; type?: string; sort?: string; lifecycle?: 'active' | 'archived' }>;

export default async function DocumentsPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await requireCompletedOnboarding('/app/documents');
  const { q = '', type = 'all', sort = 'newest', lifecycle = 'active' } = await searchParams;
  const documents = await fetchServerDocuments(lifecycle);
  const query = q.trim().toLowerCase();
  const filtered = documents
    .filter((document) => {
      const isText = document.mimeType?.startsWith('text/') || document.mimeType === 'application/json';
      const isHistory = document.origin === 'internal' || document.sourceType === 'history';
      const matchesType = type === 'all' || (type === 'datasheets' && document.mimeType === 'application/pdf') || (type === 'text' && isText) || (type === 'history' && isHistory) || (type === 'has_memo' && Boolean(document.classificationRuns?.some((run) => run.reviewMemo?.contentMarkdown)));
      return matchesType && (!query || `${document.title} ${document.fileName} ${document.manufacturer ?? ''}`.toLowerCase().includes(query));
    })
    .sort((left, right) => {
      const leftTime = new Date(left.createdAt ?? 0).getTime();
      const rightTime = new Date(right.createdAt ?? 0).getTime();
      return sort === 'oldest' ? leftTime - rightTime : rightTime - leftTime;
    });

  return (
    <AppShell
      session={session}
      currentPath="/app/documents"
      title="Documents"
      description="Source packages, datasheets, product briefs, and extracted technical files used to create evidence packages."
      actions={<Link href="/app/documents/new" className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"><Icon name="upload" size={16} /> Upload source package</Link>}
    >
      <div className="space-y-5">
        <nav aria-label="Document lifecycle" className="flex gap-4 border-b border-slate-200 text-sm font-semibold"><Link href="/app/documents" className={`border-b-2 px-1 pb-3 ${lifecycle === 'active' ? 'border-slate-900 text-slate-950' : 'border-transparent text-slate-500'}`}>Active documents</Link><Link href="/app/documents?lifecycle=archived" className={`border-b-2 px-1 pb-3 ${lifecycle === 'archived' ? 'border-slate-900 text-slate-950' : 'border-transparent text-slate-500'}`}>Archived documents</Link></nav>
        <FilterBar>
          <form className="flex flex-1 flex-col gap-3 md:flex-row md:items-center" action="/app/documents"><input type="hidden" name="lifecycle" value={lifecycle} />
            <div className="relative flex-1"><Icon name="file-search" size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input name="q" defaultValue={q} placeholder="Search titles, filenames, and manufacturers…" className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:ring-2 focus:ring-sky-100" /></div>
            <select name="type" defaultValue={type} className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"><option value="all">All source packages</option><option value="datasheets">Datasheets</option><option value="text">Extracted text</option><option value="history">Company history</option><option value="has_memo">Has memo</option></select>
            <select name="sort" defaultValue={sort} className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"><option value="newest">Newest first</option><option value="oldest">Oldest first</option></select>
            <button type="submit" className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">Apply</button>
          </form>
        </FilterBar>

        {filtered.length === 0 ? <EmptyState icon="file-text" title={documents.length ? 'No documents match these filters' : 'No documents yet'} body={documents.length ? 'Try a broader source type or clear the search query.' : 'Upload a datasheet, product brief, or extracted technical text to prepare the first evidence package.'} action={!documents.length ? <ActionLink href="/app/documents/new">Upload source package</ActionLink> : undefined} /> : (
          <Panel className="p-0">
            <div className="border-b border-slate-200 px-5 py-4"><SectionHeader eyebrow={lifecycle === 'archived' ? 'Archived source document register' : 'Source document register'} title={`${filtered.length} document${filtered.length === 1 ? '' : 's'}`} description={lifecycle === 'archived' ? 'Retained source packages can be restored or permanently deleted when eligible.' : 'Document lifecycle, related workups, and reviewer-ready state.'} /></div>
            <div className="divide-y divide-slate-100 md:hidden">
              {filtered.map((document) => {
                const latestRun = document.classificationRuns?.[0];
                return <div key={document.id} className="p-4"><div className="flex gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600"><Icon name="file-text" size={18} /></span><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><Link href={`/app/documents/${document.id}`} className="truncate font-semibold text-slate-950">{document.title}</Link><ActionMenu items={[{ label: 'Open document', href: `/app/documents/${document.id}` }, { label: latestRun ? 'Open review' : 'Start classification', href: latestRun ? `/app/reviews/${latestRun.id}` : `/app/documents/${document.id}` }]} /></div><p className="mt-1 truncate text-xs text-slate-500">{document.fileName}</p><div className="mt-3 flex flex-wrap items-center gap-2"><StatusBadge status={latestRun?.reviewStatus ?? latestRun?.humanReviews?.[0]?.status ?? 'uploaded'} /><span className="text-xs text-slate-500">{formatDateTime(document.createdAt)}</span></div></div></div></div>;
              })}
            </div>
            <div className="hidden md:block"><TableContainer><table className="min-w-full text-left text-sm"><thead className="border-b border-slate-200 bg-slate-50/80 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500"><tr><th className="px-5 py-3">Source package</th><th className="px-5 py-3">Type</th><th className="px-5 py-3">Related workup</th><th className="px-5 py-3">Review state</th><th className="px-5 py-3">Uploaded</th><th className="w-12 px-3 py-3" /></tr></thead><tbody className="divide-y divide-slate-100">{filtered.map((document) => { const latestRun = document.classificationRuns?.[0]; return <tr key={document.id} className="transition hover:bg-slate-50/70"><td className="px-5 py-4"><div className="flex items-center gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600"><Icon name="file-text" size={17} /></span><div className="min-w-0"><Link href={`/app/documents/${document.id}`} className="block max-w-[26rem] truncate font-semibold text-slate-950 hover:underline">{document.title}</Link><p className="mt-0.5 max-w-[26rem] truncate text-xs text-slate-500">{document.fileName}</p></div></div></td><td className="px-5 py-4 text-slate-600"><p>{document.documentType ?? (document.mimeType === 'application/pdf' ? 'Datasheet PDF' : 'Source text')}</p><p className="mt-0.5 text-xs text-slate-400">{formatFileSize(document.sizeBytes)}</p></td><td className="px-5 py-4">{latestRun ? <Link href={`/app/reviews/${latestRun.id}`} className="font-semibold text-slate-700 hover:text-slate-950">Open review</Link> : <span className="text-slate-500">Not started</span>}</td><td className="px-5 py-4"><StatusBadge status={latestRun?.reviewStatus ?? latestRun?.humanReviews?.[0]?.status ?? 'uploaded'} /></td><td className="px-5 py-4 text-slate-600">{formatDateTime(document.createdAt)}</td><td className="px-3 py-4"><ActionMenu items={[{ label: 'Open document', href: `/app/documents/${document.id}` }, { label: latestRun ? 'Open review' : 'Start classification', href: latestRun ? `/app/reviews/${latestRun.id}` : `/app/documents/${document.id}` }]} /></td></tr>; })}</tbody></table></TableContainer></div>
          </Panel>
        )}
      </div>
    </AppShell>
  );
}
