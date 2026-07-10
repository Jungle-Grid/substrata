'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { fetchCsrfToken, uploadCompanyHistoryBatch } from '../lib/api';
import { InlineNotice } from './ui';

const MAX_FILES = 20;
const MAX_FILE_BYTES = 8 * 1024 * 1024;
const allowedExtensions = ['pdf', 'txt', 'md', 'csv', 'json'];

export function CompanyHistoryUploadForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [fileCount, setFileCount] = useState(0);
  const [isPending, startTransition] = useTransition();

  return (
    <form
      className="space-y-5"
      onSubmit={(event) => {
        event.preventDefault();
        setError(null);
        const form = new FormData(event.currentTarget);
        const files = Array.from(form.getAll('files')).filter((value): value is File => value instanceof File && value.size > 0);
        const name = String(form.get('name') ?? '').trim();
        const recordType = String(form.get('recordType') ?? 'other') as Parameters<typeof uploadCompanyHistoryBatch>[0]['recordType'];

        if (!files.length) {
          setError('Choose at least one historical file to continue.');
          return;
        }
        if (files.length > MAX_FILES) {
          setError(`A batch can include at most ${MAX_FILES} files.`);
          return;
        }
        const unsupported = files.find((file) => !allowedExtensions.includes(file.name.split('.').pop()?.toLowerCase() ?? ''));
        if (unsupported) {
          setError(`${unsupported.name} is not supported. Use PDF, TXT, MD, CSV, or JSON.`);
          return;
        }
        const oversized = files.find((file) => file.size > MAX_FILE_BYTES);
        if (oversized) {
          setError(`${oversized.name} exceeds the 8 MiB per-file limit.`);
          return;
        }

        startTransition(async () => {
          try {
            const batch = await uploadCompanyHistoryBatch({
              name,
              recordType,
              files,
              csrfToken: await fetchCsrfToken(),
            });
            router.push(`/app/company-history/batches/${batch.id}`);
          } catch (uploadError) {
            setError(uploadError instanceof Error ? uploadError.message : 'Company History upload did not complete.');
          }
        });
      }}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2">
          <span className="text-sm font-medium text-ink">Batch name</span>
          <input
            name="name"
            maxLength={120}
            placeholder="Q3 prior product and compliance materials"
            className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm shadow-sm outline-none transition placeholder:text-slate-400 hover:border-slate-400 focus:border-steel focus:ring-2 focus:ring-steel/20"
          />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-medium text-ink">Primary material type</span>
          <select
            name="recordType"
            defaultValue="other"
            className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm shadow-sm outline-none transition hover:border-slate-400 focus:border-steel focus:ring-2 focus:ring-steel/20"
          >
            <option value="datasheet">Product datasheets</option>
            <option value="prior_memo">Prior internal review memos</option>
            <option value="catalog">Product catalog</option>
            <option value="review_note">Export review notes</option>
            <option value="approval_record">Internal approval records</option>
            <option value="technical_spec">Technical specifications</option>
            <option value="spreadsheet">Spreadsheet export</option>
            <option value="other">Mixed or other material</option>
          </select>
        </label>
      </div>

      <label className="block space-y-2">
        <span className="text-sm font-medium text-ink">Historical files</span>
        <input
          name="files"
          type="file"
          multiple
          accept=".pdf,.txt,.md,.csv,.json,application/pdf,text/plain,text/markdown,text/csv,application/json"
          onChange={(event) => setFileCount(event.currentTarget.files?.length ?? 0)}
          className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm shadow-sm outline-none transition file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-medium hover:border-slate-400 focus:border-steel focus:ring-2 focus:ring-steel/20"
        />
        <p className="text-xs text-slate-500">
          PDF, TXT, MD, CSV, or JSON only. Up to 20 files, 8 MiB each, and 50 MiB per batch.{fileCount ? ` ${fileCount} selected.` : ''}
        </p>
      </label>

      <InlineNotice tone="default" title="Internal reference material">
        Files are indexed only within this compliance workspace. They help reviewers compare future products with prior internal materials; they do not create automatic classifications or regulatory authority.
      </InlineNotice>

      {error ? <InlineNotice tone="error">{error}</InlineNotice> : null}

      <button
        type="submit"
        disabled={isPending}
        className="inline-flex min-h-10 items-center rounded-lg bg-ink px-4 text-sm font-semibold text-white transition hover:bg-steel focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-steel focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? 'Creating history batch…' : 'Upload Company History'}
      </button>
    </form>
  );
}
