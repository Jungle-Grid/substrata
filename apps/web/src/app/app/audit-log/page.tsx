import { AppShell } from '../../../components/app-shell';
import { Icon, type IconName } from '../../../components/icon';
import { EmptyState, FilterBar, Panel, SectionHeader, TableContainer } from '../../../components/ui';
import { requireCompletedOnboarding } from '../../../lib/server-auth';
import { fetchServerAuditLog } from '../../../lib/server-api';
import { formatDateTime } from '../../../lib/workspace';

function eventIcon(action: string): IconName {
  if (/upload|document|history/.test(action)) return 'upload';
  if (/memo/.test(action)) return 'file-search';
  if (/review|approval/.test(action)) return 'clipboard-check';
  if (/classification|extraction|retrieval/.test(action)) return 'file-search';
  if (/team|invite|membership/.test(action)) return 'users';
  if (/setting|organization/.test(action)) return 'settings';
  return 'activity';
}

function metadataSummary(metadata?: Record<string, unknown> | null) {
  if (!metadata) return 'No additional metadata recorded.';
  const pairs = Object.entries(metadata).slice(0, 2).map(([key, value]) => `${key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ')}: ${Array.isArray(value) ? `${value.length} items` : String(value)}`);
  return pairs.join(' · ') || 'No additional metadata recorded.';
}

type SearchParams = Promise<{ q?: string; actor?: string }>;

export default async function AuditLogPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await requireCompletedOnboarding('/app/audit-log');
  const [{ q = '', actor = 'all' }, audit] = await Promise.all([searchParams, fetchServerAuditLog()]);
  const query = q.trim().toLowerCase();
  const events = audit.events.filter((event) => {
    const eventActor = event.actorUser?.name ?? event.actor;
    return (actor === 'all' || event.actor === actor) && (!query || `${event.action} ${event.entityType} ${eventActor}`.toLowerCase().includes(query));
  });
  return (
    <AppShell session={session} currentPath="/app/audit-log" title="Audit log" description="Chronological workspace activity for document intake, evidence extraction, recommendations, memo generation, reviewer actions, and governance changes.">
      {audit.events.length === 0 ? <EmptyState icon="shield-check" title="No audit events yet" body="Meaningful workspace activity will appear here as the organization creates evidence packages and records reviewer decisions." /> : <div className="space-y-5"><FilterBar><form action="/app/audit-log" className="flex flex-1 flex-col gap-3 md:flex-row"><div className="relative flex-1"><Icon name="file-search" size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input name="q" defaultValue={q} placeholder="Search event, actor, or object…" className="h-10 w-full rounded-lg border border-slate-200 pl-9 pr-3 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100" /></div><select name="actor" defaultValue={actor} className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-sky-400"><option value="all">All actors</option><option value="user">User actions</option><option value="system">System events</option><option value="worker">Worker events</option></select><button type="submit" className="h-10 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">Filter</button></form></FilterBar>{events.length === 0 ? <EmptyState icon="activity" title="No audit events match these filters" body="Try a different actor or broader search query." /> : <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(20rem,0.85fr)]"><Panel className="p-0"><div className="border-b border-slate-200 px-5 py-4"><SectionHeader eyebrow="Audit-ready trail" title={`${events.length} recorded events`} description="Append-only activity recorded against the current workspace." /></div><TableContainer><table className="min-w-full text-left text-sm"><thead className="border-b border-slate-200 bg-slate-50/80 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500"><tr><th className="px-5 py-3">Event</th><th className="px-5 py-3">Actor</th><th className="px-5 py-3">Object</th><th className="px-5 py-3">Timestamp</th></tr></thead><tbody className="divide-y divide-slate-100">{events.map((event) => <tr key={event.id} className="transition hover:bg-slate-50/70"><td className="px-5 py-4"><div className="flex gap-3"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-600"><Icon name={eventIcon(event.action)} size={16} /></span><div><p className="font-semibold text-slate-900">{event.action.replace(/_/g, ' ')}</p><p className="mt-0.5 max-w-[24rem] truncate text-xs text-slate-500">{metadataSummary(event.metadata)}</p></div></div></td><td className="px-5 py-4 text-slate-600">{event.actorUser?.name ?? event.actor}</td><td className="px-5 py-4"><p className="text-slate-700">{event.entityType}</p><p className="mt-0.5 max-w-32 truncate font-mono text-[10px] text-slate-400">{event.entityId}</p></td><td className="px-5 py-4 text-slate-600">{formatDateTime(event.createdAt)}</td></tr>)}</tbody></table></TableContainer></Panel><Panel><SectionHeader eyebrow="Trust and traceability" title="What is recorded" /><div className="mt-5 space-y-4 text-sm leading-6 text-slate-600"><div className="flex gap-3"><Icon name="upload" size={18} className="mt-0.5 shrink-0 text-sky-700" /><p>Source uploads and company-history ingestion events establish the evidence origin.</p></div><div className="flex gap-3"><Icon name="file-search" size={18} className="mt-0.5 shrink-0 text-sky-700" /><p>Fact extraction, retrieval, and memo-generation events keep review paths tied to the supporting record.</p></div><div className="flex gap-3"><Icon name="clipboard-check" size={18} className="mt-0.5 shrink-0 text-sky-700" /><p>Reviewer actions and final internal recommendations remain clearly distinct from automated draft output.</p></div></div></Panel></div>}</div>}
    </AppShell>
  );
}
