import { AppShell } from '../../components/app-shell';
import { LoadingState } from '../../components/ui';

export default function WorkspaceLoading() {
  return (
    <AppShell
      session={{
        authenticated: true,
        csrfToken: '',
        user: {
          id: 'loading',
          email: 'loading@substrata.local',
          name: 'Loading workspace',
          hasPassword: true,
          authMethods: ['password'],
        },
        organization: {
          id: 'loading',
          name: 'Loading workspace',
          slug: 'loading',
        },
        membership: { role: 'OWNER' },
      }}
      currentPath="/app"
      title="Loading workspace"
      description="Preparing your compliance workspace."
    >
      <LoadingState />
    </AppShell>
  );
}
