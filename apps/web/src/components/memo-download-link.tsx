'use client';

import { useState } from 'react';

type MemoDownloadLinkProps = {
  href: string;
  filename?: string;
};

export function MemoDownloadLink({ href, filename }: MemoDownloadLinkProps) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleDownload() {
    setLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch(href, {
        credentials: 'include',
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | { error?: { message?: string } }
          | null;
        throw new Error(payload?.error?.message ?? 'Memo download failed.');
      }

      const blob = await response.blob();
      const downloadUrl = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = downloadUrl;
      anchor.download = filename ?? 'substrata-review-memo.md';
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Memo download failed.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleDownload}
        disabled={loading}
        className="memo-download-link inline-flex min-h-10 items-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <span className="memo-download-link__rail memo-download-link__rail--top" aria-hidden="true" />
        <span
          className="memo-download-link__rail memo-download-link__rail--bottom"
          aria-hidden="true"
        />
        <span className="relative z-10">
          {loading ? 'Preparing memo…' : 'Download memo'}
        </span>
      </button>
      {errorMessage ? (
        <p className="text-sm text-rose-700">{errorMessage}</p>
      ) : null}
    </div>
  );
}
