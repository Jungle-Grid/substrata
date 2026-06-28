import { AuthShell } from '../../components/auth-shell';
import { VerifyEmailCard } from '../../components/auth-forms';
import { redirectAuthenticatedUser } from '../../lib/server-auth';

export default async function VerifyEmailPage() {
  await redirectAuthenticatedUser();

  return (
    <AuthShell
      title="Verify your email"
      description="Substrata verifies password-based accounts before opening access to workspace data."
    >
      <VerifyEmailCard />
    </AuthShell>
  );
}
