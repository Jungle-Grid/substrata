import Link from 'next/link';
import { fetchDocument } from '../../../lib/api';
import { ApiNotice, EmptyState } from '../../../components/api-state';
import { StartClassificationButton } from '../../../components/start-classification-button';
import { Badge, Panel, Shell } from '../../../components/ui';

export default async function DocumentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await fetchDocument(id);
  const document = result.data;

  if (!document) {
    return (
      <Shell eyebrow="Document Detail" title="Document unavailable">
        <ApiNotice fallback={result.fallback} error={result.error} />
        <EmptyState
          title="Document unavailable"
          body={result.error ?? 'The requested document could not be loaded.'}
        />
      </Shell>
    );
  }

  return (
    <Shell eyebrow="Document Detail" title={document.title}>
      <ApiNotice fallback={result.fallback} error={result.error} />
      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <Panel>
          <div className="space-y-5">
            <div>
              <p className="text-sm text-slate-500">File</p>
              <p className="font-medium text-ink">{document.fileName}</p>
              <p className="mt-2 text-sm text-slate-500">
                {document.mimeType} • {document.sizeBytes ?? 'Unknown'} bytes •{' '}
                {document.sourceType}
              </p>
              {document.sourceType === 'seed' ? (
                <p className="mt-3 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  This is a bundled public/sample datasheet for local demo
                  purposes.
                </p>
              ) : null}
            </div>
            <div>
              <p className="text-sm text-slate-500">Classification runs</p>
              {(document.classificationRuns ?? []).length === 0 ? (
                <div className="mt-3">
                  <EmptyState
                    title="No classification runs yet"
                    body="Start a run to extract export-relevant specifications, draft ECCN candidates, and generate a review memo."
                  />
                </div>
              ) : (
                <div className="mt-3 space-y-3">
                  {(document.classificationRuns ?? []).map((run) => (
                    <Link
                      key={run.id}
                      href={`/classification-runs/${run.id}`}
                      className="block rounded-2xl border border-slate-200 p-4 transition hover:border-steel"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-ink">{run.id}</p>
                          <p className="text-sm text-slate-500">{run.status}</p>
                        </div>
                        <Badge tone="warning">
                          {run.humanReviews?.[0]?.status ?? 'pending_review'}
                        </Badge>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Panel>
        <Panel>
          <h2 className="text-xl font-semibold text-ink">Review standard</h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Draft outputs are evidence packages for expert export-controls review,
            not final legal or compliance determinations.
          </p>
          <div className="mt-5">
            <StartClassificationButton documentId={document.id} />
          </div>
        </Panel>
      </div>
    </Shell>
  );
}
