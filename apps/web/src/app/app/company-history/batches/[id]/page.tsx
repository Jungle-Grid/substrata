import Link from 'next/link';
import { AppShell } from '../../../../../components/app-shell';
import { CompanyHistoryBatchProgress } from '../../../../../components/company-history-batch-progress';
import { Badge, Panel } from '../../../../../components/ui';
import { requireCompletedOnboarding } from '../../../../../lib/server-auth';
import { fetchServerCompanyHistoryBatch } from '../../../../../lib/server-api';

export default async function CompanyHistoryBatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireCompletedOnboarding(`/app/company-history/batches/${id}`);
  const batch = await fetchServerCompanyHistoryBatch(id);
  const canManage = session.membership?.role === 'OWNER' || session.membership?.role === 'ADMIN';

  return (
    <AppShell
      session={session}
      currentPath="/app/company-history"
      title={batch.name}
      description="Track per-file extraction and indexing for this internal reference-material upload."
      actions={<Link href="/app/company-history" className="inline-flex min-h-10 items-center rounded-lg border border-slate-300 px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-100">All history</Link>}
    >
      <div className="space-y-6">
        <Panel>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm text-slate-600">{batch.fileCount} source files in this batch</p>
              <p className="mt-1 text-sm text-slate-500">{batch.totals?.indexed ?? 0} indexed / {batch.totals?.processing ?? 0} processing / {batch.totals?.failed ?? 0} failed</p>
            </div>
            <Badge tone={batch.status === 'completed' ? 'success' : batch.status.includes('error') || batch.status === 'failed' ? 'danger' : 'info'}>{batch.status.replace(/_/g, ' ')}</Badge>
          </div>
        </Panel>
        <Panel>
          <h2 className="text-lg font-semibold text-slate-950">Files</h2>
          <div className="mt-4">
            <CompanyHistoryBatchProgress batch={batch} canManage={canManage} />
          </div>
        </Panel>
      </div>
    </AppShell>
  );
}
