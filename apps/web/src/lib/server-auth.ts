import 'server-only';

import { redirect } from 'next/navigation';
import { buildSignInHref } from './paths';
import { fetchServerAuthSessionSafe } from './server-api';

export async function requireAuthenticatedSession(returnPath = '/app') {
  const session = await fetchServerAuthSessionSafe();
  if (!session.authenticated || !session.user || !session.organization) {
    redirect(buildSignInHref(returnPath));
  }

  return session;
}

export async function requireCompletedOnboarding(returnPath = '/app') {
  const session = await requireAuthenticatedSession(returnPath);
  if (!session.user?.onboardingCompletedAt) {
    redirect('/app/onboarding');
  }
  return session;
}

export async function redirectAuthenticatedUser() {
  const session = await fetchServerAuthSessionSafe();
  if (!session.authenticated || !session.user || !session.organization) {
    return;
  }

  redirect(session.user.onboardingCompletedAt ? '/app' : '/app/onboarding');
}
