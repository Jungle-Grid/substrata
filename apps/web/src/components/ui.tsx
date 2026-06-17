import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';

export function Shell({
  title,
  eyebrow,
  headerActions,
  children,
}: {
  title: string;
  eyebrow: string;
  headerActions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <main className="min-h-screen px-6 py-8 md:px-10">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 flex flex-col gap-6 rounded-[28px] border border-white/60 bg-white/80 p-6 shadow-panel backdrop-blur">
          <div className="flex items-center justify-between gap-4">
            <Link
              href="/"
              className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.22em] text-steel"
            >
              <Image
                src="/brand/substrata-mark.png"
                alt="Substrata mark"
                width={36}
                height={36}
                className="h-9 w-9"
                priority
              />
              <span>Substrata</span>
            </Link>
            <nav className="flex gap-3 text-sm text-slate-600">
              <Link href="/dashboard">Dashboard</Link>
              <Link href="/documents/new">Upload</Link>
            </nav>
          </div>
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
                {eyebrow}
              </p>
              <h1 className="max-w-3xl text-3xl font-semibold tracking-tight text-ink md:text-5xl">
                {title}
              </h1>
            </div>
            {headerActions ? <div className="shrink-0">{headerActions}</div> : null}
          </div>
        </header>
        {children}
      </div>
    </main>
  );
}

export function Panel({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm ${className}`}
    >
      {children}
    </section>
  );
}

export function StatCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <Panel>
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-3 text-3xl font-semibold text-ink">{value}</p>
    </Panel>
  );
}

export function Badge({
  children,
  tone = 'default',
}: {
  children: ReactNode;
  tone?: 'default' | 'warning' | 'success';
}) {
  const tones = {
    default: 'bg-slate-100 text-slate-700',
    warning: 'bg-amber-100 text-amber-900',
    success: 'bg-emerald-100 text-emerald-900',
  };

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

export function ActionLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="inline-flex items-center rounded-full bg-ink px-4 py-2 text-sm font-medium text-white transition hover:bg-steel"
    >
      {children}
    </Link>
  );
}
