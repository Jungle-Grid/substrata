'use client';

import Link from 'next/link';
import type { AuthSessionRecord } from '../lib/types';
import { SignOutButton } from './sign-out-button';
import { Icon } from './icon';

export function WorkspaceUserMenu({
  session,
  compact = false,
}: {
  session: AuthSessionRecord;
  compact?: boolean;
}) {
  const userName = session.user?.name ?? 'Workspace member';
  const firstName = userName.split(/\s+/)[0] ?? userName;

  return (
    <details className="group relative">
      <summary className="flex h-10 cursor-pointer list-none items-center gap-2 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-left transition hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200 [&::-webkit-details-marker]:hidden">
        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-slate-900 text-xs font-semibold text-white">
          {(session.user?.name ?? session.user?.email ?? 'S').slice(0, 1).toUpperCase()}
        </span>
        {!compact ? <span className="hidden max-w-24 truncate text-xs font-semibold text-slate-900 xl:block">{firstName}</span> : null}
        <Icon name="chevron-down" size={15} className="text-slate-500" />
      </summary>
      <div className="absolute right-0 z-40 mt-2 w-72 rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
        <div className="border-b border-slate-100 px-3 py-2.5">
          <p className="truncate text-sm font-semibold text-slate-950">{userName}</p>
          <p className="mt-0.5 truncate text-xs text-slate-500">{session.user?.email}</p>
          <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.13em] text-slate-400">{session.organization?.name}</p>
        </div>
        <div className="py-1">
          <Link href="/app/profile" className="flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-950"><Icon name="user" size={16} /> Profile</Link>
          <Link href="/app/settings" className="flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-950"><Icon name="settings" size={16} /> Workspace settings</Link>
        </div>
        <div className="border-t border-slate-100 px-1 pt-1">
          <SignOutButton fullWidth />
        </div>
      </div>
    </details>
  );
}
