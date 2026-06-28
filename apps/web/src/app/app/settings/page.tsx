import { AppShell } from '../../../components/app-shell';
import { InlineNotice, Panel } from '../../../components/ui';
import { WorkspaceSettingsForm } from '../../../components/workspace-forms';
import { requireCompletedOnboarding } from '../../../lib/server-auth';

export default async function SettingsPage() {
  const session = await requireCompletedOnboarding('/app/settings');
  const canManageWorkspace =
    session.membership?.role === 'OWNER' || session.membership?.role === 'ADMIN';

  return (
    <AppShell
      session={session}
      currentPath="/app/settings"
      title="Settings"
      description="Manage basic workspace settings without introducing billing or policy-engine complexity into the first release."
    >
      <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <Panel>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Workspace profile</p>
          <p className="mt-3 text-lg font-semibold text-slate-950">{session.organization?.name}</p>
          <p className="mt-2 text-sm text-slate-600">
            Industry context: {session.organization?.industry ?? 'Not set'}
          </p>
          <div className="mt-4">
            <InlineNotice tone="default">
              Workspace settings affect naming and context only. They do not weaken review controls or organization scoping.
            </InlineNotice>
          </div>
        </Panel>
        <Panel>
          {canManageWorkspace ? (
            <WorkspaceSettingsForm
              defaultName={session.organization?.name ?? ''}
              defaultIndustry={session.organization?.industry}
            />
          ) : (
            <InlineNotice tone="warning" title="Workspace settings access required">
              Only owners and admins can update workspace settings.
            </InlineNotice>
          )}
        </Panel>
      </div>
    </AppShell>
  );
}
