import { AppShell } from '../../../components/app-shell';
import { Icon } from '../../../components/icon';
import { Badge, Panel, SectionHeader } from '../../../components/ui';
import { ProfileForm } from '../../../components/workspace-forms';
import { requireCompletedOnboarding } from '../../../lib/server-auth';
import { formatAuthMethod } from '../../../lib/workspace';

export default async function ProfilePage() {
  const session = await requireCompletedOnboarding('/app/profile');

  return (
    <AppShell
      session={session}
      currentPath="/app/profile"
      title="Profile"
      description="Your workspace identity, authentication methods, and profile preferences."
    >
      <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <Panel>
          <SectionHeader eyebrow="Account" title="Workspace identity" description="Your account is tied to the active organization and its role-based reviewer controls." />
          <p className="mt-3 break-all text-sm font-medium text-slate-950">{session.user?.email}</p>
          <p className="mt-2 text-sm text-slate-600">
            Verification status: {session.user?.emailVerifiedAt ? 'Verified' : 'Pending'}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {session.user?.authMethods.map((method) => (
              <Badge key={method} tone="default">
                {formatAuthMethod(method)}
              </Badge>
            ))}
          </div>
          <p className="mt-4 text-sm text-slate-600">
            {session.user?.hasPassword
              ? 'Password sign-in is enabled for this account.'
              : 'This account currently signs in without a password.'}
          </p>
          <div className="mt-5 flex gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600"><Icon name="shield-check" size={17} className="mt-0.5 shrink-0 text-sky-700" /><p>Role: <span className="font-semibold text-slate-900">{session.membership?.role?.replace(/_/g, ' ').toLowerCase()}</span></p></div>
        </Panel>
        <Panel>
          <SectionHeader eyebrow="Personal settings" title="Update profile" description="Manage display name and available sign-in methods." />
          <div className="mt-5"><ProfileForm
            defaultName={session.user?.name ?? ''}
            showPasswordSection={Boolean(session.user?.hasPassword)}
          /></div>
        </Panel>
      </div>
    </AppShell>
  );
}
