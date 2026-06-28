import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';
import type { AuthSessionRecord } from '../lib/types';
import { AppShellNav } from './app-shell-nav';
import { SignOutButton } from './sign-out-button';

const navItems = [
  { href: '/app', label: 'Overview' },
  { href: '/app/documents', label: 'Documents' },
  { href: '/app/reviews', label: 'Classification Reviews' },
  { href: '/app/review-queue', label: 'Review Queue' },
  { href: '/app/memos', label: 'Memos' },
  { href: '/app/audit-log', label: 'Audit Log' },
  { href: '/app/team', label: 'Team' },
  { href: '/app/settings', label: 'Settings' },
  { href: '/app/profile', label: 'Profile' },
];

export function AppShell({
  session,
  currentPath,
  title,
  description,
  actions,
  children,
}: {
  session: AuthSessionRecord;
  currentPath: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#f4f6f8] text-slate-900">
      <div className="mx-auto grid min-h-screen max-w-[1600px] lg:grid-cols-[17rem_1fr]">
        <aside className="hidden border-r border-slate-200 bg-white lg:flex lg:flex-col">
          <div className="border-b border-slate-200 px-6 py-5">
            <Link href="/app" className="flex items-center gap-3">
              <Image
                src="/brand/substrata-mark.png"
                alt="Substrata mark"
                width={36}
                height={36}
                className="h-9 w-9"
              />
              <div className="min-w-0">
                <p className="text-base font-semibold tracking-tight text-slate-950">
                  Substrata
                </p>
                <p className="truncate text-xs uppercase tracking-[0.18em] text-slate-500">
                  Compliance workspace
                </p>
              </div>
            </Link>
          </div>
          <div className="px-4 py-4">
            <Link
              href="/app/documents/new"
              className="inline-flex w-full items-center justify-center rounded-lg bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
            >
              New Classification
            </Link>
          </div>
          <nav className="flex-1 space-y-1 px-3 pb-6">
            {navItems.map((item) => {
              const active = currentPath === item.href || currentPath.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`block rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                    active
                      ? 'border border-slate-200 bg-slate-100 text-slate-950'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'
                  }`}
                >
                  <span className="block truncate">{item.label}</span>
                </Link>
              );
            })}
          </nav>
          <div className="border-t border-slate-200 px-4 py-4">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="truncate text-sm font-semibold text-slate-950">{session.user?.name}</p>
              <p className="mt-1 truncate text-xs text-slate-500">{session.user?.email}</p>
              <p className="mt-1 truncate text-xs uppercase tracking-[0.14em] text-slate-500">
                {session.organization?.name}
              </p>
              <div className="mt-4 grid gap-2">
                <Link
                  href="/app/profile"
                  className="rounded-lg px-3 py-2 text-sm text-slate-700 transition hover:bg-white"
                >
                  Profile
                </Link>
                <Link
                  href="/app/settings"
                  className="rounded-lg px-3 py-2 text-sm text-slate-700 transition hover:bg-white"
                >
                  Workspace Settings
                </Link>
                <SignOutButton fullWidth />
              </div>
            </div>
          </div>
        </aside>

        <main className="min-w-0">
          <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/90">
            <div className="mx-auto max-w-6xl px-4 py-4 sm:px-6 lg:px-8">
              <div className="flex items-center justify-between gap-4 lg:hidden">
                <Link href="/app" className="flex min-w-0 items-center gap-3">
                  <Image
                    src="/brand/substrata-mark.png"
                    alt="Substrata mark"
                    width={32}
                    height={32}
                    className="h-8 w-8"
                  />
                  <span className="truncate text-sm font-semibold text-slate-950">
                    {session.organization?.name ?? 'Substrata'}
                  </span>
                </Link>
                <AppShellNav currentPath={currentPath} navItems={navItems} session={session} />
              </div>

              <div className="mt-4 flex flex-col gap-4 lg:mt-0 lg:flex-row lg:items-end lg:justify-between">
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    {session.organization?.name}
                  </p>
                  <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
                    {title}
                  </h1>
                  {description ? (
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{description}</p>
                  ) : null}
                </div>
                {actions ? <div className="shrink-0">{actions}</div> : null}
              </div>
            </div>
          </header>
          <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
