import { AppShell } from '../../../components/app-shell';
import { Icon } from '../../../components/icon';
import { InlineNotice, Panel, SectionHeader } from '../../../components/ui';
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
      description="Workspace identity and review-governance settings for a controlled, organization-scoped compliance workspace."
    >
      <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <Panel>
          <SectionHeader eyebrow="Workspace configuration" title="Compliance workspace profile" description="Core organization context used to label workups and keep reviewer activity scoped." />
          <p className="mt-3 text-lg font-semibold text-slate-950">{session.organization?.name}</p>
          <p className="mt-2 text-sm text-slate-600">
            Industry context: {session.organization?.industry ?? 'Not set'}
          </p>
          <div className="mt-5 space-y-3">
            <InlineNotice tone="default">
              Workspace settings affect naming and context only. They do not weaken review controls or organization scoping.
            </InlineNotice>
            <div className="flex gap-3 rounded-lg border border-slate-200 p-3 text-sm text-slate-600"><Icon name="shield-check" size={17} className="mt-0.5 shrink-0 text-sky-700" /><p>Human-review requirements, source evidence, and audit-trail controls remain part of every classification workup.</p></div>
          </div>
        </Panel>
        <Panel>
          <SectionHeader eyebrow="Workspace" title="Update organization details" description="Keep the workspace identity clear for reviewers and audit exports." />
          {canManageWorkspace ? (
            <div className="mt-5"><WorkspaceSettingsForm
              defaultName={session.organization?.name ?? ''}
              defaultIndustry={session.organization?.industry}
            /></div>
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
