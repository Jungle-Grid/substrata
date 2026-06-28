import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AuthShell } from '../../../components/auth-shell';
import { InlineNotice } from '../../../components/ui';
import { getSafeReturnPath } from '../../../lib/paths';

export default async function AuthCallbackPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; next?: string; message?: string }>;
}) {
  const params = await searchParams;
  if (params.status === 'success' && params.next) {
    redirect(getSafeReturnPath(params.next));
  }

  return (
    <AuthShell
      title={params.status === 'success' ? 'Completing sign-in' : 'Authentication could not be completed'}
      description="Substrata is resolving the sign-in handoff and preparing the correct workspace state."
    >
      {params.status === 'success' ? (
        <InlineNotice tone="info" title="Redirecting">
          Your identity was confirmed. If the workspace does not open automatically, continue below.
          <Link href={getSafeReturnPath(params.next)} className="mt-2 inline-flex font-medium underline underline-offset-4">
            Open workspace
          </Link>
        </InlineNotice>
      ) : (
        <InlineNotice tone="error" title="Sign-in interrupted">
          <p>{params.message ?? 'The sign-in flow did not complete successfully.'}</p>
          <Link href={getSafeReturnPath(params.next, '/sign-in')} className="mt-2 inline-flex font-medium underline underline-offset-4">
            Continue
          </Link>
        </InlineNotice>
      )}
    </AuthShell>
  );
}
