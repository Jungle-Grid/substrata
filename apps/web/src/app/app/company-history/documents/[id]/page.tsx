import Link from 'next/link';
import { AppShell } from '../../../../../components/app-shell';
import { Badge, EmptyState, InlineNotice, Panel, StatusBadge } from '../../../../../components/ui';
import { requireCompletedOnboarding } from '../../../../../lib/server-auth';
import { fetchServerCompanyHistoryDocument } from '../../../../../lib/server-api';
import { formatDateTime, formatFileSize } from '../../../../../lib/workspace';

function MarkerList({ title, items }: { title: string; items?: Array<{ value: string; sourceSnippet: string }> }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{title}</p>
      {items?.length ? (
        <div className="mt-2 space-y-2">
          {items.map((item) => <div key={`${item.value}-${item.sourceSnippet}`} className="rounded-md bg-slate-50 p-3"><p className="text-sm font-medium text-slate-950">{item.value}</p><p className="mt-1 text-sm text-slate-600">{item.sourceSnippet}</p></div>)}
        </div>
      ) : <p className="mt-2 text-sm text-slate-500">No source-backed markers found.</p>}
    </div>
  );
}

export default async function CompanyHistoryDocumentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireCompletedOnboarding(`/app/company-history/documents/${id}`);
  const historyDocument = await fetchServerCompanyHistoryDocument(id);

  return (
    <AppShell
      session={session}
      currentPath="/app/company-history"
      title={historyDocument.document.title}
      description="Inspect indexed internal reference material and its source-backed historical markers."
      actions={<Link href={`/app/company-history/batches/${historyDocument.batch.id}`} className="inline-flex min-h-10 items-center rounded-lg border border-slate-300 px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-100">Open batch</Link>}
    >
      <div className="space-y-6">
        <Panel>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="break-all text-lg font-semibold text-slate-950">{historyDocument.document.fileName}</p>
              <p className="mt-2 text-sm text-slate-600">{historyDocument.document.mimeType} / {formatFileSize(historyDocument.document.sizeBytes)} / imported {formatDateTime(historyDocument.createdAt)}</p>
            </div>
            <div className="flex items-center gap-2"><Badge tone="default">{historyDocument.recordType.replace(/_/g, ' ')}</Badge><StatusBadge status={historyDocument.ingestionStatus} /></div>
          </div>
          <div className="mt-5"><InlineNotice tone="default" title="Company-controlled reference library">This document is available only for qualified reviewer comparison within this organization. It supports reviewer analysis and memo drafting; final export classifications remain subject to human approval.</InlineNotice></div>
          {historyDocument.errorMessage ? <div className="mt-4"><InlineNotice tone="error">{historyDocument.errorMessage}</InlineNotice></div> : null}
        </Panel>

        <Panel>
          <h2 className="text-lg font-semibold text-slate-950">Extracted source markers</h2>
          <p className="mt-2 text-sm text-slate-600">Markers are deterministic text matches with source excerpts. They are not independent classifications.</p>
          <div className="mt-5 grid gap-6 lg:grid-cols-3">
            <MarkerList title="Product identifiers" items={historyDocument.metadata?.productIdentifiers} />
            <MarkerList title="SKU / model strings" items={historyDocument.metadata?.skuModelStrings} />
            <MarkerList title="ECCN-looking strings" items={historyDocument.metadata?.eccnMentions} />
          </div>
        </Panel>

        <Panel>
          <h2 className="text-lg font-semibold text-slate-950">Indexed excerpts</h2>
          {historyDocument.chunks.length ? <div className="mt-4 space-y-3">{historyDocument.chunks.map((chunk) => <div key={chunk.id} className="rounded-lg border border-slate-200 p-4"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Excerpt {chunk.ordinal + 1} / characters {chunk.charStart}–{chunk.charEnd}</p><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{chunk.content}</p></div>)}</div> : <div className="mt-4"><EmptyState title="No indexed excerpts yet" body="This file is still queued, processing, or has not produced usable text." /></div>}
        </Panel>
      </div>
    </AppShell>
  );
}
