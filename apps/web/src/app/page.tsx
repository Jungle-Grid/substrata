import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';

const demoHref = 'https://calendar.app.google/UqNdDvK2Ya1VQ4Rm6';

const workflowSteps = [
  {
    step: '01',
    title: 'Upload datasheet',
    body: 'Add a public datasheet, product brief, or extracted text file to the compliance workspace.',
  },
  {
    step: '02',
    title: 'Extract technical facts',
    body: 'Normalize architecture, interfaces, memory, cryptography, performance, and packaging evidence.',
  },
  {
    step: '03',
    title: 'Generate review paths',
    body: 'Compare source-grounded facts against Category 3, Category 5 Part 2, and broader comparison paths.',
  },
  {
    step: '04',
    title: 'Draft memo',
    body: 'Prepare a classification memo draft with citations, uncertainty flags, and reviewer questions.',
  },
  {
    step: '05',
    title: 'Human review',
    body: 'Route the evidence package through the human review queue with an audit trail.',
  },
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
  variant?: 'primary' | 'secondary' | 'ghost';
  children: ReactNode;
}) {
  const className =
    variant === 'primary'
      ? 'border-[var(--substrata-cyan)] bg-[var(--substrata-cyan)] text-white shadow-[0_12px_28px_rgba(31,154,232,0.22)] hover:bg-[var(--substrata-steel)] focus-visible:ring-[var(--substrata-cyan)]'
      : variant === 'secondary'
        ? 'border-slate-300 bg-white text-[var(--substrata-ink)] hover:border-slate-400 hover:bg-slate-50 focus-visible:ring-slate-400'
        : 'border-transparent bg-transparent text-[var(--substrata-steel)] hover:bg-[var(--substrata-fog)] focus-visible:ring-[var(--substrata-cyan)]';

  const sharedClassName =
    `inline-flex min-h-11 items-center justify-center rounded-lg border px-4 text-sm font-semibold transition ` +
    `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${className}`;

  if (href.startsWith('http')) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className={sharedClassName}>
        {children}
      </a>
    );
  }

  return (
    <Link href={href} className={sharedClassName}>
      {children}
    </Link>
  );
}

function SectionEyebrow({
  children,
  tone = 'dark',
}: {
  children: ReactNode;
  tone?: 'dark' | 'light';
}) {
  return (
    <p
      className={`text-xs font-semibold uppercase tracking-[0.22em] ${
        tone === 'light' ? 'text-slate-300' : 'text-[var(--substrata-steel)]'
      }`}
    >
      {children}
    </p>
  );
}

function SectionTitle({
  eyebrow,
  title,
  body,
  tone = 'dark',
}: {
  eyebrow: string;
  title: string;
  body: string;
  tone?: 'dark' | 'light';
}) {
  return (
    <div className="max-w-3xl">
      <SectionEyebrow tone={tone}>{eyebrow}</SectionEyebrow>
      <h2
        className={`mt-3 text-3xl font-semibold tracking-tight md:text-4xl ${
          tone === 'light' ? 'text-white' : 'text-[var(--substrata-ink)]'
        }`}
      >
        {title}
      </h2>
      <p className={`mt-4 text-base leading-7 ${tone === 'light' ? 'text-slate-300' : 'text-slate-600'}`}>
        {body}
      </p>
    </div>
  );
}

function StatusPill({
  children,
  tone = 'default',
}: {
  children: ReactNode;
  tone?: 'default' | 'warning' | 'info' | 'success';
}) {
  const tones = {
    default: 'border-slate-200 bg-white text-slate-700',
    warning: 'border-amber-200 bg-amber-50 text-amber-900',
    info: 'border-[color:rgba(31,154,232,0.2)] bg-[var(--substrata-fog)] text-[var(--substrata-steel)]',
    success: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  };

  return (
    <span className={`inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-medium ${tones[tone]}`}>
      {children}
    </span>
  );
}

function Surface({
  children,
  tint = 'white',
}: {
  children: ReactNode;
  tint?: 'white' | 'fog' | 'ink';
}) {
  const classes = {
    white: 'bg-white',
    fog: 'bg-[var(--substrata-fog)]',
    ink: 'bg-[linear-gradient(135deg,var(--substrata-ink),var(--substrata-steel))] text-white',
  };

  return (
    <section className={`border-b border-slate-200 ${classes[tint]}`}>{children}</section>
  );
}

