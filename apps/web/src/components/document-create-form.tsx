'use client';

import { useRouter } from 'next/navigation';
import { ChangeEvent, useState, useTransition } from 'react';
import { createDocumentFromText, uploadDocument } from '../lib/api';

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
    'Upload a PDF or text file. If PDF extraction is incomplete, you can paste corrective raw text below.',
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

        startTransition(async () => {
          try {
            setStatusMessage(
              file instanceof File && file.size > 0
                ? 'Uploading document and extracting text...'
                : 'Creating manual review document...',
            );

            const document =
              file instanceof File && file.size > 0
                ? await uploadDocument({ title: submittedTitle, rawText, file })
                : await createDocumentFromText({
                    title: submittedTitle,
                    fileName: `${submittedTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.txt`,
                    rawText,
                  });

            setStatusMessage('Document ready. Opening review workspace...');
            router.push(`/documents/${document.id}`);
          } catch (submissionError) {
            setError(
              submissionError instanceof Error
                ? submissionError.message
                : 'Document creation failed.',
            );
            setStatusMessage(
              'Upload a PDF or text file. If PDF extraction is incomplete, you can paste corrective raw text below.',
            );
          }
        });
      }}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2">
          <span className="text-sm font-medium text-ink">Document title</span>
          <input
            className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm"
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
            className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm file:mr-3 file:rounded-full file:border-0 file:bg-slate-100 file:px-3 file:py-2"
            name="file"
            type="file"
            accept=".pdf,.txt,.md,.csv,.json,text/plain,application/pdf"
            onChange={handleFileChange}
          />
        </label>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <p className="text-sm font-medium text-ink">Upload and extraction status</p>
        <p className="mt-2 text-sm text-slate-600">{statusMessage}</p>
      </div>

      <label className="space-y-2">
        <span className="text-sm font-medium text-ink">
          Optional pasted raw text
        </span>
        <textarea
          className="min-h-64 w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm"
          name="rawText"
          placeholder={sampleRawText}
        />
      </label>

      {error ? (
        <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-900">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className="inline-flex items-center rounded-full bg-ink px-4 py-2 text-sm font-medium text-white transition hover:bg-steel disabled:opacity-50"
      >
        {isPending ? 'Preparing review document...' : 'Create review document'}
      </button>
    </form>
  );
}
