import { fetchRun } from '../../../lib/api';
import { ApiNotice, EmptyState } from '../../../components/api-state';
import { Badge, Panel, Shell } from '../../../components/ui';
import { MarkdownRenderer } from '../../../components/markdown-renderer';
import { MemoToolbar } from '../../../components/memo-toolbar';
import { ReviewActionForm } from '../../../components/review-action-form';
import type { ExtractedSpecRecord } from '../../../lib/types';

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000';

function toneForStatus(status: string): 'warning' | 'success' | 'default' {
  if (status === 'reviewed' || status === 'completed') {
    return 'success';
  }
  if (status === 'rejected' || status === 'needs_more_information' || status === 'failed') {
    return 'warning';
  }
  return 'default';
}

function displayStatus(status: string) {
  if (status === 'failed') {
    return 'Needs attention';
  }
  if (status === 'completed') {
    return 'Memo drafted';
  }
  if (status === 'running' || status === 'processing') {
    return 'Facts extracting';
  }
  if (status === 'queued' || status === 'pending') {
    return 'Uploaded';
  }
  return status.replace(/_/g, ' ');
}

function displayReviewStatus(status: string) {
  if (status === 'pending_review') {
    return 'Needs human review';
  }
  if (status === 'needs_more_information') {
    return 'Blocked';
  }
  if (status === 'reviewed' || status === 'approved') {
    return 'Approved';
  }
  return status.replace(/_/g, ' ');
}

function toneForConfidence(confidence: string): 'warning' | 'success' | 'default' {
  if (confidence === 'high') {
    return 'success';
  }
  if (confidence === 'low') {
    return 'warning';
  }
  return 'default';
}

const factCategoryLabels: Record<string, string> = {
  profile_detection: 'Profile detection',
  product_identity: 'Product identity',
  processing_system_cpu: 'Processing system / CPU',
  programmable_logic_fpga: 'Programmable logic / FPGA fabric',
  converter_performance: 'Converter/performance specs',
  digital_interface: 'Digital interfaces / high-speed I/O',
  rf_microwave: 'RF/input-frequency specs',
  application_context: 'Application/context language',
  compute_processor: 'Compute/processor specs',
  environmental_qualification: 'Environmental/qualification specs',
  security_cryptography: 'Security/cryptography indicators',
  memory_cache_integrity: 'Memory/cache integrity',
  peripheral_functions: 'Peripheral functions',
  packaging_lifecycle: 'Power/package specs',
};

const factDisplayLabels: Record<string, string> = {
  manufacturer: 'Manufacturer',
  part_number: 'Part Number',
  product_family: 'Product Family',
  product_name: 'Product Name',
  product_description: 'Product Description',
  device_type: 'Device Type',
  memory_type: 'Memory Type',
  adc_resolution: 'ADC Resolution',
  sample_rate: 'Sample Rate',
  single_channel_sample_rate: 'Single-Channel Sample Rate',
  dual_channel_sample_rate: 'Dual-Channel Sample Rate',
  channel_modes: 'Channel Modes',
  input_bandwidth: 'Analog Input Bandwidth',
  usable_input_frequency_range: 'Usable Input Frequency Range',
  analog_input_frequency_range: 'Analog Input Frequency Range',
  full_power_bandwidth: 'Full-Power Bandwidth',
  converter_architecture: 'Converter Architecture',
  processor_architecture: 'Processor Architecture',
  cpu_core: 'CPU Core',
  cpu_core_count: 'Core Count',
  realtime_cpu: 'Real-Time CPU',
  gpu: 'GPU',
  programmable_logic: 'Programmable Logic',
  processing_system: 'Processing System',
  ps_pl_integration: 'PS/PL Integration',
  memory_integrity: 'Memory/Cache Integrity',
  jesd_interface: 'JESD Interface',
  jesd_other_references: 'Other JESD References Found',
  digital_interface: 'Digital Interface',
  ethernet_mac: 'Ethernet MACs',
  pcie_interface: 'PCIe Interface',
  usb_interface: 'USB Interface',
  can_interface: 'CAN Interface',
  spi_interface: 'SPI Interface',
  i2c_interface: 'I2C Interface',
  uart_interface: 'UART Interface',
  jtag_interface: 'JTAG Interface',
  displayport_interface: 'DisplayPort Interface',
  displayport_lane_rate: 'DisplayPort Lane Rate',
  serial_lane_rate: 'Serial Lane Rate',
  interface_lane_count: 'Lane Count',
  application_examples: 'Application Examples',
  specialized_application_language: 'Specialized Application Language',
  operating_temperature_range: 'Operating Temperature Range',
  radiation_tolerance: 'Radiation Tolerance',
  secure_boot: 'Secure/Non-Secure Boot',
  cryptographic_algorithm: 'Cryptographic Algorithm',
  crypto_key_size: 'Key Size',
  peripheral_adc: 'Peripheral ADC',
  package_type: 'Package',
  power_consumption: 'Power Consumption',
  clocking_reference_note: 'Clocking/Reference Design Note',
  product_profile: 'Detected Product Profile',
  profile_confidence: 'Profile Confidence',
  profile_rationale: 'Profile Rationale',
  document_number: 'Document Number',
  document_type: 'Document Type',
  is_family_overview: 'Family Overview',
};

