import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';

const workflowSteps = [
  ['01', 'Upload datasheet', 'Add a public datasheet, product brief, or extracted text file to the compliance workspace.'],
  ['02', 'Extract technical facts', 'Normalize architecture, interfaces, memory, cryptography, performance, and packaging evidence.'],
  ['03', 'Generate review paths', 'Compare source-grounded facts against Category 3, Category 5 Part 2, and broader comparison paths.'],
  ['04', 'Draft memo', 'Prepare a classification memo draft with citations, uncertainty flags, and reviewer questions.'],
  ['05', 'Human review', 'Route the evidence package through the human review queue with an audit trail.'],
];

const reviewRows = [
  ['i.MX RT1170 crossover MCU datasheet', 'Facts extracted', 'Category 3 / Category 5 Part 2', 'Needs human review'],
  ['ADC12DJ5200RF RF-sampling ADC', 'Review paths generated', '3A001 / 3A991', 'Memo drafted'],
  ['Zynq UltraScale+ MPSoC overview', 'Memo drafted', 'Category 3 / Category 5 Part 2', 'Needs human review'],
];

const facts = [
  ['CPU architecture', 'Arm Cortex-M7 / Cortex-M4', 'Source snippet captured'],
  ['Security functions', 'HAB, CAAM, OTFAD, PUF', 'Reviewer question open'],
  ['High-speed I/O', 'Ethernet, USB, display/camera', 'Category 3 path'],
  ['Cryptography', 'AES / PKHA / RNG indicators', 'Category 5 Part 2 path'],
];

function CTA({
  href,
  variant = 'primary',
  children,
}: {
  href: string;
  variant?: 'primary' | 'secondary';
  children: ReactNode;
}) {
  const className =
    variant === 'primary'
      ? 'border-ink bg-ink text-white hover:bg-steel focus-visible:ring-steel'
      : 'border-slate-300 bg-white text-ink hover:border-slate-400 hover:bg-slate-50 focus-visible:ring-slate-400';

  return (
    <Link
      href={href}
      className={`inline-flex min-h-11 items-center justify-center rounded-lg border px-4 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${className}`}
    >
      {children}
    </Link>
  );
}

function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-steel">
      {children}
    </p>
  );
}

function SectionHeader({
  eyebrow,
  title,
  body,
}: {
  eyebrow: string;
  title: string;
  body: string;
}) {
  return (
    <div className="max-w-3xl">
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2 className="mt-3 text-3xl font-semibold tracking-tight text-ink md:text-4xl">
        {title}
      </h2>
      <p className="mt-4 text-base leading-7 text-slate-600">{body}</p>
    </div>
  );
}

