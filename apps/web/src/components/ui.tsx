import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { formatReviewStatus, reviewStatusTone } from '../lib/workspace';
import { Icon, type IconName } from './icon';

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
  id,
}: {
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section id={id} className={`rounded-xl border border-slate-200/90 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.03)] ${className}`}>
      {children}
    </section>
  );
}

export function SectionHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        {eyebrow ? <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500">{eyebrow}</p> : null}
        <h2 className={`${eyebrow ? 'mt-1.5' : ''} text-base font-semibold text-slate-950`}>{title}</h2>
        {description ? <p className="mt-1.5 max-w-2xl text-sm leading-6 text-slate-600">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function MetricCard({
  label,
  value,
  hint,
  icon,
  tone = 'slate',
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon: IconName;
  tone?: 'slate' | 'blue' | 'amber' | 'green';
}) {
  const tones = {
    slate: 'bg-slate-100 text-slate-700',
    blue: 'bg-sky-50 text-sky-700',
    amber: 'bg-amber-50 text-amber-700',
    green: 'bg-emerald-50 text-emerald-700',
  };
  return (
    <Panel className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">{value}</p>
        </div>
        <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${tones[tone]}`}><Icon name={icon} size={18} /></span>
      </div>
      {hint ? <p className="mt-2 text-xs leading-5 text-slate-500">{hint}</p> : null}
    </Panel>
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
      className="inline-flex min-h-10 items-center rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:ring-offset-2"
    >
      {children}
    </Link>
  );
}

export function EmptyState({
  title,
  body,
  action,
  icon = 'file-search',
}: {
  title: string;
  body: string;
  action?: ReactNode;
  icon?: IconName;
}) {
  return (
    <Panel className="border-dashed border-slate-300 bg-slate-50/70 py-8 text-center">
      <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500"><Icon name={icon} size={19} /></span>
      <h2 className="mt-4 text-base font-semibold text-slate-950">{title}</h2>
      <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-slate-600">{body}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </Panel>
  );
}

export function FilterBar({ children }: { children: ReactNode }) {
  return <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-[0_1px_2px_rgba(15,23,42,0.02)] md:flex-row md:items-center">{children}</div>;
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
