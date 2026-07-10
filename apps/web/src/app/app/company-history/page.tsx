import Link from 'next/link';
import { AppShell } from '../../../components/app-shell';
import { CompanyHistoryUploadForm } from '../../../components/company-history-upload-form';
import { EmptyState, InlineNotice, Panel, StatusBadge } from '../../../components/ui';
import { requireCompletedOnboarding } from '../../../lib/server-auth';
import { fetchServerCompanyHistoryBatches } from '../../../lib/server-api';
import { formatDateTime } from '../../../lib/workspace';

export default async function CompanyHistoryPage() {
  const session = await requireCompletedOnboarding('/app/company-history');
  const { batches } = await fetchServerCompanyHistoryBatches();
  const canManage = session.membership?.role === 'OWNER' || session.membership?.role === 'ADMIN';

  return (
    <AppShell
      session={session}
      currentPath="/app/company-history"
      title="Company History"
      description="Maintain organization-scoped internal reference material for comparison during future classification reviews."
    >
      <div className="space-y-6">
        <Panel>
          <div className="max-w-3xl">
            <h2 className="text-lg font-semibold text-slate-950">Upload internal reference material</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Upload prior product and compliance materials so Substrata can surface similar internal records during future reviews. This material supports reviewer comparison; it does not create automatic legal classification.
            </p>
          </div>
          <div className="mt-5">
            {canManage ? (
              <CompanyHistoryUploadForm />
            ) : (
              <InlineNotice tone="default" title="Owner or admin access required">
                You can inspect Company History available to this workspace, but only workspace owners and admins can upload or reprocess source files.
              </InlineNotice>
            )}
          </div>
        </Panel>

        <Panel>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Upload batches</h2>
              <p className="mt-2 text-sm text-slate-600">Review batch progress, failed files, and indexed internal reference material.</p>
            </div>
            <p className="text-sm text-slate-500">{batches.length} batch{batches.length === 1 ? '' : 'es'}</p>
          </div>
          {batches.length === 0 ? (
            <div className="mt-5">
              <EmptyState
                title="No Company History uploaded"
                body="Upload prior product/compliance materials so Substrata can surface similar internal records during future reviews."
              />
            </div>
          ) : (
            <div className="mt-5 space-y-3">
              {batches.map((batch) => (
                <Link
                  key={batch.id}
                  href={`/app/company-history/batches/${batch.id}`}
                  className="block rounded-lg border border-slate-200 p-4 transition hover:border-slate-300 hover:bg-slate-50"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-slate-950">{batch.name}</p>
                      <p className="mt-1 text-sm text-slate-500">
                        {batch.fileCount} files / {batch.totals?.indexed ?? 0} indexed / {batch.totals?.failed ?? 0} failed / uploaded {formatDateTime(batch.createdAt)}
                      </p>
                    </div>
                    <StatusBadge status={batch.status} />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Panel>
      </div>
    </AppShell>
  );
}
