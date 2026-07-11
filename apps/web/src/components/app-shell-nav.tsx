'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { AuthSessionRecord } from '../lib/types';
import type { WorkspaceNavGroup } from '../lib/workspace-navigation';
import { Icon } from './icon';
import { SignOutButton } from './sign-out-button';

function isActive(currentPath: string, href: string) {
  return currentPath === href || (href !== '/app' && currentPath.startsWith(`${href}/`));
}

export function AppShellNav({ currentPath, navGroups, session }: { currentPath: string; navGroups: WorkspaceNavGroup[]; session: AuthSessionRecord }) {
  const [open, setOpen] = useState(false);

  useEffect(() => { setOpen(false); }, [currentPath]);
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false); };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);
    return () => { document.body.style.overflow = previousOverflow; window.removeEventListener('keydown', onKeyDown); };
  }, [open]);

  return <>
    <button type="button" aria-expanded={open} aria-controls="mobile-workspace-nav" aria-label={open ? 'Close navigation menu' : 'Open navigation menu'} onClick={() => setOpen((value) => !value)} className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200">
      <Icon name={open ? 'x' : 'menu'} size={19} />
    </button>
    {open ? <div className="fixed inset-0 z-50 bg-slate-950/30 lg:hidden" onClick={() => setOpen(false)}>
      <div id="mobile-workspace-nav" className="ml-auto flex h-full w-full max-w-[21rem] flex-col border-l border-slate-200 bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="border-b border-slate-200 px-5 py-5">
          <div className="flex items-center gap-3"><Image src="/brand/substrata-mark.png" alt="Substrata mark" width={34} height={34} className="h-8 w-8" /><div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-950">{session.organization?.name}</p><p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">Compliance workspace</p></div></div>
          <Link href="/app/documents/new" onClick={() => setOpen(false)} className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white"><Icon name="plus" size={17} /> New classification</Link>
        </div>
        <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
          {navGroups.map((group) => <div key={group.label}><p className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">{group.label}</p><div className="space-y-0.5">{group.items.map((item) => { const active = isActive(currentPath, item.href); return <Link key={item.href} href={item.href} onClick={() => setOpen(false)} className={`flex min-h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium ${active ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'}`}><Icon name={item.icon} size={17} className={active ? 'text-sky-200' : 'text-slate-400'} />{item.label}</Link>; })}</div></div>)}
        </nav>
        <div className="border-t border-slate-200 p-4"><p className="truncate text-sm font-semibold text-slate-950">{session.user?.name}</p><p className="mt-1 truncate text-xs text-slate-500">{session.user?.email}</p><div className="mt-3"><SignOutButton fullWidth onComplete={() => setOpen(false)} /></div></div>
      </div>
    </div> : null}
  </>;
}
