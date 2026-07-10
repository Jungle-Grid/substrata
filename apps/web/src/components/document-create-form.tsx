'use client';

import { useRouter } from 'next/navigation';
import { ChangeEvent, useState, useTransition } from 'react';
import { createDocumentFromText, fetchCsrfToken, uploadDocument } from '../lib/api';
import { InlineNotice } from './ui';
import { Icon } from './icon';

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
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
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

  const handleFileSelection = (file?: File | null) => {
    if (!file) {
      return;
    }
    setSelectedFile(file);

    const derivedTitle = deriveTitleFromFileName(file.name);
    if (derivedTitle) {
      setTitle(derivedTitle);
    }
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    handleFileSelection(event.target.files?.[0]);
  };

  return (
    <form
      className="space-y-5"
      onSubmit={(event) => {
        event.preventDefault();
        setError(null);
        const form = new FormData(event.currentTarget);
        const submittedTitle = String(form.get('title') ?? '').trim();
        const formFile = form.get('file');
        const file = selectedFile ?? formFile;
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
      <div className="space-y-4">
        <label className="block space-y-2">
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
      </div>

      <div
        className="rounded-xl border border-dashed border-slate-300 bg-slate-50/70 p-5 text-center transition hover:border-sky-400 hover:bg-sky-50/40"
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => { event.preventDefault(); handleFileSelection(event.dataTransfer.files?.[0]); }}
      >
        <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg bg-white text-sky-700 shadow-sm"><Icon name="upload" size={20} /></span>
        <p className="mt-3 text-sm font-semibold text-slate-900">Drop a source package here, or choose a file</p>
        <p className="mt-1 text-xs leading-5 text-slate-500">Datasheet PDF, product brief, extracted text, CSV, JSON, or prior technical material.</p>
        <label className="mt-4 inline-flex min-h-9 cursor-pointer items-center rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
          Choose file
          <input name="file" type="file" accept=".pdf,.txt,.md,.csv,.json,text/plain,application/pdf" onChange={handleFileChange} className="sr-only" />
        </label>
        {selectedFile ? <p className="mt-3 text-xs font-medium text-slate-700">Selected: {selectedFile.name}</p> : null}
      </div>

      <InlineNotice tone="default" title="Document intake status">
        {statusMessage}
      </InlineNotice>

      <label className="space-y-2">
        <span className="text-sm font-medium text-ink">
          Optional source text
        </span>
        <span className="block text-xs text-slate-500">
          Use this for extracted technical text, product excerpts, or internal engineering notes.
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
        className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Icon name="clipboard-check" size={16} />
        {isPending ? 'Preparing review workup...' : 'Generate review workup'}
      </button>
    </form>
  );
}
