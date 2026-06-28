import { AuthShell } from '../../components/auth-shell';
import { SignInForm } from '../../components/auth-forms';
import { redirectAuthenticatedUser } from '../../lib/server-auth';

export default async function SignInPage() {
  await redirectAuthenticatedUser();

  return (
    <AuthShell
      title="Sign in to Substrata"
      description="Access your compliance workspace, document reviews, memo drafts, and audit-ready history."
    >
      <SignInForm />
    </AuthShell>
  );
}
