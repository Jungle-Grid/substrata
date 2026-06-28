'use client';

import { useRouter } from 'next/navigation';
import { ChangeEvent, useState, useTransition } from 'react';
import { createDocumentFromText, fetchCsrfToken, uploadDocument } from '../lib/api';
import { InlineNotice } from './ui';

const sampleTitle = 'Asteria A112 Edge Accelerator Datasheet';

const sampleRawText = `Asteria A112 Edge Accelerator Datasheet

Fabricated on a 7 nm process node.
Delivers up to 128 TOPS INT8 peak compute throughput.
Supports 112 Gbps PAM4 SerDes lanes for high-speed interconnect.
Radiation-tolerant packaging option for selected deployments.`;

export function DocumentCreateForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [statusMessage, setStatusMessage] = useState(
    'Upload a PDF or text file. If extraction needs support, paste source text below.',
  );
  const [isPending, startTransition] = useTransition();

  const deriveTitleFromFileName = (fileName: string) =>
    fileName
      .replace(/\.[^/.]+$/, '')
      .replace(/[_-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const derivedTitle = deriveTitleFromFileName(file.name);
    if (derivedTitle) {
      setTitle(derivedTitle);
    }
  };

  return (
    <form
      className="space-y-5"
      onSubmit={(event) => {
        event.preventDefault();
        setError(null);
        const form = new FormData(event.currentTarget);
        const submittedTitle = String(form.get('title') ?? '').trim();
        const file = form.get('file');
        const rawText = String(form.get('rawText') ?? '').trim();

        if (!submittedTitle) {
          setError('Document title is required.');
          return;
        }
        if (!(file instanceof File && file.size > 0) && !rawText) {
          setError('Upload a file or paste source text to continue.');
          return;
        }

        startTransition(async () => {
          try {
            setStatusMessage(
              file instanceof File && file.size > 0
                ? 'Uploading document and extracting text...'
                : 'Creating manual review document...',
            );

            const document =
              file instanceof File && file.size > 0
                ? await uploadDocument({
                    title: submittedTitle,
                    rawText,
                    file,
                    csrfToken: await fetchCsrfToken(),
                  })
                : await createDocumentFromText({
                    title: submittedTitle,
                    fileName: `${submittedTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.txt`,
                    rawText,
                    csrfToken: await fetchCsrfToken(),
                  });

            setStatusMessage('Document ready. Opening review workspace...');
            router.push(`/app/documents/${document.id}`);
          } catch (submissionError) {
            setError(
              submissionError instanceof Error
                ? submissionError.message
                : 'Document creation did not complete.',
            );
            setStatusMessage(
              'Upload a PDF or text file. If extraction needs support, paste source text below.',
            );
          }
        });
      }}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2">
          <span className="text-sm font-medium text-ink">Document title</span>
          <input
            className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm shadow-sm outline-none transition placeholder:text-slate-400 hover:border-slate-400 focus:border-steel focus:ring-2 focus:ring-steel/20"
            name="title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder={sampleTitle}
            required
          />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-medium text-ink">Datasheet file</span>
          <input
            className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm shadow-sm outline-none transition file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-medium hover:border-slate-400 focus:border-steel focus:ring-2 focus:ring-steel/20"
            name="file"
            type="file"
            accept=".pdf,.txt,.md,.csv,.json,text/plain,application/pdf"
            onChange={handleFileChange}
          />
        </label>
      </div>

      <InlineNotice tone="default" title="Document intake status">
        {statusMessage}
      </InlineNotice>

      <label className="space-y-2">
        <span className="text-sm font-medium text-ink">
          Optional source text
        </span>
        <span className="block text-xs text-slate-500">
          Use this for extracted text, public snippets, or a sanitized datasheet excerpt.
        </span>
        <textarea
          className="min-h-64 w-full rounded-lg border border-slate-300 px-4 py-3 text-sm shadow-sm outline-none transition placeholder:text-slate-400 hover:border-slate-400 focus:border-steel focus:ring-2 focus:ring-steel/20"
          name="rawText"
          placeholder={sampleRawText}
        />
      </label>

      {error ? <InlineNotice tone="error">{error}</InlineNotice> : null}

      <button
        type="submit"
        disabled={isPending}
        className="inline-flex min-h-10 items-center rounded-lg bg-ink px-4 text-sm font-semibold text-white transition hover:bg-steel focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-steel focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? 'Preparing document record...' : 'Create document record'}
      </button>
    </form>
  );
}
