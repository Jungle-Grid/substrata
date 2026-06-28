import Link from 'next/link';
import { AppShell } from '../../../components/app-shell';
import { EmptyState, Panel, StatusBadge } from '../../../components/ui';
import { requireCompletedOnboarding } from '../../../lib/server-auth';
import { fetchServerMemos } from '../../../lib/server-api';
import { formatDateTime } from '../../../lib/workspace';

export default async function MemosPage() {
  const session = await requireCompletedOnboarding('/app/memos');
  const memos = await fetchServerMemos();

  return (
    <AppShell
      session={session}
      currentPath="/app/memos"
      title="Memos"
      description="Browse generated human-review-ready memo drafts and jump back to the supporting review and source document."
    >
      {memos.length === 0 ? (
        <EmptyState
          title="No memos yet"
          body="Generated memo drafts will appear here after a classification review completes."
        />
      ) : (
        <Panel className="space-y-3">
          {memos.map((memo) => (
            <div key={memo.id} className="rounded-lg border border-slate-200 px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-medium text-slate-950">{memo.documentTitle}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    Updated {formatDateTime(memo.updatedAt)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={memo.humanReviewStatus} />
                  <div className="flex gap-3 text-sm font-medium text-slate-700">
                    <Link href={`/app/reviews/${memo.classificationRunId}`}>Open review</Link>
                    <Link href={`/app/documents/${memo.documentId}`}>Source document</Link>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </Panel>
      )}
    </AppShell>
  );
}
