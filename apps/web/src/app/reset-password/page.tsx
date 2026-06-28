import { AuthShell } from '../../components/auth-shell';
import { ResetPasswordForm } from '../../components/auth-forms';
import { redirectAuthenticatedUser } from '../../lib/server-auth';

export default async function ResetPasswordPage() {
  await redirectAuthenticatedUser();

  return (
    <AuthShell
      title="Choose a new password"
      description="Password reset links are one-time use and expire within one hour."
    >
      <ResetPasswordForm />
    </AuthShell>
  );
}
