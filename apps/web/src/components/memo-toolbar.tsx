'use client';

import Link from 'next/link';
import { useState } from 'react';

export function MemoToolbar({
  markdown,
  downloadFilename,
  downloadHref,
  focusHref,
}: {
  markdown: string;
  downloadFilename: string;
  downloadHref?: string;
  focusHref?: string;
}) {
  const [copied, setCopied] = useState(false);
  const [showRaw, setShowRaw] = useState(false);

  async function copyMemo() {
    try {
      await navigator.clipboard.writeText(markdown);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  function downloadMemo() {
    if (typeof URL === 'undefined') {
      if (downloadHref) {
        window.location.href = downloadHref;
      }
      return;
    }

    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = downloadFilename;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={copyMemo}
        className="inline-flex items-center rounded-full bg-ink px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-steel"
      >
        {copied ? 'Copied' : 'Copy Memo'}
      </button>
      <button
        type="button"
        onClick={downloadMemo}
        className="inline-flex items-center rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
      >
        Download Markdown
      </button>
      {focusHref ? (
        <Link
          href={focusHref}
          className="inline-flex items-center rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
        >
          Focus Review
        </Link>
      ) : null}
      <button
        type="button"
        onClick={() => setShowRaw((current) => !current)}
        className="inline-flex items-center rounded-full px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
      >
        {showRaw ? 'Hide Raw Markdown' : 'View Raw Markdown'}
      </button>
      {showRaw ? (
        <pre className="mt-3 max-h-96 w-full overflow-auto rounded-2xl border border-slate-200 bg-slate-950 p-4 text-xs leading-6 text-slate-100">
          {markdown}
        </pre>
      ) : null}
    </div>
  );
}
