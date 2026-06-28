import { AuthShell } from '../../components/auth-shell';
import { ForgotPasswordForm } from '../../components/auth-forms';
import { redirectAuthenticatedUser } from '../../lib/server-auth';

export default async function ForgotPasswordPage() {
  await redirectAuthenticatedUser();

  return (
    <AuthShell
      title="Reset your password"
      description="Request a one-time password reset link. The email contains only the action link and expiry note."
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}
