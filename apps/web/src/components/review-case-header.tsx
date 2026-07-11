import Link from 'next/link';
import { ActionMenu } from './action-menu';
import { AppShellNav } from './app-shell-nav';
import { Icon } from './icon';
import { Badge } from './ui';
import { WorkspaceUserMenu } from './workspace-user-menu';
import type { AuthSessionRecord, ClassificationRunRecord } from '../lib/types';
import { workspaceNavGroups } from '../lib/workspace-navigation';

type ReviewCaseTab = {
  id: string;
  label: string;
};

function processingTone(run: ClassificationRunRecord) {
  if (run.status === 'completed') return 'success' as const;
  if (run.status === 'needs_attention' || run.status === 'blocked') {
    return 'danger' as const;
  }
  return 'info' as const;
}

function reviewState(run: ClassificationRunRecord) {
  if (run.hasReviewerConclusion) {
    return run.reviewStatusDetail ?? 'Reviewer conclusion recorded';
  }
  return run.requiresHumanReview
    ? 'Human review required before signoff'
    : 'Review state recorded';
}

export function ReviewCaseHeader({
  session,
  run,
  activeTab,
  tabs,
}: {
  session: AuthSessionRecord;
  run: ClassificationRunRecord;
  activeTab: string;
  tabs: readonly ReviewCaseTab[];
}) {
  const latestReview = run.humanReviews[0];
  const isProcessing = ['pending', 'queued', 'running'].includes(run.status);
  const sourceHref = `/app/documents/${run.document.id}`;
  const tabHref = (tabId: string) => `/app/reviews/${run.id}?tab=${tabId}`;
  const moreActions = [
    {
      label: 'View source document',
      href: sourceHref,
      icon: <Icon name="file-text" size={16} />,
    },
    {
      label: 'Open memo draft',
      href: tabHref('memo'),
      icon: <Icon name="file-search" size={16} />,
    },
    {
      label: 'View company history',
      href: tabHref('company-history'),
      icon: <Icon name="history" size={16} />,
    },
    {
      label: 'View audit trail',
      href: tabHref('audit'),
      icon: <Icon name="shield-check" size={16} />,
    },
  ];

  return (
    <div className="mx-auto max-w-[1480px] px-4 py-3 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between gap-3 text-xs text-slate-500">
        <div className="flex min-w-0 items-center gap-2">
          <span className="hidden font-semibold uppercase tracking-[0.14em] text-slate-500 sm:inline">
            {session.organization?.name ?? 'Compliance workspace'}
          </span>
          <span className="hidden text-slate-300 sm:inline">/</span>
          <Link
            href="/app/reviews"
            className="inline-flex min-h-9 items-center gap-1 font-medium text-slate-600 transition hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200"
          >
            <span aria-hidden="true">←</span>
            Classification reviews
          </Link>
        </div>
        <div className="flex items-center gap-2 md:hidden">
          <AppShellNav
            currentPath="/app/reviews"
            navGroups={workspaceNavGroups}
            session={session}
          />
          <ActionMenu label="More case actions" items={moreActions} />
          <WorkspaceUserMenu session={session} compact />
        </div>
      </div>

      <div className="mt-1 flex min-w-0 flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <h1 className="max-w-4xl break-words text-xl font-semibold tracking-tight text-slate-950 sm:text-2xl">
            {run.document.title}
          </h1>
          <p className="mt-1 hidden max-w-2xl text-sm leading-5 text-slate-600 sm:block">
            Evidence-backed classification review requiring human signoff.
          </p>
        </div>
        <div className="hidden shrink-0 items-center gap-2 md:flex">
          <Link
            href={sourceHref}
            className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-300 px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200"
          >
            <Icon name="file-text" size={16} />
            Source document
          </Link>
          <ActionMenu label="More case actions" items={moreActions} />
          <WorkspaceUserMenu session={session} compact />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-slate-100 pt-3">
        <Badge tone={processingTone(run)}>
          {run.processingLabel ?? run.status}
        </Badge>
        <p className="text-sm text-slate-600">
          <span className="font-medium text-slate-700">Review:</span>{' '}
          {reviewState(run)}
        </p>
        <Link
          href={sourceHref}
          className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-300 px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200 md:hidden"
        >
          <Icon name="file-text" size={16} />
          Source document
        </Link>
        {isProcessing ? (
          <p className="hidden border-l border-slate-200 pl-3 text-xs text-slate-500 lg:block">
            Results will appear when processing completes.
          </p>
        ) : (
          <dl className="hidden items-center gap-3 text-xs text-slate-500 lg:flex">
            <div className="border-l border-slate-200 pl-3">
              <dt className="sr-only">Confidence</dt>
              <dd>
                {run.confidence ? `${Math.round(run.confidence * 100)}% confidence` : 'Confidence pending'}
              </dd>
            </div>
            <div className="border-l border-slate-200 pl-3">
              <dt className="sr-only">Uncertainty flags</dt>
              <dd>{run.uncertaintyFlags.length} uncertainty flags</dd>
            </div>
            <div className="border-l border-slate-200 pl-3">
              <dt className="sr-only">Reviewer</dt>
              <dd>{latestReview?.reviewer?.name ?? 'Reviewer unassigned'}</dd>
            </div>
          </dl>
        )}
      </div>

      <nav
        aria-label="Case file sections"
        className="mt-3 flex max-w-full gap-1 overflow-x-auto border-t border-slate-100 pt-2"
      >
        {tabs.map((tab) => (
          <Link
            key={tab.id}
            href={tabHref(tab.id)}
            aria-current={activeTab === tab.id ? 'page' : undefined}
            className={`shrink-0 rounded-md px-2.5 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200 ${activeTab === tab.id ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'}`}
          >
            {tab.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
