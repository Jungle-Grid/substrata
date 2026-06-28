import { AuthShell } from '../../components/auth-shell';
import { SignUpForm } from '../../components/auth-forms';
import { redirectAuthenticatedUser } from '../../lib/server-auth';

export default async function SignUpPage() {
  await redirectAuthenticatedUser();

  return (
    <AuthShell
      title="Create your Substrata workspace"
      description="Start with Google or create a password account. Password users verify their email before accessing workspace data."
    >
      <SignUpForm />
    </AuthShell>
  );
}
