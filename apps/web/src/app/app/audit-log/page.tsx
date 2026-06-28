import { AppShell } from '../../../components/app-shell';
import { EmptyState, Panel, TableContainer } from '../../../components/ui';
import { requireCompletedOnboarding } from '../../../lib/server-auth';
import { fetchServerAuditLog } from '../../../lib/server-api';
import { formatDateTime } from '../../../lib/workspace';

export default async function AuditLogPage() {
  const session = await requireCompletedOnboarding('/app/audit-log');
  const audit = await fetchServerAuditLog();

  return (
    <AppShell
      session={session}
      currentPath="/app/audit-log"
      title="Audit log"
      description="Review append-only workspace activity for sign-in, document uploads, classification runs, memo generation, review decisions, invites, and settings changes."
    >
      {audit.events.length === 0 ? (
        <EmptyState
          title="No audit events yet"
          body="Meaningful workspace activity will appear here as the organization starts using Substrata."
        />
      ) : (
        <div className="space-y-4">
          <div className="grid gap-3 md:hidden">
            {audit.events.map((event) => (
              <Panel key={event.id}>
                <p className="font-medium text-slate-950">{event.action}</p>
                <p className="mt-2 text-sm text-slate-600">{event.actorUser?.name ?? event.actor}</p>
                <p className="mt-1 text-sm text-slate-500">{event.entityType}</p>
                <p className="mt-3 text-xs uppercase tracking-[0.14em] text-slate-500">
                  {formatDateTime(event.createdAt)}
                </p>
              </Panel>
            ))}
          </div>
          <Panel className="hidden p-0 md:block">
            <TableContainer>
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-[0.16em] text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Action</th>
                    <th className="px-4 py-3">Actor</th>
                    <th className="px-4 py-3">Entity</th>
                    <th className="px-4 py-3">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {audit.events.map((event) => (
                    <tr key={event.id}>
                      <td className="px-4 py-4 font-medium text-slate-950">{event.action}</td>
                      <td className="px-4 py-4 text-slate-600">{event.actorUser?.name ?? event.actor}</td>
                      <td className="px-4 py-4 text-slate-600">{event.entityType}</td>
                      <td className="px-4 py-4 text-slate-600">{formatDateTime(event.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableContainer>
          </Panel>
        </div>
      )}
    </AppShell>
  );
}
