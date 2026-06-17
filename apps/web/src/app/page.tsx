import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';

const workflowSteps = [
  {
    step: '01',
    title: 'Upload datasheet',
    description:
      'Start with a semiconductor or advanced hardware datasheet, product brief, or technical appendix.',
  },
  {
    step: '02',
    title: 'Extract export-relevant specs',
    description:
      'Identify performance thresholds, interface rates, process node details, radiation tolerance, and other classification-relevant facts.',
  },
  {
    step: '03',
    title: 'Compare against CCL / EAR criteria',
    description:
      'Map extracted technical details against control text, thresholds, notes, and candidate control pathways.',
  },
  {
    step: '04',
    title: 'Generate review packet',
    description:
      'Produce candidate ECCNs, citation-backed reasoning, uncertainty flags, reviewer notes, and a memo draft for approval.',
  },
];

const features = [
  'Datasheet parsing',
  'Export-relevant spec extraction',
  'ECCN candidate analysis',
  'Citation-backed reasoning',
  'Human review workflow',
  'Memo generation',
  'Audit trail',
  'Team review history',
];

const audiences = [
  'Export Control Managers',
  'Global Trade Compliance Directors',
  'Semiconductor operations teams',
  'Hardware companies scaling international sales',
  'Teams hiring foreign-national engineers',
  'Compliance teams supporting engineering and sales',
];

const differentiators = [
  'Purpose-built for datasheet-to-ECCN review',
  'Evidence-first, citation-backed outputs',
  'Designed for human approval',
  'Focused on semiconductor and advanced hardware workflows',
  'Produces review packets, not vague answers',
];

function SectionTitle({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="max-w-3xl">
      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-700">
        {eyebrow}
      </p>
      <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 md:text-4xl">
        {title}
      </h2>
      {description ? (
        <p className="mt-4 text-base leading-7 text-slate-600">{description}</p>
      ) : null}
    </div>
  );
}

function CTAButton({
  href,
  variant = 'primary',
  children,
}: {
  href: string;
  variant?: 'primary' | 'secondary';
  children: ReactNode;
}) {
  const styles =
    variant === 'primary'
      ? 'bg-slate-950 text-white hover:bg-sky-800'
      : 'border border-slate-300 bg-white text-slate-900 hover:border-sky-300 hover:bg-sky-50';

  return (
    <Link
      href={href}
      className={`inline-flex items-center justify-center rounded-full px-5 py-3 text-sm font-medium transition ${styles}`}
    >
      {children}
    </Link>
  );
}

function MetricChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white/85 px-4 py-3 shadow-sm backdrop-blur">
      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{label}</p>
      <p className="mt-2 text-lg font-semibold text-slate-950">{value}</p>
    </div>
  );
}

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(15,23,42,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.04)_1px,transparent_1px)] bg-[size:48px_48px]" />
        <div className="absolute left-0 top-0 h-[28rem] w-[28rem] rounded-full bg-sky-300/20 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-[24rem] w-[24rem] rounded-full bg-blue-400/10 blur-3xl" />
      </div>

      <div className="mx-auto max-w-7xl px-6 py-6 md:px-10">
        <header className="sticky top-4 z-20 rounded-[28px] border border-white/70 bg-white/80 px-5 py-4 shadow-panel backdrop-blur">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <Link href="/" className="flex items-center gap-3">
              <Image
                src="/brand/substrata-mark.png"
                alt="Substrata mark"
                width={44}
                height={44}
                className="h-11 w-11"
                priority
              />
              <div>
                <p className="text-lg font-semibold tracking-tight text-slate-950">
                  Substrata
                </p>
                <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
                  Export Compliance Intelligence
                </p>
              </div>
            </Link>

            <nav className="flex flex-wrap items-center gap-4 text-sm text-slate-600">
              <Link className="transition hover:text-slate-950" href="#workflow">
                Workflow
              </Link>
              <Link className="transition hover:text-slate-950" href="#product-preview">
                Product
              </Link>
              <Link className="transition hover:text-slate-950" href="#differentiation">
                Why Substrata
              </Link>
              <Link className="transition hover:text-slate-950" href="#early-access">
                Early access
              </Link>
            </nav>
          </div>
        </header>

        <section className="grid gap-10 pb-20 pt-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          <div>
            <div className="inline-flex rounded-full border border-sky-200 bg-sky-50 px-4 py-2 text-xs font-medium uppercase tracking-[0.28em] text-sky-900">
              Datasheet-to-ECCN review assistant
            </div>
            <h1 className="mt-7 max-w-4xl text-5xl font-semibold tracking-tight text-slate-950 md:text-7xl">
              Classify hardware exports from datasheets, faster.
            </h1>
            <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-600 md:text-xl">
              Substrata reviews semiconductor and advanced hardware datasheets,
              extracts export-relevant specs, maps them to ECCN candidates with
              citations, and generates a review-ready classification memo for
              human approval.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <CTAButton href="/dashboard">Go to Dashboard</CTAButton>
              <CTAButton href="/documents/new" variant="secondary">
                Upload Datasheet for Review
              </CTAButton>
              <CTAButton href="#workflow" variant="secondary">
                See example workflow
              </CTAButton>
            </div>
            <p className="mt-5 text-sm text-slate-500">
              Built for export control, trade compliance, and global operations
              teams.
            </p>

            <div className="mt-10 grid gap-3 sm:grid-cols-3">
              <MetricChip label="Primary input" value="Datasheets and spec sheets" />
              <MetricChip label="Primary output" value="Draft review packet" />
              <MetricChip label="Approval model" value="Human reviewer required" />
            </div>
          </div>

          <div className="relative">
            <div className="absolute -left-6 -top-6 hidden h-32 w-32 rounded-full border border-sky-200 bg-sky-100/60 blur-2xl md:block" />
            <div className="relative overflow-hidden rounded-[32px] border border-slate-200 bg-slate-950 p-5 shadow-[0_30px_100px_rgba(15,23,42,0.22)]">
              <div className="mb-4 flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-400">
                    Review Run
                  </p>
                  <p className="mt-1 text-sm font-medium text-white">
                    ORION-X7 Edge Accelerator Datasheet
                  </p>
                </div>
                <span className="rounded-full bg-amber-400/15 px-3 py-1 text-xs font-medium text-amber-200">
                  Needs reviewer confirmation
                </span>
              </div>

              <div className="grid gap-4">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-white">
                      Extracted export-relevant specs
                    </p>
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                      6 signals
                    </p>
                  </div>
                  <div className="mt-4 space-y-3 text-sm text-slate-200">
                    <div className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2">
                      <span>Process node</span>
                      <span className="font-medium text-sky-300">7 nm</span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2">
                      <span>SerDes throughput</span>
                      <span className="font-medium text-sky-300">112 Gbps</span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2">
                      <span>Radiation tolerance</span>
                      <span className="font-medium text-amber-200">Present</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-sm font-medium text-white">Reasoning draft</p>
                  <p className="mt-3 text-sm leading-7 text-slate-300">
                    Candidate ECCN <span className="font-semibold text-white">3A001</span>{' '}
                    identified due to performance-oriented semiconductor
                    characteristics. Review should confirm whether extracted
                    throughput and packaging details map to a narrower control.
                  </p>
                  <div className="mt-4 rounded-xl border border-sky-400/20 bg-sky-400/10 p-3 text-sm text-sky-100">
                    Relevant citation: Category 3 control text review required for
                    semiconductor performance thresholds and related technical notes.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-slate-200/80 py-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <p className="text-sm font-medium uppercase tracking-[0.24em] text-slate-500">
              Built for technical export classification reviews
            </p>
            <div className="flex flex-wrap gap-3 text-sm text-slate-600">
              <span className="rounded-full border border-slate-200 bg-white px-4 py-2">
                Semiconductor
              </span>
              <span className="rounded-full border border-slate-200 bg-white px-4 py-2">
                Advanced electronics
              </span>
              <span className="rounded-full border border-slate-200 bg-white px-4 py-2">
                Aerospace-adjacent hardware
              </span>
              <span className="rounded-full border border-slate-200 bg-white px-4 py-2">
                Robotics and edge compute
              </span>
            </div>
          </div>
        </section>

        <section className="grid gap-8 py-20 lg:grid-cols-[0.85fr_1.15fr]">
          <SectionTitle
            eyebrow="The Problem"
            title="ECCN reviews should not start from a blank memo."
            description="Hardware compliance teams need faster first-pass analysis without sacrificing evidence quality, traceability, or human judgment."
          />
          <div className="grid gap-4">
            {[
              'Datasheets contain export-relevant technical details, but reviewers still manually hunt for specs.',
              'ECCN reasoning is scattered across rules, notes, thresholds, and citations.',
              'Classification memos need evidence, traceability, and human judgment.',
              'Growing hardware companies need faster reviews without losing auditability.',
            ].map((item) => (
              <div
                key={item}
                className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <p className="text-base leading-7 text-slate-700">{item}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="workflow" className="py-20">
          <SectionTitle
            eyebrow="Workflow"
            title="From datasheet to review packet."
            description="Substrata is built around the evidence chain compliance teams actually need: source document, extracted technical facts, candidate classifications, supporting citations, and a memo draft ready for review."
          />

          <div className="mt-10 grid gap-4 xl:grid-cols-4">
            {workflowSteps.map((item) => (
              <div
                key={item.step}
                className="group rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-sky-200 hover:shadow-lg"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold uppercase tracking-[0.24em] text-sky-700">
                    {item.step}
                  </span>
                  <span className="h-3 w-3 rounded-full bg-sky-500 shadow-[0_0_0_6px_rgba(14,165,233,0.12)]" />
                </div>
                <h3 className="mt-6 text-xl font-semibold text-slate-950">
                  {item.title}
                </h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section
          id="product-preview"
          className="grid gap-8 py-20 lg:grid-cols-[0.78fr_1.22fr]"
        >
          <div>
            <SectionTitle
              eyebrow="Product Preview"
              title="A review surface built for trade compliance teams."
              description="The output is not a generic answer. It is a structured packet designed to help a reviewer inspect the source facts, evaluate candidate ECCNs, and edit a memo draft before approval."
            />
            <div className="mt-6 inline-flex items-center gap-3 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 shadow-sm">
              <Image
                src="/brand/jungle-grid-logo.png"
                alt="Jungle Grid logo"
                width={20}
                height={20}
                className="h-5 w-5 object-contain"
              />
              <span>
                Document analysis and review workflows powered by Jungle Grid.
              </span>
            </div>
          </div>

          <div className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-[0_24px_100px_rgba(15,23,42,0.12)]">
            <div className="grid gap-px bg-slate-200 lg:grid-cols-[0.92fr_1.08fr]">
              <div className="space-y-4 bg-slate-50 p-5">
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-950">
                      Extracted specs
                    </p>
                    <span className="text-xs uppercase tracking-[0.2em] text-slate-400">
                      Normalized
                    </span>
                  </div>
                  <div className="mt-4 space-y-3 text-sm">
                    {[
                      ['Process node', '7 nm'],
                      ['SerDes throughput', '112 Gbps'],
                      ['Peak INT8 throughput', '180 TOPS'],
                      ['Radiation-tolerant packaging', 'Referenced'],
                    ].map(([label, value]) => (
                      <div
                        key={label}
                        className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2"
                      >
                        <span className="text-slate-600">{label}</span>
                        <span className="font-medium text-slate-950">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="text-sm font-semibold text-slate-950">
                    Human reviewer notes
                  </p>
                  <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm leading-7 text-slate-600">
                    Confirm whether the device is marketed solely for commercial
                    edge inference or whether any space / radiation-resilient
                    deployment claims trigger narrower review.
                  </div>
                </div>
              </div>

              <div className="space-y-4 bg-white p-5">
                <div className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-950">
                      Candidate ECCNs
                    </p>
                    <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-900">
                      Needs reviewer confirmation
                    </span>
                  </div>
                  <div className="mt-4 space-y-3">
                    <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4">
                      <div className="flex items-center justify-between">
                        <p className="text-lg font-semibold text-slate-950">3A001</p>
                        <span className="text-sm font-medium text-sky-900">
                          Confidence: medium
                        </span>
                      </div>
                      <p className="mt-3 text-sm leading-7 text-slate-700">
                        Candidate ECCN based on performance-oriented semiconductor
                        characteristics and technical thresholds requiring closer
                        Category 3 review.
                      </p>
                      <div className="mt-4 space-y-2">
                        <div className="rounded-xl bg-white px-3 py-3 text-sm text-slate-700">
                          Relevant citation: Category 3 control text placeholder
                          reference for semiconductor performance review.
                        </div>
                        <div className="rounded-xl bg-white px-3 py-3 text-sm text-slate-700">
                          Relevant citation: Datasheet statement referencing 112
                          Gbps PAM4 SerDes support.
                        </div>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex items-center justify-between">
                        <p className="text-lg font-semibold text-slate-950">3A991</p>
                        <span className="text-sm font-medium text-slate-600">
                          Fallback candidate
                        </span>
                      </div>
                      <p className="mt-3 text-sm leading-7 text-slate-700">
                        Retained as a lower-confidence fallback if further review
                        does not support a narrower controlled category.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-950">
                      Memo preview
                    </p>
                    <span className="text-xs uppercase tracking-[0.2em] text-slate-400">
                      Reasoning draft
                    </span>
                  </div>
                  <div className="mt-4 rounded-2xl bg-slate-950 p-4 text-sm leading-7 text-slate-200">
                    <p className="font-medium text-white">Classification memo draft</p>
                    <p className="mt-3">
                      The reviewed datasheet describes an advanced semiconductor
                      device fabricated on a 7 nm process node with 112 Gbps PAM4
                      SerDes support and a stated radiation-tolerant packaging
                      option. Based on the extracted technical factors, Substrata
                      suggests 3A001 as a candidate ECCN for human review.
                    </p>
                    <p className="mt-3 text-amber-200">
                      This memo is a draft review artifact only and requires
                      compliance approval before use.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-20">
          <SectionTitle
            eyebrow="Capabilities"
            title="Purpose-built components for export classification review."
          />
          <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {features.map((feature) => (
              <div
                key={feature}
                className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-sky-200 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="text-base font-semibold text-slate-950">{feature}</p>
                  <span className="mt-1 h-2.5 w-2.5 rounded-full bg-sky-500" />
                </div>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  {feature === 'Datasheet parsing' &&
                    'Turn hardware documents into structured review inputs without starting from a blank page.'}
                  {feature === 'Export-relevant spec extraction' &&
                    'Surface the parameters reviewers actually need to inspect for ECCN analysis.'}
                  {feature === 'ECCN candidate analysis' &&
                    'Draft candidate pathways without implying final legal certainty.'}
                  {feature === 'Citation-backed reasoning' &&
                    'Tie each candidate to supporting source snippets and relevant control text.'}
                  {feature === 'Human review workflow' &&
                    'Keep approval with qualified reviewers and make uncertainty visible.'}
                  {feature === 'Memo generation' &&
                    'Create a review-ready memo draft that can be edited and approved internally.'}
                  {feature === 'Audit trail' &&
                    'Preserve run history, generated outputs, and reviewer actions for traceability.'}
                  {feature === 'Team review history' &&
                    'Maintain continuity across compliance, operations, engineering, and sales support.'}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-8 py-20 lg:grid-cols-[0.85fr_1.15fr]">
          <SectionTitle
            eyebrow="Who It Is For"
            title="Built for teams that ship controlled technology globally."
            description="Substrata is designed for organizations that need disciplined, evidence-first technical classification workflows before products move across borders, into programs, or into engineering environments."
          />
          <div className="grid gap-4 md:grid-cols-2">
            {audiences.map((audience) => (
              <div
                key={audience}
                className="rounded-[24px] border border-slate-200 bg-white px-5 py-4 shadow-sm"
              >
                <p className="text-sm font-medium text-slate-800">{audience}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="differentiation" className="py-20">
          <SectionTitle
            eyebrow="Differentiation"
            title="Not a chatbot. Not a generic compliance tool."
          />
          <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            {differentiators.map((point) => (
              <div
                key={point}
                className="rounded-[24px] border border-slate-200 bg-slate-950 p-5 text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
              >
                <p className="text-base font-semibold">{point}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="py-12">
          <div className="rounded-[32px] border border-amber-200 bg-amber-50 px-6 py-5 text-sm leading-7 text-amber-950 shadow-sm">
            Substrata is a review assistant. It does not provide legal advice or
            replace qualified export control counsel. Final classifications should
            be reviewed and approved by authorized compliance professionals.
          </div>
        </section>

        <section id="early-access" className="py-20">
          <div className="rounded-[36px] border border-slate-200 bg-slate-950 px-6 py-10 shadow-[0_30px_100px_rgba(15,23,42,0.24)] md:px-10">
            <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-300">
                  Early Access
                </p>
                <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white md:text-4xl">
                  Review your first datasheet with Substrata.
                </h2>
                <p className="mt-4 max-w-2xl text-base leading-8 text-slate-300">
                  We are working with early semiconductor and advanced hardware
                  teams to shape the product around real classification workflows.
                </p>
              </div>
              <div className="rounded-[28px] border border-white/10 bg-white/5 p-5">
                <div className="flex items-center gap-3">
                  <Image
                    src="/brand/substrata-mark.png"
                    alt="Substrata mark"
                    width={44}
                    height={44}
                    className="h-11 w-11"
                  />
                  <div>
                    <p className="text-sm font-semibold text-white">
                      Request early access
                    </p>
                    <p className="text-sm text-slate-400">
                      Join the early design partner queue.
                    </p>
                  </div>
                </div>
                <div className="mt-6 flex flex-wrap gap-3">
                  <CTAButton href="mailto:founders@substrata.ai?subject=Substrata%20Early%20Access">
                    Request early access
                  </CTAButton>
                  <CTAButton href="#workflow" variant="secondary">
                    See example workflow
                  </CTAButton>
                </div>
              </div>
            </div>
          </div>
        </section>

        <footer className="border-t border-slate-200 py-10">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <Image
                src="/brand/substrata-mark.png"
                alt="Substrata mark"
                width={40}
                height={40}
                className="h-10 w-10"
              />
              <div>
                <p className="font-semibold text-slate-950">Substrata</p>
                <p className="text-sm text-slate-500">
                  Export compliance intelligence for hardware teams.
                </p>
              </div>
            </div>
            <p className="max-w-3xl text-sm leading-7 text-slate-500">
              Evidence-first classification support for semiconductor and advanced
              hardware organizations. Draft outputs require human review and
              approval.
            </p>
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <div className="inline-flex items-center gap-3 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 shadow-sm">
              <Image
                src="/brand/jungle-grid-logo.png"
                alt="Jungle Grid logo"
                width={20}
                height={20}
                className="h-5 w-5 object-contain"
              />
              <span className="font-medium">Powered by Jungle Grid</span>
            </div>
          </div>
        </footer>
      </div>
    </main>
  );
}
