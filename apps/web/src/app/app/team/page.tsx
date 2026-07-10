import { AppShell } from '../../../components/app-shell';
import { Icon } from '../../../components/icon';
import { Badge, EmptyState, Panel, SectionHeader, StatusBadge } from '../../../components/ui';
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
      description="Reviewer coverage, role assignments, and pending invitations for the compliance workspace."
      actions={<a href="#invite-member" className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"><Icon name="plus" size={16} /> Invite reviewer</a>}
    >
      <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <Panel id="invite-member">
          <SectionHeader eyebrow="Workspace access" title="Invite teammate" description="Invite a compliance reviewer, analyst, viewer, or administrator into this workspace." />
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
            <SectionHeader eyebrow="Active workspace access" title="Members" description="Roles shape who can create workups, record reviewer decisions, and manage governance." />
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
            <SectionHeader eyebrow="Invitation history" title="Pending and historical invites" description="Track pending access and accepted workspace invitations." />
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
