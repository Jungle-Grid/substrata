import { redirect } from 'next/navigation';
import { AppShell } from '../../../components/app-shell';
import { Panel } from '../../../components/ui';
import { OnboardingForm } from '../../../components/workspace-forms';
import { requireAuthenticatedSession } from '../../../lib/server-auth';

export default async function OnboardingPage() {
  const session = await requireAuthenticatedSession('/app/onboarding');
  if (session.user?.onboardingCompletedAt) {
    redirect('/app');
  }

  return (
    <AppShell
      session={session}
      currentPath="/app/onboarding"
      title="Welcome to Substrata"
      description="Name the workspace and add optional product context. This keeps setup lightweight and gets you into the review flow quickly."
    >
      <Panel>
        <OnboardingForm
          defaultOrganizationName={session.organization?.name ?? 'Substrata Workspace'}
          defaultIndustry={session.organization?.industry}
        />
      </Panel>
    </AppShell>
  );
}
