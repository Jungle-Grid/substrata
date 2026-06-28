import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { formatReviewStatus, reviewStatusTone } from '../lib/workspace';

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
              <Link
                className="hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-steel"
                href="/dashboard"
              >
                Dashboard
              </Link>
              <Link
                className="hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-steel"
                href="/documents/new"
              >
                Upload
              </Link>
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
    <section className={`rounded-xl border border-slate-200 bg-white p-5 shadow-sm ${className}`}>
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
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
        {label}
      </p>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-ink">{value}</p>
    </Panel>
  );
}

export function Badge({
  children,
  tone = 'default',
}: {
  children: ReactNode;
  tone?: 'default' | 'warning' | 'success' | 'danger' | 'info';
}) {
  const tones = {
    default: 'border-slate-200 bg-slate-100 text-slate-700',
    warning: 'border-amber-200 bg-amber-50 text-amber-900',
    success: 'border-emerald-200 bg-emerald-50 text-emerald-900',
    danger: 'border-rose-200 bg-rose-50 text-rose-900',
    info: 'border-blue-200 bg-blue-50 text-blue-900',
  };

  return (
    <span className={`inline-flex rounded-md border px-2.5 py-1 text-xs font-medium ${tones[tone]}`}>
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status?: string | null }) {
  return <Badge tone={reviewStatusTone(status)}>{formatReviewStatus(status)}</Badge>;
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

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <Panel className="border-dashed border-slate-300 bg-slate-50">
      <h2 className="text-xl font-semibold text-ink">{title}</h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">{body}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </Panel>
  );
}

export function InlineNotice({
  tone,
  title,
  children,
}: {
  tone: 'default' | 'success' | 'warning' | 'error' | 'info';
  title?: string;
  children: ReactNode;
}) {
  const tones = {
    default: 'border-slate-200 bg-slate-50 text-slate-700',
    success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    warning: 'border-amber-200 bg-amber-50 text-amber-950',
    error: 'border-rose-200 bg-rose-50 text-rose-900',
    info: 'border-blue-200 bg-blue-50 text-blue-900',
  };

  return (
    <div className={`rounded-lg border px-4 py-3 text-sm ${tones[tone]}`}>
      {title ? <p className="font-semibold">{title}</p> : null}
      <div className={title ? 'mt-1 leading-6' : 'leading-6'}>{children}</div>
    </div>
  );
}

export function ErrorState({
  title,
  body,
  retryHref,
}: {
  title: string;
  body: string;
  retryHref?: string;
}) {
  return (
    <InlineNotice tone="error" title={title}>
      <p>{body}</p>
      {retryHref ? (
        <Link href={retryHref} className="mt-3 inline-flex font-medium underline underline-offset-4">
          Try again
        </Link>
      ) : null}
    </InlineNotice>
  );
}

export function LoadingState({
  title = 'Loading workspace data',
  body = 'Substrata is preparing the next review surface.',
}: {
  title?: string;
  body?: string;
}) {
  return (
    <Panel>
      <div className="animate-pulse space-y-4">
        <div className="h-4 w-32 rounded bg-slate-200" />
        <div className="h-8 w-64 rounded bg-slate-200" />
        <div className="h-4 w-full max-w-2xl rounded bg-slate-200" />
        <div className="grid gap-3 md:grid-cols-2">
          <div className="h-28 rounded-lg bg-slate-100" />
          <div className="h-28 rounded-lg bg-slate-100" />
        </div>
      </div>
      <div className="mt-6">
        <p className="font-medium text-slate-950">{title}</p>
        <p className="mt-1 text-sm text-slate-600">{body}</p>
      </div>
    </Panel>
  );
}

export function TableContainer({
  children,
  hint = 'Scroll horizontally to inspect all columns.',
}: {
  children: ReactNode;
  hint?: string;
}) {
  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-3 px-1 text-xs uppercase tracking-[0.14em] text-slate-500 md:hidden">
        <span>Compact table</span>
        <span>{hint}</span>
      </div>
      <div className="overflow-x-auto">{children}</div>
    </div>
  );
}