function StatusPill({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-900">
      {children}
    </span>
  );
}

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-[#f7f8fa] text-ink">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-4 md:flex-row md:items-center md:justify-between md:px-8">
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="/brand/substrata-mark.png"
              alt="Substrata mark"
              width={36}
              height={36}
              className="h-9 w-9"
              priority
            />
            <div>
              <p className="text-base font-semibold tracking-tight">Substrata</p>
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                Compliance workspace
              </p>
            </div>
          </Link>
          <nav className="flex flex-wrap items-center gap-4 text-sm font-medium text-slate-600">
            <Link className="hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-steel" href="#workflow">
              Workflow
            </Link>
            <Link className="hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-steel" href="#workspace">
              Workspace
            </Link>
            <Link className="hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-steel" href="#trust">
              Evidence
            </Link>
            <CTA href="/documents/new">Upload a datasheet</CTA>
          </nav>
        </div>
      </header>

      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-16 md:px-8 lg:grid-cols-[0.95fr_1.05fr] lg:py-20">
          <div>
            <Eyebrow>ECCN review assistant for hardware teams</Eyebrow>
            <h1 className="mt-5 max-w-4xl text-4xl font-semibold tracking-tight text-ink md:text-6xl">
              Generate cited ECCN review memos from semiconductor datasheets.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
              Substrata extracts technical facts from datasheets, recommends export-control review paths, and prepares human-review-ready memo drafts with evidence, citations, uncertainty flags, and audit-ready reasoning.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <CTA href="/documents/new">Upload a datasheet</CTA>
              <CTA href="/dashboard" variant="secondary">Open compliance workspace</CTA>
            </div>
            <div className="mt-8 grid gap-3 text-sm text-slate-600 sm:grid-cols-3">
              <div className="border-l-2 border-steel pl-3">
                <p className="font-semibold text-ink">For</p>
                <p>Export control and trade compliance teams</p>
              </div>
              <div className="border-l-2 border-steel pl-3">
                <p className="font-semibold text-ink">Input</p>
                <p>Datasheets, product briefs, extracted text</p>
              </div>
              <div className="border-l-2 border-steel pl-3">
                <p className="font-semibold text-ink">Output</p>
                <p>Classification memo draft for review</p>
              </div>
            </div>
          </div>

          <div className="self-start rounded-xl border border-slate-200 bg-slate-50 shadow-sm">
            <div className="border-b border-slate-200 bg-white px-5 py-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-ink">Human review queue</p>
                  <p className="mt-1 text-xs text-slate-500">Sample/dev data shown for product context</p>
                </div>
                <StatusPill>Needs human review</StatusPill>
              </div>
            </div>
            <div className="overflow-hidden">
              <table className="hidden w-full border-collapse text-left text-sm md:table">
                <thead className="bg-slate-100 text-xs uppercase tracking-[0.14em] text-slate-500">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Document</th>
                    <th className="px-5 py-3 font-semibold">Memo status</th>
                    <th className="px-5 py-3 font-semibold">Recommended review paths</th>
                    <th className="px-5 py-3 font-semibold">Queue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {reviewRows.map(([document, memoStatus, paths, queue]) => (
                    <tr key={document} className="hover:bg-slate-50">
                      <td className="px-5 py-4 font-medium text-ink">{document}</td>
                      <td className="px-5 py-4 text-slate-600">{memoStatus}</td>
                      <td className="px-5 py-4 text-slate-600">{paths}</td>
                      <td className="px-5 py-4">
                        <StatusPill>{queue}</StatusPill>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="divide-y divide-slate-200 bg-white md:hidden">
                {reviewRows.map(([document, memoStatus, paths, queue]) => (
                  <div key={document} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-semibold text-ink">{document}</p>
                      <StatusPill>{queue}</StatusPill>
                    </div>
                    <dl className="mt-3 grid gap-2 text-sm">
                      <div>
                        <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Memo status</dt>
                        <dd className="mt-1 text-slate-700">{memoStatus}</dd>
                      </div>
                      <div>
                        <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Recommended review paths</dt>
                        <dd className="mt-1 text-slate-700">{paths}</dd>
                      </div>
                    </dl>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid gap-px border-t border-slate-200 bg-slate-200 md:grid-cols-3">
              {['Evidence-backed recommendations', 'Cited review paths', 'Audit trail preserved'].map((item) => (
                <div key={item} className="bg-white px-5 py-4 text-sm font-medium text-slate-700">
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="workflow" className="border-b border-slate-200 bg-[#f7f8fa]">
        <div className="mx-auto max-w-7xl px-5 py-16 md:px-8">
          <SectionHeader
            eyebrow="Workflow"
            title="From datasheet to human-review-ready memo."
            body="The workflow follows the evidence chain reviewers need: source document, extracted technical facts, recommended review paths, citations, uncertainty flags, reviewer questions, and a memo draft."
          />
          <div className="mt-10 grid gap-0 overflow-hidden rounded-xl border border-slate-200 bg-white lg:grid-cols-5">
            {workflowSteps.map(([step, title, description], index) => (
              <div
                key={step}
                className={`p-5 ${index === 0 ? '' : 'border-t border-slate-200 lg:border-l lg:border-t-0'}`}
              >
                <p className="font-mono text-xs font-semibold text-steel">{step}</p>
                <h3 className="mt-4 text-base font-semibold text-ink">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="workspace" className="border-b border-slate-200 bg-white">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-16 md:px-8 lg:grid-cols-[0.85fr_1.15fr]">
          <SectionHeader
            eyebrow="Compliance workspace"
            title="Dense review surfaces for serious classification work."
            body="Substrata is organized around documents, review runs, extracted facts, recommended review paths, memo drafts, human review status, and audit history."
          />
          <div className="rounded-xl border border-slate-200">
            <div className="border-b border-slate-200 px-5 py-4">
              <p className="text-sm font-semibold text-ink">Run detail: i.MX RT1170 crossover MCU</p>
              <p className="mt-1 text-xs text-slate-500">Evidence package prepared for reviewer signoff</p>
            </div>
            <div className="grid gap-px bg-slate-200 md:grid-cols-[0.9fr_1.1fr]">
              <div className="bg-slate-50 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Extracted technical facts</p>
                <div className="mt-4 space-y-3">
                  {facts.map(([name, value, note]) => (
                    <div key={name} className="rounded-lg border border-slate-200 bg-white p-3">
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-sm font-semibold text-ink">{name}</p>
                        <span className="rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-600">{note}</span>
                      </div>
                      <p className="mt-2 text-sm text-slate-600">{value}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-white p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">ECCN review recommendation</p>
                <div className="mt-4 space-y-4">
                  <div className="rounded-lg border border-steel/25 bg-blue-50/60 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-semibold text-ink">Category 3 electronics / MCU / processor paths</p>
                      <span className="text-xs font-medium text-steel">medium confidence</span>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-slate-700">
                      Recommended based on processor architecture, memory/cache, interfaces, and device-family evidence extracted from the datasheet.
                    </p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <p className="font-semibold text-ink">Category 5 Part 2 security/cryptography paths</p>
                    <p className="mt-3 text-sm leading-6 text-slate-700">
                      Reviewer should confirm security functionality, algorithm availability, and mass-market/license-exception treatment.
                    </p>
                  </div>
                  <div className="rounded-lg border border-slate-200 p-4">
                    <p className="text-sm font-semibold text-ink">Reviewer questions</p>
                    <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-slate-600">
                      <li>Which ordering code and package should anchor review signoff?</li>
                      <li>Are cryptographic functions user-accessible or limited to boot/storage protection?</li>
                      <li>Which current CCL thresholds should be mapped before approval?</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="trust" className="bg-[#f7f8fa]">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-16 md:px-8 lg:grid-cols-[1fr_0.8fr]">
          <SectionHeader
            eyebrow="Trust model"
            title="Built around evidence, citations, uncertainty, and human review."
            body="Substrata gives reviewers a better starting point: source-grounded facts, cited review paths, missing information, and a memo draft that stays tied to the document record."
          />
          <div className="space-y-4">
            {[
              ['Traceable recommendations', 'Every recommendation is paired with extracted facts and reviewer questions.'],
              ['Audit-ready reasoning', 'Runs retain artifacts, memo drafts, citations, review status, and notes.'],
              ['Human review queue', 'Approval remains an operational workflow owned by the compliance team.'],
            ].map(([title, body]) => (
              <div key={title} className="rounded-xl border border-slate-200 bg-white p-5">
                <h3 className="font-semibold text-ink">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{body}</p>
              </div>
            ))}
            <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-5">
              <Image
                src="/brand/jungle-grid-logo.png"
                alt="Jungle Grid logo"
                width={28}
                height={28}
                className="h-7 w-7 object-contain"
              />
              <p className="text-sm text-slate-600">
                Powered by Jungle Grid for managed document analysis and review execution.
              </p>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-8 text-sm text-slate-500 md:flex-row md:items-center md:justify-between md:px-8">
          <p className="font-medium text-ink">Substrata</p>
          <div className="flex flex-wrap gap-4">
            <Link href="/dashboard" className="hover:text-ink">Dashboard</Link>
            <Link href="/documents/new" className="hover:text-ink">Upload a datasheet</Link>
            <a href="mailto:founders@substrata.ai?subject=Substrata%20review" className="hover:text-ink">
              Contact
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}