export default function LandingPage() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-[var(--substrata-fog)] text-[var(--substrata-ink)]">
      <header className="sticky top-0 z-40 border-b border-white/70 bg-white/85 backdrop-blur supports-[backdrop-filter]:bg-white/75">
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
              <p className="text-base font-semibold tracking-tight text-[var(--substrata-ink)]">
                Substrata
              </p>
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                Compliance workspace
              </p>
            </div>
          </Link>
          <nav className="flex flex-wrap items-center gap-4 text-sm font-medium text-slate-600">
            <Link className="hover:text-[var(--substrata-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--substrata-cyan)]" href="#workflow">
              Workflow
            </Link>
            <Link className="hover:text-[var(--substrata-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--substrata-cyan)]" href="#workspace">
              Workspace
            </Link>
            <Link className="hover:text-[var(--substrata-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--substrata-cyan)]" href="/pricing">
              Pricing
            </Link>
            <Link className="hover:text-[var(--substrata-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--substrata-cyan)]" href="#trust">
              Evidence
            </Link>
            <CTA href="/app" variant="ghost">
              Open workspace
            </CTA>
          </nav>
        </div>
      </header>

      <Surface tint="white">
        <div className="relative">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 overflow-hidden"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_14%,rgba(31,154,232,0.15),transparent_32%),radial-gradient(circle_at_82%_12%,rgba(52,198,239,0.18),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.98),rgba(247,250,252,0.96))]" />
            <div className="absolute inset-x-0 top-0 h-[22rem] bg-[linear-gradient(to_right,rgba(31,154,232,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(16,50,79,0.045)_1px,transparent_1px)] bg-[size:28px_28px] opacity-70 [mask-image:linear-gradient(to_bottom,black,transparent)]" />
          </div>
          <div className="relative mx-auto grid max-w-7xl gap-10 px-5 py-12 md:px-8 md:py-14 lg:grid-cols-[1fr_0.96fr] lg:py-12">
            <div className="self-start pt-2 md:pt-4 lg:-mt-16 lg:pt-0 xl:-mt-20">
              <div className="inline-flex items-center gap-2 rounded-full border border-[color:rgba(31,154,232,0.18)] bg-[var(--substrata-fog)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--substrata-steel)]">
                ECCN review assistant
              </div>
              <h1 className="mt-5 max-w-4xl text-4xl font-semibold tracking-tight text-[var(--substrata-ink)] md:text-6xl">
                Generate cited ECCN review memos from semiconductor datasheets.
              </h1>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
                Substrata extracts technical facts from datasheets, recommends export-control review paths, and prepares human-review-ready memo drafts with evidence, citations, uncertainty flags, and audit-ready reasoning.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <CTA href="/app/documents/new">Upload a datasheet</CTA>
                <CTA href={demoHref} variant="secondary">
                  Want a demo?
                </CTA>
              </div>
              <div className="mt-6 grid gap-3 text-sm text-slate-600 sm:grid-cols-3">
                <div className="rounded-xl border border-slate-200 bg-white/80 p-4 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--substrata-steel)]">
                    For
                  </p>
                  <p className="mt-2 leading-6">Export control and trade compliance teams</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white/80 p-4 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--substrata-steel)]">
                    Input
                  </p>
                  <p className="mt-2 leading-6">Datasheets, product briefs, extracted text</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white/80 p-4 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--substrata-steel)]">
                    Output
                  </p>
                  <p className="mt-2 leading-6">Classification memo draft for human review</p>
                </div>
              </div>
            </div>

            <div className="relative self-start">
              <div className="absolute -inset-6 rounded-[2rem] bg-[radial-gradient(circle_at_top,rgba(31,154,232,0.15),transparent_48%),radial-gradient(circle_at_bottom_right,rgba(52,198,239,0.14),transparent_42%)] blur-2xl" />
              <div className="relative overflow-hidden rounded-[1.75rem] border border-[color:rgba(16,50,79,0.12)] bg-white shadow-[0_30px_80px_rgba(2,16,32,0.12)]">
                <div className="border-b border-slate-200 bg-[var(--substrata-fog)] px-5 py-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-[var(--substrata-ink)]">
                        Human review queue
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Evidence-backed recommendations, review-ready memo, human decision required
                      </p>
                    </div>
                    <StatusPill tone="warning">Needs human review</StatusPill>
                  </div>
                </div>
                <div className="grid gap-px bg-slate-200 md:grid-cols-[0.95fr_1.05fr]">
                  <div className="bg-white p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                      Recent run
                    </p>
                    <div className="mt-4 space-y-3">
                      {[
                        ['Source document', 'i.MX RT1170 crossover MCU datasheet'],
                        ['Status', 'Facts extracted'],
                        ['Recommendation', 'Category 3 / Category 5 Part 2'],
                      ].map(([label, value]) => (
                        <div key={label} className="rounded-xl border border-slate-200 bg-[var(--substrata-fog)] p-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</p>
                          <p className="mt-2 text-sm font-medium text-[var(--substrata-ink)]">{value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="bg-[linear-gradient(180deg,#ffffff_0%,#f8fbfe_100%)] p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                      Recommended review paths
                    </p>
                    <div className="mt-4 space-y-4">
                      <div className="rounded-xl border border-[color:rgba(31,154,232,0.2)] bg-[var(--substrata-fog)] p-4">
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-semibold text-[var(--substrata-ink)]">
                            Category 3 electronics
                          </p>
                          <span className="text-xs font-medium text-[var(--substrata-steel)]">
                            ready for review
                          </span>
                        </div>
                        <p className="mt-3 text-sm leading-6 text-slate-700">
                          Recommended from extracted architecture, interfaces, and performance facts.
                        </p>
                      </div>
                      <div className="rounded-xl border border-slate-200 bg-white p-4">
                        <p className="font-semibold text-[var(--substrata-ink)]">
                          Category 5 Part 2 comparison path
                        </p>
                        <p className="mt-3 text-sm leading-6 text-slate-700">
                          Keep as a comparison path only until a reviewer confirms the relevant control thresholds.
                        </p>
                      </div>
                      <div className="rounded-xl border border-slate-200 bg-[var(--substrata-fog)] p-4">
                        <p className="text-sm font-semibold text-[var(--substrata-ink)]">
                          Reviewer questions
                        </p>
                        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-slate-600">
                          <li>Which ordering code and package should anchor review signoff?</li>
                          <li>Are cryptographic functions user-accessible or limited to boot/storage protection?</li>
                          <li>Which current CCL thresholds should be mapped before approval?</li>
                        </ul>
                      </div>
                    </div>
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
          </div>
        </div>
      </Surface>

      <Surface tint="fog">
        <div className="mx-auto max-w-7xl px-5 py-16 md:px-8">
          <SectionTitle
            eyebrow="Workflow"
            title="From datasheet to human-review-ready memo."
            body="The workflow follows the evidence chain reviewers need: source document, extracted technical facts, recommended review paths, citations, uncertainty flags, reviewer questions, and a memo draft."
          />
          <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            {workflowSteps.map((item) => (
              <div
                key={item.step}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="font-mono text-xs font-semibold text-[var(--substrata-cyan)]">
                    {item.step}
                  </p>
                  <StatusPill tone={item.step === '05' ? 'warning' : item.step === '03' ? 'info' : 'default'}>
                    {item.step === '01'
                      ? 'neutral'
                      : item.step === '02'
                        ? 'in progress'
                        : item.step === '03'
                          ? 'review paths'
                          : item.step === '04'
                            ? 'ready for review'
                            : 'human decision required'}
                  </StatusPill>
                </div>
                <h3 className="mt-4 text-base font-semibold text-[var(--substrata-ink)]">
                  {item.title}
                </h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </Surface>

      <Surface tint="white">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-16 md:px-8 lg:grid-cols-[0.9fr_1.1fr]">
          <SectionTitle
            eyebrow="Compliance workspace"
            title="Dense review surfaces for serious classification work."
            body="Substrata is organized around documents, review runs, extracted facts, recommended review paths, memo drafts, human review status, and audit history."
          />
          <div className="rounded-[1.5rem] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbfe_100%)] shadow-sm">
            <div className="border-b border-slate-200 px-5 py-4">
              <p className="text-sm font-semibold text-[var(--substrata-ink)]">
                Run detail: i.MX RT1170 crossover MCU
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Evidence package prepared for reviewer signoff
              </p>
            </div>
            <div className="grid gap-px bg-slate-200 md:grid-cols-[0.9fr_1.1fr]">
              <div className="bg-white p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Extracted technical facts
                </p>
                <div className="mt-4 space-y-3">
                  {facts.map(([name, value, note]) => (
                    <div key={name} className="rounded-xl border border-slate-200 bg-[var(--substrata-fog)] p-4">
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-sm font-semibold text-[var(--substrata-ink)]">{name}</p>
                        <span className="rounded-md bg-white px-2 py-1 text-xs text-slate-600">
                          {note}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-slate-600">{value}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-white p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  ECCN review recommendation
                </p>
                <div className="mt-4 space-y-4">
                  <div className="rounded-xl border border-[color:rgba(31,154,232,0.2)] bg-[var(--substrata-fog)] p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-semibold text-[var(--substrata-ink)]">
                        Category 3 electronics / MCU / processor paths
                      </p>
                      <span className="text-xs font-medium text-[var(--substrata-steel)]">
                        medium confidence
                      </span>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-slate-700">
                      Recommended based on processor architecture, memory/cache, interfaces, and device-family evidence extracted from the datasheet.
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <p className="font-semibold text-[var(--substrata-ink)]">
                      Category 5 Part 2 security/cryptography paths
                    </p>
                    <p className="mt-3 text-sm leading-6 text-slate-700">
                      Reviewer should confirm security functionality, algorithm availability, and mass-market/license-exception treatment.
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-[var(--substrata-fog)] p-4">
                    <p className="text-sm font-semibold text-[var(--substrata-ink)]">Reviewer questions</p>
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
      </Surface>

      <Surface tint="ink">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-16 md:px-8 lg:grid-cols-[0.9fr_1.1fr]">
            <SectionTitle
              eyebrow="Trust model"
              title="Built around evidence, citations, uncertainty, and human review."
              body="Substrata gives reviewers a better starting point: source-grounded facts, cited review paths, missing information, and a memo draft that stays tied to the document record."
              tone="light"
            />
          <div className="space-y-4">
            {[
              ['Evidence-backed', 'Every recommendation is paired with extracted facts and reviewer questions.'],
              ['Review-ready', 'Runs retain artifacts, memo drafts, citations, review status, and notes.'],
              ['Human decision required', 'Approval remains an operational workflow owned by the compliance team.'],
            ].map(([title, body]) => (
              <div key={title} className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <h3 className="font-semibold text-white">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-300">{body}</p>
              </div>
            ))}
            <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-5">
              <Image
                src="/brand/jungle-grid-logo.png"
                alt="Jungle Grid logo"
                width={28}
                height={28}
                className="h-7 w-7 object-contain"
              />
              <p className="text-sm text-slate-300">
                Powered by Jungle Grid for managed document analysis and review execution.
              </p>
            </div>
          </div>
        </div>
      </Surface>

      <Surface tint="fog">
        <div className="mx-auto max-w-7xl px-5 py-16 md:px-8">
          <div className="rounded-[1.75rem] border border-[color:rgba(31,154,232,0.18)] bg-white p-8 shadow-sm md:p-10">
            <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--substrata-steel)]">
                  Final step
                </p>
                <h2 className="mt-4 text-3xl font-semibold tracking-tight text-[var(--substrata-ink)] md:text-4xl">
                  Upload a datasheet and generate a cited ECCN review memo for human approval.
                </h2>
                <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600">
                  Review teams get extracted technical facts, recommended review paths, and a memo draft tied to source evidence and an audit trail.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <CTA href="/app/documents/new">Upload a datasheet</CTA>
                <CTA href={demoHref} variant="secondary">
                  Want a demo?
                </CTA>
              </div>
            </div>
          </div>
        </div>
      </Surface>

      <footer className="border-t border-white/10 bg-[var(--substrata-ink)] text-slate-300">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-12 md:px-8 lg:grid-cols-[1.1fr_0.8fr_0.8fr_1fr]">
          <div>
            <div className="flex items-center gap-3">
              <Image
                src="/brand/substrata-mark.png"
                alt="Substrata mark"
                width={36}
                height={36}
                className="h-9 w-9"
              />
              <div>
                <p className="text-base font-semibold tracking-tight text-white">Substrata</p>
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                  Compliance workspace
                </p>
              </div>
            </div>
            <p className="mt-4 max-w-sm leading-6 text-slate-300">
              Serious B2B software for datasheet review, recommended review paths, and human-review-first compliance operations.
            </p>
          </div>
          <div>
            <p className="font-medium text-white">Product</p>
            <div className="mt-3 grid gap-3">
              <Link href="/app" className="hover:text-white">
                Workspace
              </Link>
              <Link href="/app/documents/new" className="hover:text-white">
                New classification
              </Link>
              <Link href="/pricing" className="hover:text-white">
                Pricing
              </Link>
            </div>
          </div>
          <div>
            <p className="font-medium text-white">Why teams trust it</p>
            <div className="mt-3 grid gap-3">
              <Link href="#workflow" className="hover:text-white">
                Workflow
              </Link>
              <Link href="#workspace" className="hover:text-white">
                Workspace
              </Link>
              <Link href="#trust" className="hover:text-white">
                Evidence model
              </Link>
            </div>
          </div>
          <div>
            <p className="font-medium text-white">Contact</p>
            <div className="mt-3 grid gap-3">
              <a href={demoHref} target="_blank" rel="noreferrer" className="hover:text-white">
                Want a demo?
              </a>
              <a href="mailto:substrata@junglegrid.dev?subject=Substrata%20review" className="hover:text-white">
                substrata@junglegrid.dev
              </a>
              <p className="leading-6 text-slate-400">
                Review-ready memo drafts. Human decision required.
              </p>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
