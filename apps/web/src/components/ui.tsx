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
    <main className="min-h-screen bg-[#f7f8fa] px-5 py-6 md:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6 border-b border-slate-200 bg-white px-5 py-5 shadow-sm md:px-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <Link
              href="/"
              className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.18em] text-steel focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-steel"
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
            <nav className="flex gap-4 text-sm font-medium text-slate-600">
              <Link className="hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-steel" href="/dashboard">Dashboard</Link>
              <Link className="hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-steel" href="/documents/new">Upload</Link>
            </nav>
          </div>
          <div className="mt-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
                {eyebrow}
              </p>
              <h1 className="max-w-4xl text-2xl font-semibold tracking-tight text-ink md:text-4xl">
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
      className={`rounded-xl border border-slate-200 bg-white p-5 shadow-sm ${className}`}
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
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-ink">{value}</p>
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
    default: 'border-slate-200 bg-slate-100 text-slate-700',
    warning: 'border-amber-200 bg-amber-50 text-amber-900',
    success: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  };

  return (
    <span
      className={`inline-flex rounded-md border px-2.5 py-1 text-xs font-medium ${tones[tone]}`}
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
      className="inline-flex min-h-10 items-center rounded-lg bg-ink px-4 text-sm font-semibold text-white transition hover:bg-steel focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-steel focus-visible:ring-offset-2"
    >
      {children}
    </Link>
  );
}