function groupSpecs(specs: ExtractedSpecRecord[]) {
  const grouped = new Map<string, ExtractedSpecRecord[]>();
  for (const spec of specs) {
    const category = spec.category || 'product_identity';
    const existing = grouped.get(category) ?? [];
    existing.push(spec);
    grouped.set(category, existing);
  }

  return Array.from(grouped.entries()).sort((a, b) => {
    const left = factCategoryLabels[a[0]] ?? a[0];
    const right = factCategoryLabels[b[0]] ?? b[0];
    return left.localeCompare(right);
  });
}

function memoFileName(fileName: string, title: string) {
  const baseName = fileName
    .replace(/\.[^.]+$/, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
  const fallbackTitle = title
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
  return `substrata-eccn-review-${baseName || fallbackTitle || 'memo'}.md`;
}

export default async function ClassificationRunPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await fetchRun(id);
  const run = result.data;

  if (!run) {
    return (
      <Shell eyebrow="Classification Run" title="Classification run unavailable">
        <ApiNotice fallback={result.fallback} error={result.error} />
        <EmptyState
          title="Classification run unavailable"
          body={result.error ?? 'The requested classification run could not be loaded.'}
        />
      </Shell>
    );
  }

  const latestReview = run.humanReviews[0];
  const groupedSpecs = groupSpecs(run.extractedSpecs);
  const memoMarkdown = run.reviewMemo?.contentMarkdown ?? null;
  const memoDownloadHref = `${API_BASE}/classification-runs/${run.id}/memo/download`;
  const reviewStatus =
    latestReview?.status === 'approved'
      ? 'reviewed'
      : latestReview?.status === 'in_review'
        ? 'pending_review'
        : (latestReview?.status ?? 'pending_review');

  return (
    <Shell
      eyebrow="Classification Run"
      title="ECCN Review Recommendation"
      headerActions={
        <div className="flex flex-wrap justify-end gap-2">
          <Badge tone={toneForStatus(run.status)}>{displayStatus(run.status)}</Badge>
          <Badge tone="warning">Expert review recommended</Badge>
        </div>
      }
    >
      <ApiNotice fallback={result.fallback} error={result.error} />

      <section className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <Panel className="p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Title
          </p>
          <p className="mt-3 text-sm font-medium text-ink">
            ECCN Review Recommendation
          </p>
        </Panel>
        <Panel className="p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Status
          </p>
          <div className="mt-3">
            <Badge tone="warning">Expert review recommended</Badge>
          </div>
        </Panel>
        <Panel className="p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Primary section
          </p>
          <p className="mt-3 text-sm font-medium text-ink">
            Recommended review paths
          </p>
        </Panel>
        <Panel className="p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Secondary section
          </p>
          <p className="mt-3 text-sm font-medium text-ink">
            Supporting evidence
          </p>
        </Panel>
        <Panel className="p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Tertiary section
          </p>
          <p className="mt-3 text-sm font-medium text-ink">
            Reviewer questions
          </p>
        </Panel>
      </section>

      <Panel className="mb-6 border-blue-200 bg-blue-50">
        <p className="text-sm font-semibold text-steel">
          Classification memo draft prepared for the human review queue.
        </p>
      </Panel>

      <Panel className="mb-6 overflow-hidden p-0">
        <div className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 px-5 py-4 backdrop-blur md:px-7">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                ECCN review recommendation
              </p>
              <h2 className="mt-1 text-2xl font-semibold tracking-tight text-ink">
                Recommended review paths
              </h2>
            </div>
            {memoMarkdown ? (
              <MemoToolbar
                markdown={memoMarkdown}
                downloadFilename={memoFileName(run.document.fileName, run.document.title)}
                downloadHref={memoDownloadHref}
                focusHref={`/classification-runs/${run.id}/memo`}
              />
            ) : null}
          </div>
        </div>

        <div className="border-b border-blue-200 bg-blue-50 px-5 py-3 md:px-7">
          <p className="text-sm leading-6 text-steel">
            Evidence-backed recommendations, cited review paths, and reviewer questions are grouped for signoff.
          </p>
        </div>

        <div className="bg-white px-5 py-7 md:px-8 lg:px-10">
          {run.status === 'failed' ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm leading-6 text-rose-950">
              Memo drafting needs attention for this run. No stale memo content is shown.
            </div>
          ) : memoMarkdown ? (
            <article className="mx-auto max-w-4xl">
              <MarkdownRenderer markdown={memoMarkdown} />
            </article>
          ) : run.status === 'processing' || run.status === 'queued' ? (
            <p className="rounded-lg border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">
              Loading memo preview...
            </p>
          ) : (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-5">
              <p className="font-medium text-ink">Memo has not been generated yet.</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Start the review assistant from the source document to generate the Markdown memo.
              </p>
            </div>
          )}
        </div>
      </Panel>

      <Panel className="mb-6">
        <div className="grid gap-6 lg:grid-cols-[0.75fr_1.25fr]">
          <div>
            <h2 className="text-xl font-semibold text-ink">Review disposition</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge tone={toneForStatus(reviewStatus)}>{displayReviewStatus(reviewStatus)}</Badge>
              <Badge tone="warning">Expert review recommended</Badge>
            </div>
            {latestReview?.notes ? (
              <p className="mt-4 rounded-lg bg-slate-50 p-4 text-sm leading-6 text-slate-700">
                {latestReview.notes}
              </p>
            ) : (
              <p className="mt-4 text-sm leading-6 text-slate-500">
                No reviewer note has been recorded yet.
              </p>
            )}
          </div>

          <ReviewActionForm
            runId={run.id}
            defaultStatus={
              reviewStatus === 'reviewed' ||
              reviewStatus === 'needs_more_information' ||
              reviewStatus === 'rejected'
                ? reviewStatus
                : 'pending_review'
            }
            defaultNote={latestReview?.notes}
          />
        </div>
      </Panel>

      <div className="space-y-4">
        <details className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm" open>
          <summary className="cursor-pointer text-xl font-semibold text-ink">
            Recommended review paths
          </summary>
          {run.eccnCandidates.length === 0 ? (
            <div className="mt-5">
              <EmptyState
                title="No recommended review paths yet"
                body="This run does not yet contain review-path recommendations."
              />
            </div>
          ) : (
            <div className="mt-5 space-y-5">
              {run.eccnCandidates.map((candidate) => (
                <div
                  key={candidate.id}
                  className="rounded-lg border border-slate-200 bg-slate-50 p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-lg font-semibold text-ink">{candidate.eccn}</p>
                      <p className="text-sm text-slate-600">{candidate.title}</p>
                    </div>
                    <Badge tone={toneForConfidence(candidate.confidence)}>
                      {candidate.confidence}
                    </Badge>
                  </div>

                  <div className="mt-4 grid gap-5 text-sm leading-6 text-slate-700 lg:grid-cols-2">
                    <div>
                      <p className="font-medium text-ink">Supporting evidence</p>
                      <ul className="mt-2 list-disc space-y-2 pl-5 text-slate-600">
                        {candidate.matchedTechnicalFacts.map((fact) => (
                          <li key={fact}>{fact}</li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <p className="font-medium text-ink">Reviewer questions</p>
                      <ul className="mt-2 list-disc space-y-2 pl-5 text-slate-600">
                        {candidate.reviewerQuestions.map((question) => (
                          <li key={question}>{question}</li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <p className="font-medium text-ink">Why it may apply</p>
                      <p className="mt-2 text-slate-600">{candidate.whyItMayApply}</p>
                    </div>

                    <div>
                      <p className="font-medium text-ink">Why it may not apply</p>
                      <p className="mt-2 text-slate-600">{candidate.whyItMayNotApply}</p>
                    </div>

                    <div>
                      <p className="font-medium text-ink">Missing information</p>
                      <ul className="mt-2 list-disc space-y-2 pl-5 text-slate-600">
                        {candidate.missingInformation.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <p className="font-medium text-ink">Uncertainty flags</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {candidate.uncertaintyFlags.map((flag) => (
                          <Badge key={flag} tone="warning">
                            {flag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="mt-5">
                    <p className="font-medium text-ink">Citations</p>
                    <div className="mt-3 grid gap-3 lg:grid-cols-2">
                      {candidate.regulatoryCitations.map((citation, citationIndex) => (
                        <div
                          key={`${candidate.id}-${citation.citationLabel}-${citation.source}-${citationIndex}`}
                          className="rounded-lg border border-slate-200 bg-white p-4 text-sm leading-6"
                        >
                          <p className="font-medium text-ink">{citation.citationLabel}</p>
                          <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-500">
                            {citation.source}
                          </p>
                          <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-slate-700">
                            {citation.citationText}
                          </p>
                          <p className="mt-2 text-slate-500">{citation.relevance}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </details>

        <details className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <summary className="cursor-pointer text-xl font-semibold text-ink">
            Supporting evidence
          </summary>
          {run.extractedSpecs.length === 0 ? (
            <div className="mt-5">
              <EmptyState
                title="No extracted specs"
                body="The worker did not emit structured technical parameters for this run."
              />
            </div>
          ) : (
            <div className="mt-5 space-y-6">
              {groupedSpecs.map(([category, specs]) => (
                <div key={category} className="space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
                      {factCategoryLabels[category] ?? category.replace(/_/g, ' ')}
                    </h3>
                    <Badge tone="default">{specs.length} facts</Badge>
                  </div>
                  <div className="grid gap-4 lg:grid-cols-2">
                    {specs.map((spec) => (
                      <div
                        key={spec.id}
                        className="rounded-lg border border-slate-200 p-4"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-medium text-ink">
                            {factDisplayLabels[spec.name] ?? spec.name.replace(/_/g, ' ')}
                          </p>
                          <Badge tone={toneForConfidence(spec.confidence)}>
                            {spec.confidence}
                          </Badge>
                        </div>
                        <p className="mt-2 text-sm text-slate-700">
                          {spec.value} {spec.unit ?? ''}
                        </p>
                        <p className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm italic leading-6 text-slate-600">
                          "{spec.sourceSnippet}"
                        </p>
                        <p className="mt-3 text-sm leading-6 text-slate-600">
                          {spec.importance}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </details>

        <details className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <summary className="cursor-pointer text-xl font-semibold text-ink">
            Reviewer questions
          </summary>
          {run.eccnCandidates.length === 0 ? (
            <div className="mt-5">
              <EmptyState
                title="No reviewer questions yet"
                body="Recommended review paths will include reviewer questions when available."
              />
            </div>
          ) : (
            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              {run.eccnCandidates.map((candidate) => (
                <div key={`${candidate.id}-questions`} className="rounded-lg border border-slate-200 bg-slate-50 p-5">
                  <p className="font-semibold text-ink">{candidate.eccn}</p>
                  <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-slate-600">
                    {candidate.reviewerQuestions.map((question) => (
                      <li key={question}>{question}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </details>

        <details className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <summary className="cursor-pointer text-xl font-semibold text-ink">
            Artifacts
          </summary>
          <dl className="mt-5 grid gap-4 text-sm leading-6 text-slate-600 lg:grid-cols-3">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <dt className="font-medium text-ink">Extracted text</dt>
              <dd className="mt-2 break-words">{run.extractedTextPath ?? 'Not available'}</dd>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <dt className="font-medium text-ink">Structured output</dt>
              <dd className="mt-2 break-words">{run.structuredOutputPath ?? 'Not available'}</dd>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <dt className="font-medium text-ink">Markdown memo</dt>
              <dd className="mt-2 break-words">{run.memoArtifactPath ?? 'Not available'}</dd>
            </div>
          </dl>
        </details>
      </div>
    </Shell>
  );
}
