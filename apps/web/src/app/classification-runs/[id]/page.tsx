import { fetchRun } from '../../../lib/api';
import { ApiNotice, EmptyState } from '../../../components/api-state';
import { Badge, Panel, Shell } from '../../../components/ui';
import { MarkdownRenderer } from '../../../components/markdown-renderer';
import { ReviewActionForm } from '../../../components/review-action-form';
import type { ExtractedSpecRecord } from '../../../lib/types';

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000';

function toneForStatus(status: string): 'warning' | 'success' | 'default' {
  if (status === 'reviewed' || status === 'completed') {
    return 'success';
  }
  if (status === 'rejected' || status === 'needs_more_information') {
    return 'warning';
  }
  return 'default';
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
  converter_performance: 'Converter/performance specs',
  digital_interface: 'Digital interface/output specs',
  rf_microwave: 'RF/input-frequency specs',
  application_context: 'Application/context language',
  compute_processor: 'Compute/processor specs',
  environmental_qualification: 'Environmental/qualification specs',
  security_cryptography: 'Security/cryptography indicators',
  packaging_lifecycle: 'Power/package specs',
};

const factDisplayLabels: Record<string, string> = {
  manufacturer: 'Manufacturer',
  part_number: 'Part Number',
  product_family: 'Product Family',
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
  jesd_interface: 'JESD Interface',
  jesd_other_references: 'Other JESD References Found',
  digital_interface: 'Digital Interface',
  serial_lane_rate: 'Serial Lane Rate',
  interface_lane_count: 'Lane Count',
  application_examples: 'Application Examples',
  specialized_application_language: 'Specialized Application Language',
  operating_temperature_range: 'Operating Temperature Range',
  radiation_tolerance: 'Radiation Tolerance',
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

function runModeLabel(generatedBy?: string | null) {
  if (generatedBy?.includes(':gemini:')) {
    return 'AI-assisted extraction';
  }
  if (generatedBy?.includes('heuristic_fallback')) {
    return 'heuristic fallback';
  }
  return 'heuristic';
}

function detectedProfile(specs: ExtractedSpecRecord[]) {
  return specs.find((spec) => spec.name === 'product_profile')?.value ?? 'Unknown';
}

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
  const memoGeneratedBy = run.reviewMemo?.generatedBy ?? null;
  const reviewStatus =
    latestReview?.status === 'approved'
      ? 'reviewed'
      : latestReview?.status === 'in_review'
        ? 'pending_review'
        : (latestReview?.status ?? 'pending_review');

  return (
    <Shell
      eyebrow="Classification Run"
      title={`Run ${run.id} for ${run.document.title}`}
      headerActions={
        <a
          href={`${API_BASE}/classification-runs/${run.id}/memo/download`}
          className="inline-flex items-center rounded-full bg-ink px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-steel"
        >
          Download memo markdown
        </a>
      }
    >
      <ApiNotice fallback={result.fallback} error={result.error} />
      <Panel className="mb-6 border-amber-200 bg-amber-50">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-900">
          Draft for expert review
        </p>
        <p className="mt-2 text-sm leading-6 text-amber-950">
          Draft for expert review only — not a final ECCN determination.
        </p>
      </Panel>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_1.2fr_0.9fr]">
        <Panel>
          <h2 className="text-xl font-semibold text-ink">Document summary</h2>
          <div className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
            <p>
              <span className="font-medium text-ink">File:</span>{' '}
              {run.document.fileName}
            </p>
            <p>
              <span className="font-medium text-ink">Type:</span>{' '}
              {run.document.mimeType}
            </p>
            <p>
              <span className="font-medium text-ink">Size:</span>{' '}
              {run.document.sizeBytes ?? 'Unknown'} bytes
            </p>
            <p>
              <span className="font-medium text-ink">Storage path:</span>{' '}
              {run.document.storagePath}
            </p>
            <p>
              <span className="font-medium text-ink">Run status:</span>{' '}
              <Badge tone={toneForStatus(run.status)}>{run.status}</Badge>
            </p>
            <p>
              <span className="font-medium text-ink">Worker mode:</span>{' '}
              <Badge tone={memoGeneratedBy?.includes(':gemini:') ? 'success' : 'warning'}>
                {runModeLabel(memoGeneratedBy)}
              </Badge>
            </p>
            <p>
              <span className="font-medium text-ink">Detected profile:</span>{' '}
              {detectedProfile(run.extractedSpecs)}
            </p>
            <p>
              <span className="font-medium text-ink">Summary:</span>{' '}
              {run.document.summary ?? 'No summary available.'}
            </p>
          </div>

          <div className="mt-6">
            <h3 className="text-lg font-semibold text-ink">
              Extracted facts from the uploaded datasheet
            </h3>
            {run.extractedSpecs.length === 0 ? (
              <div className="mt-4">
                <EmptyState
                  title="No extracted specs"
                  body="The worker did not emit structured technical parameters for this run."
                />
              </div>
            ) : (
              <div className="mt-4 space-y-6">
                {groupedSpecs.map(([category, specs]) => (
                  <div key={category} className="space-y-4">
                    <div className="flex items-center justify-between gap-3">
                      <h4 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
                        {factCategoryLabels[category] ?? category.replace(/_/g, ' ')}
                      </h4>
                      <Badge tone="default">{specs.length} facts</Badge>
                    </div>
                    {specs.map((spec) => (
                      <div
                        key={spec.id}
                        className="rounded-2xl border border-slate-200 p-4"
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
                        <p className="mt-3 rounded-2xl bg-slate-50 px-3 py-2 text-sm italic text-slate-600">
                          "{spec.sourceSnippet}"
                        </p>
                        <p className="mt-3 text-sm leading-6 text-slate-600">
                          {spec.importance}
                        </p>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        </Panel>

        <Panel>
          <h2 className="text-xl font-semibold text-ink">ECCN review paths</h2>
          {run.eccnCandidates.length === 0 ? (
            <div className="mt-5">
              <EmptyState
                title="No ECCN candidates"
                body="This run does not yet contain candidate classifications."
              />
            </div>
          ) : (
            <div className="mt-5 space-y-5">
              {run.eccnCandidates.map((candidate) => (
                <div
                  key={candidate.id}
                  className="rounded-[24px] border border-slate-200 bg-slate-50 p-5"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-lg font-semibold text-ink">{candidate.eccn}</p>
                      <p className="text-sm text-slate-600">{candidate.title}</p>
                    </div>
                    <Badge tone={toneForStatus(candidate.confidence)}>
                      {candidate.confidence}
                    </Badge>
                  </div>

                  <div className="mt-4 space-y-4 text-sm leading-6 text-slate-700">
                    <div>
                      <p className="font-medium text-ink">Matched technical facts</p>
                      <ul className="mt-2 space-y-2 text-slate-600">
                        {candidate.matchedTechnicalFacts.map((fact) => (
                          <li key={fact}>{fact}</li>
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
                      <p className="font-medium text-ink">Regulatory citations</p>
                      <div className="mt-3 space-y-3">
                        {candidate.regulatoryCitations.map((citation) => (
                          <div
                            key={`${candidate.id}-${citation.citationLabel}-${citation.source}`}
                            className="rounded-2xl border border-slate-200 bg-white p-4"
                          >
                            <p className="font-medium text-ink">{citation.citationLabel}</p>
                            <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-500">
                              {citation.source}
                            </p>
                            <p className="mt-3 text-slate-700">{citation.citationText}</p>
                            <p className="mt-2 text-slate-500">{citation.relevance}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="font-medium text-ink">Missing information</p>
                      <ul className="mt-2 space-y-2 text-slate-600">
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

                    <div>
                      <p className="font-medium text-ink">Reviewer questions</p>
                      <ul className="mt-2 space-y-2 text-slate-600">
                        {candidate.reviewerQuestions.map((question) => (
                          <li key={question}>{question}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel>
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-ink">Review state</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge tone={toneForStatus(reviewStatus)}>{reviewStatus}</Badge>
                <Badge tone="warning">Human review required</Badge>
              </div>
              {latestReview?.notes ? (
                <p className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">
                  {latestReview.notes}
                </p>
              ) : (
                <p className="mt-4 text-sm text-slate-500">
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

            <div>
              <p className="text-sm font-medium text-ink">Generated memo preview</p>
              <div className="mt-3 rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
                <MarkdownRenderer
                  markdown={
                    run.reviewMemo?.contentMarkdown ??
                    'No memo markdown is available for this run.'
                  }
                />
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-ink">Artifact list</p>
              <ul className="mt-3 space-y-2 text-sm text-slate-600">
                <li>{run.extractedTextPath ?? 'No extracted text artifact path'}</li>
                <li>
                  {run.structuredOutputPath ?? 'No structured output artifact path'}
                </li>
                <li>{run.memoArtifactPath ?? 'No memo artifact path'}</li>
              </ul>
            </div>
          </div>
        </Panel>
      </div>
    </Shell>
  );
}
