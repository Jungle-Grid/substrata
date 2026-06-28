import { AppShell } from '../../../components/app-shell';
import { Badge, EmptyState, Panel, StatusBadge } from '../../../components/ui';
import { TeamInviteForm } from '../../../components/workspace-forms';
import { requireCompletedOnboarding } from '../../../lib/server-auth';
import { fetchServerTeam } from '../../../lib/server-api';
import { formatDate, formatRole } from '../../../lib/workspace';

export default async function TeamPage() {
  const session = await requireCompletedOnboarding('/app/team');
  const team = await fetchServerTeam();
  const canManageTeam =
    session.membership?.role === 'OWNER' || session.membership?.role === 'ADMIN';

  return (
    <AppShell
      session={session}
      currentPath="/app/team"
      title="Team"
      description="Invite teammates, review current memberships, and track pending workspace invites."
    >
      <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <Panel>
          <h2 className="text-lg font-semibold text-slate-950">Invite teammate</h2>
          <p className="mt-2 text-sm text-slate-600">
            Invite a reviewer, analyst, viewer, or admin into this workspace.
          </p>
          <div className="mt-4">
            {canManageTeam ? (
              <TeamInviteForm />
            ) : (
              <EmptyState
                title="Team management access required"
                body="Workspace owners and admins can invite teammates and manage roles."
              />
            )}
          </div>
        </Panel>
        <div className="space-y-6">
          <Panel>
            <h2 className="text-lg font-semibold text-slate-950">Members</h2>
            {team.members.length === 0 ? (
              <div className="mt-4">
                <EmptyState title="No members found" body="Membership records will appear here once teammates join the workspace." />
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                {team.members.map((member) => (
                  <div key={member.id} className="rounded-lg border border-slate-200 px-4 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-slate-950">{member.user.name}</p>
                        <p className="mt-1 truncate text-sm text-slate-500">{member.user.email}</p>
                      </div>
                      <Badge tone={member.user.emailVerifiedAt ? 'success' : 'warning'}>
                        {member.user.emailVerifiedAt ? 'Verified' : 'Pending verification'}
                      </Badge>
                    </div>
                    <p className="mt-2 text-xs uppercase tracking-[0.14em] text-slate-500">
                      {formatRole(member.role)} / joined {formatDate(member.createdAt)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </Panel>
          <Panel>
            <h2 className="text-lg font-semibold text-slate-950">Pending and historical invites</h2>
            {team.invites.length === 0 ? (
              <div className="mt-4">
                <EmptyState title="No invites yet" body="Sent invites and their acceptance state will appear here." />
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                {team.invites.map((invite) => (
                  <div key={invite.id} className="rounded-lg border border-slate-200 px-4 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-slate-950">{invite.email}</p>
                        <p className="mt-1 text-sm text-slate-500">
                          {formatRole(invite.role)} / invited by {invite.invitedBy.name}
                        </p>
                      </div>
                      <StatusBadge
                        status={
                          invite.acceptedAt
                            ? 'approved'
                            : invite.revokedAt
                              ? 'rejected'
                              : 'pending_review'
                        }
                      />
                    </div>
                    <p className="mt-2 text-xs uppercase tracking-[0.14em] text-slate-500">
                      Expires {formatDate(invite.expiresAt)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </div>
      </div>
    </AppShell>
  );
}
