import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';

export function AuthShell({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <main className="min-h-screen bg-[#f4f6f8] px-4 py-10">
      <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1.1fr_28rem]">
        <section className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="/brand/substrata-mark.png"
              alt="Substrata mark"
              width={40}
              height={40}
              className="h-10 w-10"
            />
            <div>
              <p className="text-lg font-semibold tracking-tight text-slate-950">
                Substrata
              </p>
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                ECCN review assistant
              </p>
            </div>
          </Link>
          <h1 className="mt-10 text-3xl font-semibold tracking-tight text-slate-950">
            {title}
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
            {description}
          </p>
          <div className="mt-10">{children}</div>
          {footer ? <div className="mt-6">{footer}</div> : null}
        </section>

        <aside className="rounded-2xl border border-slate-200 bg-slate-950 p-8 text-white">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            Review-ready output
          </p>
          <h2 className="mt-4 text-2xl font-semibold tracking-tight">
            Evidence-backed recommendations for export-control review.
          </h2>
          <div className="mt-8 space-y-4 text-sm leading-6 text-slate-300">
            <p>Upload a technical document and generate recommended ECCN review paths with cited evidence, uncertainty flags, and a human-review-ready memo draft.</p>
            <p>Substrata keeps extracted technical facts, recommended review paths, reviewer notes, and audit history in one compliance workspace.</p>
            <p>Outputs remain draft analysis for human review. The product does not present an automated legal determination.</p>
          </div>
        </aside>
      </div>
    </main>
  );
}
