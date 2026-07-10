import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';

const consultationHref = 'https://calendar.app.google/UqNdDvK2Ya1VQ4Rm6';

const workflowSteps = [
  {
    step: '01',
    title: 'Upload source package',
    status: 'source record',
    body: 'Bring together a product datasheet and the prior internal material that gives the reviewer useful context.',
  },
  {
    step: '02',
    title: 'Extract technical facts',
    status: 'evidence captured',
    body: 'Normalize architecture, interfaces, security functions, performance, packaging, and ordering evidence.',
  },
  {
    step: '03',
    title: 'Compare prior decisions',
    status: 'company context',
    body: 'Surface similar internal records with exact excerpts, source links, and clear similarity limits for review.',
  },
  {
    step: '04',
    title: 'Generate cited review path',
    status: 'review paths',
    body: 'Connect source-grounded facts to Category 3, Category 5 Part 2, and other relevant comparison paths.',
  },
  {
    step: '05',
    title: 'Draft memo for signoff',
    status: 'memo drafted',
    body: 'Prepare a cited classification memo draft with uncertainty flags, reviewer questions, and source evidence.',
  },
  {
    step: '06',
    title: 'Human review and approval',
    status: 'human decision required',
    body: 'Route the evidence package to the reviewer signoff queue and preserve the decision in the audit trail.',
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
  id,
}: {
  children: ReactNode;
  tint?: 'white' | 'fog' | 'ink';
  id?: string;
}) {
  const classes = {
    white: 'bg-white',
    fog: 'bg-[var(--substrata-fog)]',
    ink: 'bg-[linear-gradient(135deg,var(--substrata-ink),var(--substrata-steel))] text-white',
  };

  return (
    <section id={id} className={`scroll-mt-24 border-b border-slate-200 ${classes[tint]}`}>{children}</section>
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
              Evidence model
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
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_8%_12%,rgba(31,154,232,0.13),transparent_34%),radial-gradient(circle_at_83%_18%,rgba(52,198,239,0.15),transparent_31%),linear-gradient(180deg,rgba(255,255,255,0.99),rgba(247,250,252,0.97))]" />
            <div className="absolute inset-x-0 top-0 h-[32rem] bg-[linear-gradient(to_right,rgba(31,154,232,0.055)_1px,transparent_1px),linear-gradient(to_bottom,rgba(16,50,79,0.04)_1px,transparent_1px)] bg-[size:32px_32px] opacity-70 [mask-image:linear-gradient(to_bottom,black,transparent)]" />
          </div>
          <div className="relative mx-auto grid max-w-7xl gap-12 px-5 py-14 md:px-8 md:py-16 lg:grid-cols-[0.92fr_1.08fr] lg:items-center lg:gap-14 lg:py-20 xl:gap-20">
            <div className="max-w-2xl">
              <SectionEyebrow>For semiconductor trade compliance teams</SectionEyebrow>
              <h1 className="mt-4 max-w-4xl text-4xl font-semibold tracking-[-0.035em] text-[var(--substrata-ink)] sm:text-5xl md:text-6xl md:leading-[1.04]">
                Turn company classification history into review-ready ECCN memos.
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">
                Substrata ingests datasheets, prior classifications, internal notes, and reviewer decisions, then extracts technical facts, compares them against prior company records and control-list logic, and drafts cited memos for human approval.
              </p>
              <div className="mt-7 flex flex-wrap items-center gap-3">
                <CTA href="/app">Create company workspace</CTA>
                <CTA href={consultationHref} variant="secondary">
                  Schedule a consultation
                </CTA>
                <a
                  href="#trust"
                  className="inline-flex min-h-11 items-center px-1 text-sm font-semibold text-[var(--substrata-steel)] underline decoration-slate-300 underline-offset-4 transition hover:text-[var(--substrata-ink)] hover:decoration-[var(--substrata-cyan)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--substrata-cyan)] focus-visible:ring-offset-2"
                >
                  See evidence model
                </a>
              </div>
              <div className="mt-7 border-t border-slate-200 pt-5">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm font-medium text-slate-700">
                  {['Evidence-backed', 'Human approval required', 'Audit trail included'].map((item, index) => (
                    <span key={item} className="inline-flex items-center gap-3">
                      {index > 0 ? <span aria-hidden="true" className="h-1 w-1 rounded-full bg-[var(--substrata-cyan)]" /> : null}
                      {item}
                    </span>
                  ))}
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-500">
                  Built for semiconductor and advanced hardware compliance workflows.
                </p>
              </div>
            </div>

            <aside aria-label="Company-aware compliance review preview" className="relative mx-auto w-full max-w-xl lg:ml-auto lg:max-w-none">
              <div className="absolute -inset-5 rounded-[2rem] bg-[radial-gradient(circle_at_top,rgba(31,154,232,0.18),transparent_50%),radial-gradient(circle_at_bottom_right,rgba(52,198,239,0.16),transparent_44%)] blur-2xl" />
              <div className="relative overflow-hidden rounded-[1.5rem] border border-[color:rgba(16,50,79,0.14)] bg-white shadow-[0_28px_72px_rgba(2,16,32,0.16)]">
                <div className="border-b border-slate-800 bg-[linear-gradient(135deg,#08111f_0%,#10324f_100%)] px-5 py-4 sm:px-6">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-white">
                        Reviewer signoff queue
                      </p>
                      <p className="mt-1 text-xs text-slate-300">
                        Company workspace: Acme Semiconductors
                      </p>
                    </div>
                    <span className="inline-flex items-center rounded-md border border-amber-300/30 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-950">
                      Human review required
                    </span>
                  </div>
                </div>
                <div className="grid gap-px bg-slate-200 md:grid-cols-[0.95fr_1.05fr]">
                  <div className="bg-white p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                      Source package
                    </p>
                    <div className="mt-4 space-y-3">
                      {[
                        ['Source package', 'i.MX RT1170 crossover MCU datasheet'],
                        ['Prior classification found', '3A001 comparison memo · approved 2024'],
                        ['Record status', 'Internal reference material'],
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
                      Extracted facts
                    </p>
                    <div className="mt-4 space-y-4">
                      <div className="rounded-xl border border-[color:rgba(31,154,232,0.2)] bg-[var(--substrata-fog)] p-4">
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-semibold text-[var(--substrata-ink)]">
                            Arm Cortex-M7 / Cortex-M4
                          </p>
                        </div>
                        <p className="mt-3 text-sm leading-6 text-slate-700">
                          Security functions: HAB, CAAM, OTFAD, PUF
                        </p>
                        <p className="mt-2 text-sm leading-6 text-slate-700">
                          Package / ordering variants detected
                        </p>
                      </div>
                      <div className="rounded-xl border border-slate-200 bg-white p-4">
                        <p className="font-semibold text-[var(--substrata-ink)]">
                          Company-aware review path
                        </p>
                        <p className="mt-3 text-sm leading-6 text-slate-700">
                          Category 3 electronics / Category 5 Part 2 comparison
                        </p>
                        <p className="mt-2 text-xs leading-5 text-slate-500">
                          Prior records are comparison context only; reviewer confirmation remains required.
                        </p>
                      </div>
                      <div className="rounded-xl border border-slate-200 bg-[var(--substrata-fog)] p-4">
                        <p className="text-sm font-semibold text-[var(--substrata-ink)]">
                          Reviewer questions
                        </p>
                        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-slate-600">
                          <li>Confirm encryption accessibility</li>
                          <li>Confirm package / order-code scope</li>
                          <li>Verify applicable CCL threshold mapping</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="grid gap-px border-t border-slate-200 bg-slate-200 md:grid-cols-2">
                  {['Memo status: Ready for human signoff', 'Evidence package linked to source record'].map((item) => (
                    <div key={item} className="bg-white px-5 py-4 text-sm font-medium text-slate-700">
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </aside>
          </div>
        </div>
      </Surface>

      <Surface tint="fog" id="workflow">
        <div className="mx-auto max-w-7xl px-5 py-16 md:px-8">
          <SectionTitle
            eyebrow="Company-aware workflow"
            title="From company records to human-review-ready classification."
            body="Substrata brings together source documents, technical fact extraction, prior classification history, company-aware review paths, memo drafting, and reviewer signoff in one structured workflow."
          />
          <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {workflowSteps.map((item) => (
              <div
                key={item.step}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="font-mono text-xs font-semibold text-[var(--substrata-cyan)]">
                    {item.step}
                  </p>
                  <StatusPill tone={item.step === '03' || item.step === '04' ? 'info' : item.step === '06' ? 'warning' : 'default'}>
                    {item.status}
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

      <Surface tint="white" id="workspace">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-16 md:px-8 lg:grid-cols-[0.9fr_1.1fr]">
          <SectionTitle
            eyebrow="Compliance workspace"
            title="Dense review surfaces for serious classification work."
            body="Substrata is organized around source documents, prior company records, extracted facts, company-aware review paths, memo drafts, human review status, and audit history."
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
                  Company-aware review paths
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

      <Surface tint="ink" id="trust">
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
                  Bring company records and source packages into one cited ECCN review workflow.
                </h2>
                <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600">
                  Review teams get extracted technical facts, comparable prior internal material, company-aware review paths, and a memo draft tied to source evidence and an audit trail.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <CTA href="/app">Create company workspace</CTA>
                <CTA href={consultationHref} variant="secondary">
                  Schedule a consultation
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
              <a href={consultationHref} target="_blank" rel="noreferrer" className="hover:text-white">
                Talk to our team
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
