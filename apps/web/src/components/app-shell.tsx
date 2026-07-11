import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { ActionMenu } from './action-menu';
import { AppShellNav } from './app-shell-nav';
import { Icon, type IconName } from './icon';
import { SignOutButton } from './sign-out-button';
import { WorkspaceUserMenu } from './workspace-user-menu';
import type { AuthSessionRecord } from '../lib/types';
import { workspaceNavGroups } from '../lib/workspace-navigation';

const navGroups = workspaceNavGroups;

function isActive(currentPath: string, href: string) {
  return currentPath === href || (href !== '/app' && currentPath.startsWith(`${href}/`));
}

function SidebarItem({ item, currentPath }: { item: { href: string; label: string; icon: IconName }; currentPath: string }) {
  const active = isActive(currentPath, item.href);
  return (
    <Link
      href={item.href}
      className={`group flex min-h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200 ${
        active
          ? 'bg-slate-900 text-white shadow-sm'
          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'
      }`}
    >
      <Icon name={item.icon} size={17} className={active ? 'text-sky-200' : 'text-slate-400 group-hover:text-slate-700'} />
      <span className="truncate">{item.label}</span>
    </Link>
  );
}

export function AppShell({
  session,
  currentPath,
  title,
  description,
  actions,
  headerContent,
  children,
}: {
  session: AuthSessionRecord;
  currentPath: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  headerContent?: ReactNode;
  children: ReactNode;
}) {
  const workspaceName = session.organization?.name ?? 'Substrata workspace';

  return (
    <div className="min-h-screen bg-[#f5f7fa] text-slate-900">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[17.5rem] flex-col border-r border-slate-200/90 bg-white lg:flex">
        <div className="border-b border-slate-200 px-5 py-5">
          <Link href="/app" className="flex items-center gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200">
            <Image src="/brand/substrata-mark.png" alt="Substrata mark" width={38} height={38} className="h-9 w-9" priority />
            <div className="min-w-0">
              <p className="text-[15px] font-semibold tracking-tight text-slate-950">Substrata</p>
              <p className="mt-0.5 truncate text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Compliance workspace</p>
            </div>
          </Link>
          <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
            <p className="truncate text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">Workspace</p>
            <p className="mt-1 truncate text-sm font-semibold text-slate-900">{workspaceName}</p>
          </div>
        </div>
        <div className="px-4 py-4">
          <Link href="/app/documents/new" className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:ring-offset-2">
            <Icon name="plus" size={17} />
            New classification
          </Link>
        </div>
        <nav aria-label="Workspace navigation" className="flex-1 space-y-5 overflow-y-auto px-3 pb-5">
          {navGroups.map((group) => (
            <div key={group.label}>
              <p className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">{group.label}</p>
              <div className="space-y-0.5">
                {group.items.map((item) => <SidebarItem key={item.href} item={item} currentPath={currentPath} />)}
              </div>
            </div>
          ))}
        </nav>
        <div className="border-t border-slate-200 p-4">
          <div className="mb-3 flex items-center gap-2.5 rounded-lg bg-slate-50 px-3 py-2.5">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-slate-900 text-xs font-semibold text-white">{(session.user?.name ?? session.user?.email ?? 'S').slice(0, 1).toUpperCase()}</span>
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-slate-900">{session.user?.name ?? 'Workspace member'}</p>
              <p className="truncate text-[11px] text-slate-500">{session.membership?.role?.toLowerCase()}</p>
            </div>
          </div>
          <SignOutButton fullWidth />
        </div>
      </aside>

      <main className="min-w-0 lg:pl-[17.5rem]">
        <header className="sticky top-0 z-30 border-b border-slate-200/90 bg-white/95 backdrop-blur">
          {headerContent ? headerContent : <div className="mx-auto max-w-[1480px] px-4 py-3 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between gap-3 lg:hidden">
              <Link href="/app" className="flex min-w-0 items-center gap-2.5">
                <Image src="/brand/substrata-mark.png" alt="Substrata mark" width={32} height={32} className="h-8 w-8" />
                <span className="truncate text-sm font-semibold text-slate-950">{workspaceName}</span>
              </Link>
              <AppShellNav currentPath={currentPath} navGroups={navGroups} session={session} />
            </div>
            <div className="mt-4 flex flex-col gap-4 lg:mt-0 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">{workspaceName}</p>
                <div className="mt-1 flex items-center gap-2 text-xs text-slate-500"><span>Workspace</span><span className="text-slate-300">/</span><span>{title}</span></div>
                <h1 className="mt-1.5 text-2xl font-semibold tracking-tight text-slate-950 sm:text-[1.7rem]">{title}</h1>
                {description ? <p className="mt-1.5 max-w-3xl text-sm leading-6 text-slate-600">{description}</p> : null}
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                <ActionMenu label="Create workspace item" items={[
                  { label: 'New classification', href: '/app/documents/new', icon: <Icon name="plus" size={16} /> },
                  { label: 'Upload document', href: '/app/documents/new', icon: <Icon name="upload" size={16} /> },
                  { label: 'Import company history', href: '/app/company-history', icon: <Icon name="history" size={16} /> },
                  { label: 'Invite reviewer', href: '/app/team', icon: <Icon name="users" size={16} /> },
                ]} />
                {actions}
                <WorkspaceUserMenu session={session} />
              </div>
            </div>
          </div>}
        </header>
        <div className="mx-auto max-w-[1480px] px-4 py-6 sm:px-6 lg:px-8">{children}</div>
      </main>
    </div>
  );
}
