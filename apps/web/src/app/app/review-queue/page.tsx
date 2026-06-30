import Link from 'next/link';
import { AppShell } from '../../../components/app-shell';
import { EmptyState, Panel, StatusBadge } from '../../../components/ui';
import { requireCompletedOnboarding } from '../../../lib/server-auth';
import { fetchServerReviewQueue } from '../../../lib/server-api';
import { formatDateTime } from '../../../lib/workspace';

export default async function ReviewQueuePage() {
  const session = await requireCompletedOnboarding('/app/review-queue');
  const canReview =
    session.membership?.role === 'OWNER' ||
    session.membership?.role === 'ADMIN' ||
    session.membership?.role === 'REVIEWER';
  const queue = canReview ? await fetchServerReviewQueue() : [];

  return (
    <AppShell
      session={session}
      currentPath="/app/review-queue"
      title="Review queue"
      description="Focus the reviewer team on runs awaiting human attention, uncertainty resolution, and memo approval."
    >
      {!canReview ? (
        <EmptyState
          title="Reviewer access required"
          body="This queue is limited to owners, admins, and reviewers who can record human review decisions."
        />
      ) : queue.length === 0 ? (
        <EmptyState
          title="No reviews in queue"
          body="When a classification run finishes with human review required, it will appear here."
        />
      ) : (
        <Panel className="space-y-3">
          {queue.map((run) => (
            <Link
              key={run.id}
              href={`/app/reviews/${run.id}`}
              className="block rounded-lg border border-slate-200 px-4 py-3 transition hover:border-slate-300 hover:bg-slate-50"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-medium text-slate-950">{run.document.title}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    Reviewer: {run.humanReviews[0]?.reviewer?.name ?? 'Unassigned'} / {run.uncertaintyFlags.length} uncertainty flags
                  </p>
                  <p className="mt-1 text-xs uppercase tracking-[0.14em] text-slate-500">
                    Last updated {formatDateTime(run.completedAt ?? run.createdAt)}
                  </p>
                </div>
                <StatusBadge status={run.reviewStatus ?? run.humanReviews[0]?.status} />
              </div>
            </Link>
          ))}
        </Panel>
      )}
    </AppShell>
  );
}
