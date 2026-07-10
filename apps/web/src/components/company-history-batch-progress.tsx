'use client';

import Link from 'next/link';
import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { fetchCsrfToken, reprocessCompanyHistoryDocument } from '../lib/api';
import type { CompanyHistoryBatchRecord } from '../lib/types';
import { formatDateTime, formatFileSize } from '../lib/workspace';
import { EmptyState, InlineNotice, StatusBadge } from './ui';

export function CompanyHistoryBatchProgress({
  batch,
  canManage,
}: {
  batch: CompanyHistoryBatchRecord;
  canManage: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const isActive = batch.documents.some((document) => ['queued', 'processing'].includes(document.status));

  useEffect(() => {
    if (!isActive) return;
    const interval = window.setInterval(() => router.refresh(), 3_000);
    return () => window.clearInterval(interval);
  }, [isActive, router]);

  if (!batch.documents.length) {
    return <EmptyState title="No files in this batch" body="Upload a new Company History batch to add internal reference material." />;
  }

  return (
    <div className="space-y-3">
      {error ? <InlineNotice tone="error">{error}</InlineNotice> : null}
      {isActive ? (
        <InlineNotice tone="info" title="Ingestion in progress">
          Substrata is extracting text and indexing historical files. This page refreshes while work remains queued.
        </InlineNotice>
      ) : null}
      {batch.documents.map((document) => (
        <div key={document.id} className="rounded-lg border border-slate-200 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <Link href={`/app/company-history/documents/${document.id}`} className="break-all font-medium text-slate-950 underline-offset-4 hover:underline">
                {document.fileName}
              </Link>
              <p className="mt-1 text-sm text-slate-500">
                {document.recordType.replace(/_/g, ' ')} / {formatFileSize(document.sizeBytes)} / uploaded {formatDateTime(document.createdAt)}
              </p>
            </div>
            <StatusBadge status={document.status} />
          </div>
          {document.duplicateOf ? (
            <p className="mt-3 text-sm text-slate-600">Duplicate of {document.duplicateOf.fileName}; the existing indexed record is used for retrieval.</p>
          ) : null}
          {document.errorMessage ? <InlineNotice tone="error">{document.errorMessage}</InlineNotice> : null}
          {document.status === 'failed' && canManage ? (
            <button
              type="button"
              disabled={isPending}
              onClick={() => startTransition(async () => {
                try {
                  setError(null);
                  await reprocessCompanyHistoryDocument(document.id, await fetchCsrfToken());
                  router.refresh();
                } catch (reprocessError) {
                  setError(reprocessError instanceof Error ? reprocessError.message : 'Retry could not be queued.');
                }
              })}
              className="mt-3 inline-flex min-h-9 items-center rounded-md border border-slate-300 px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isPending ? 'Queueing retry…' : 'Retry ingestion'}
            </button>
          ) : null}
        </div>
      ))}
    </div>
  );
}
