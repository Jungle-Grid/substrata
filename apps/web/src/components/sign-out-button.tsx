'use client';

import { useState } from 'react';
import { fetchCsrfToken, SessionExpiredError, signOut } from '../lib/api';

export function SignOutButton({
  fullWidth = false,
  onComplete,
}: {
  fullWidth?: boolean;
  onComplete?: () => void;
}) {
  const [pending, setPending] = useState(false);

  return (
    <button
      type="button"
      disabled={pending}
      onClick={async () => {
        try {
          setPending(true);
          const csrfToken = await fetchCsrfToken();
          await signOut(csrfToken);
          onComplete?.();
          window.location.assign('/sign-in');
        } catch (error) {
          if (error instanceof SessionExpiredError) {
            return;
          }
          throw error;
        } finally {
          setPending(false);
        }
      }}
      className={`inline-flex min-h-10 items-center justify-center rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 ${fullWidth ? 'w-full' : ''}`}
    >
      {pending ? 'Signing out...' : 'Sign out'}
    </button>
  );
}
