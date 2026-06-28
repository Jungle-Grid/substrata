import { AppShell } from '../../../components/app-shell';
import { Badge, Panel } from '../../../components/ui';
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
      description="Manage your display name, sign-in methods, password, and active-session posture."
    >
      <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <Panel>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Account</p>
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
        </Panel>
        <Panel>
          <ProfileForm
            defaultName={session.user?.name ?? ''}
            showPasswordSection={Boolean(session.user?.hasPassword)}
          />
        </Panel>
      </div>
    </AppShell>
  );
}
