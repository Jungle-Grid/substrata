import Link from 'next/link';
import { AppShell } from '../../../components/app-shell';
import { ActionLink, EmptyState, Panel, StatusBadge, TableContainer } from '../../../components/ui';
import { requireCompletedOnboarding } from '../../../lib/server-auth';
import { fetchServerDocuments } from '../../../lib/server-api';
import { formatDateTime } from '../../../lib/workspace';

export default async function DocumentsPage() {
  const session = await requireCompletedOnboarding('/app/documents');
  const documents = await fetchServerDocuments();

  return (
    <AppShell
      session={session}
      currentPath="/app/documents"
      title="Documents"
      description="Browse organization-scoped source documents, upload new technical materials, and open the related review workspace."
      actions={
        <Link
          href="/app/documents/new"
          className="inline-flex items-center rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          Upload document
        </Link>
      }
    >
      {documents.length === 0 ? (
        <EmptyState
          title="No documents yet"
          body="Upload a datasheet or create a manual source text record to begin a review."
          action={<ActionLink href="/app/documents/new">Upload first document</ActionLink>}
        />
      ) : (
        <div className="space-y-4">
          <div className="grid gap-3 md:hidden">
            {documents.map((document) => {
              const latestRun = document.classificationRuns?.[0];
              return (
                <Panel key={document.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link href={`/app/documents/${document.id}`} className="block truncate font-medium text-slate-950">
                        {document.title}
                      </Link>
                      <p className="mt-1 truncate text-xs text-slate-500">{document.fileName}</p>
                    </div>
                    <StatusBadge status={latestRun?.humanReviews?.[0]?.status ?? 'uploaded'} />
                  </div>
                  <dl className="mt-4 grid gap-3 text-sm">
                    <div>
                      <dt className="text-xs uppercase tracking-[0.14em] text-slate-500">Latest review</dt>
                      <dd className="mt-1 text-slate-700">
                        {latestRun ? (
                          <Link href={`/app/reviews/${latestRun.id}`} className="font-medium text-slate-950">
                            Open review
                          </Link>
                        ) : (
                          'No review yet'
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase tracking-[0.14em] text-slate-500">Updated</dt>
                      <dd className="mt-1 text-slate-700">{formatDateTime(document.createdAt)}</dd>
                    </div>
                  </dl>
                </Panel>
              );
            })}
          </div>
          <Panel className="hidden p-0 md:block">
            <TableContainer>
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-[0.16em] text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Document</th>
                    <th className="px-4 py-3">Latest review</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Updated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {documents.map((document) => {
                    const latestRun = document.classificationRuns?.[0];
                    return (
                      <tr key={document.id} className="bg-white">
                        <td className="px-4 py-4">
                          <Link href={`/app/documents/${document.id}`} className="block max-w-[22rem] truncate font-medium text-slate-950">
                            {document.title}
                          </Link>
                          <p className="mt-1 max-w-[22rem] truncate text-xs text-slate-500">{document.fileName}</p>
                        </td>
                        <td className="px-4 py-4 text-slate-600">
                          {latestRun ? (
                            <Link href={`/app/reviews/${latestRun.id}`} className="hover:text-slate-950">
                              Open review
                            </Link>
                          ) : (
                            'No review yet'
                          )}
                        </td>
                        <td className="px-4 py-4">
                          <StatusBadge status={latestRun?.humanReviews?.[0]?.status ?? 'uploaded'} />
                        </td>
                        <td className="px-4 py-4 text-slate-600">{formatDateTime(document.createdAt)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </TableContainer>
          </Panel>
        </div>
      )}
    </AppShell>
  );
}
