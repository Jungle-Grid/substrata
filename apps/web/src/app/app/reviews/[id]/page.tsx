import Link from 'next/link';
import { AppShell } from '../../../../components/app-shell';
import { DemoPublicationControls } from '../../../../components/demo-publication-controls';
import { ExecutionProgressRefresh } from '../../../../components/execution-progress-refresh';
import { Icon } from '../../../../components/icon';
import { MarkdownRenderer } from '../../../../components/markdown-renderer';
import { MemoDownloadLink } from '../../../../components/memo-download-link';
import { ReviewActionForm } from '../../../../components/review-action-form';
import { ReviewTabDeepLink } from '../../../../components/review-tab-deep-link';
import { ReviewCaseHeader } from '../../../../components/review-case-header';
import {
  Badge,
  EmptyState,
  InlineNotice,
  Panel,
  StatusBadge,
} from '../../../../components/ui';
import { buildApiUrl } from '../../../../lib/api-base';
import type {
  ClassificationRunRecord,
  FactRecord,
} from '../../../../lib/types';
import { requireCompletedOnboarding } from '../../../../lib/server-auth';
import {
  fetchServerDemoPublicationStatus,
  fetchServerRun,
} from '../../../../lib/server-api';
import { formatDateTime } from '../../../../lib/workspace';
import { groupCandidates } from '../../../../lib/candidate-groups';

const tabs = [
  { id: 'overview', label: 'Overview' },
  { id: 'facts', label: 'Extracted facts' },
  { id: 'review-paths', label: 'Review paths' },
  { id: 'company-history', label: 'Company history' },
  { id: 'questions', label: 'Reviewer questions' },
  { id: 'memo', label: 'Memo draft' },
  { id: 'audit', label: 'Audit trail' },
] as const;

type TabId = (typeof tabs)[number]['id'];

function confidenceTone(value: string) {
  if (value === 'high') return 'success' as const;
  if (value === 'low') return 'warning' as const;
  return 'default' as const;
}

function tabId(value: string | string[] | undefined): TabId {
  const candidate = Array.isArray(value) ? value[0] : value;
  return tabs.some((tab) => tab.id === candidate)
    ? (candidate as TabId)
    : 'overview';
}

function Stat({
  label,
  value,
  tone = 'default',
}: {
  label: string;
  value: string | number;
  tone?: 'default' | 'warning' | 'info';
}) {
  const classes =
    tone === 'warning'
      ? 'border-amber-200 bg-amber-50'
      : tone === 'info'
        ? 'border-sky-200 bg-sky-50'
        : 'border-slate-200 bg-white';
  return (
    <div className={`min-h-24 rounded-lg border p-4 ${classes}`}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-lg font-semibold text-slate-950">{value}</p>
    </div>
  );
}

function FactCard({ fact }: { fact: FactRecord }) {
  return (
    <div className="min-w-0 rounded-lg border border-slate-200 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="font-medium capitalize text-slate-950">{fact.label}</p>
        <div className="flex flex-wrap gap-2">
          <Badge tone={confidenceTone(fact.confidence)}>
            {fact.confidence}
          </Badge>
          <Badge
            tone={
              fact.reviewerStatus === 'verified'
                ? 'success'
                : fact.reviewerStatus === 'rejected'
                  ? 'danger'
                  : 'default'
            }
          >
            {fact.reviewerStatus.replace(/_/g, ' ')}
          </Badge>
        </div>
      </div>
      <p className="mt-2 break-words text-sm text-slate-700">
        {fact.value}
        {fact.unit ? ` ${fact.unit}` : ''}
      </p>
      <p className="mt-2 text-xs uppercase tracking-[0.14em] text-slate-500">
        {fact.category} / {fact.valueType.replace(/_/g, ' ')}
      </p>
      <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-500">
        {fact.sourceSnippet}
      </p>
      {fact.reviewerNote ? (
        <p className="mt-3 rounded-md bg-amber-50 p-3 text-sm text-amber-900">
          <span className="font-medium">Reviewer note:</span>{' '}
          {fact.reviewerNote}
        </p>
      ) : null}
    </div>
  );
}

function OverviewTab({ run }: { run: ClassificationRunRecord }) {
  const reviewCandidates = run.eccnCandidates.filter(
    (candidate) => (candidate.candidateType ?? 'review_candidate') === 'review_candidate',
  );
  const blockedCandidates = run.eccnCandidates.filter(
    (candidate) => candidate.candidateType === 'blocked_candidate',
  );
  const fallbackCandidates = run.eccnCandidates.filter(
    (candidate) => candidate.candidateType === 'fallback_candidate',
  );
  return (
    <div className="space-y-6">
      <Panel>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <Stat
            label="Processing status"
            value={run.processingLabel ?? run.status}
          />
          <Stat label="Review paths" value={run.reviewPaths.length} />
          <Stat
            label="Potential ECCN candidates"
            value={run.eccnCandidates.length}
          />
          <Stat
            label="Fact issues"
            value={run.factIssues.length}
            tone={run.factIssues.length ? 'warning' : 'default'}
          />
          <Stat
            label="Execution mode"
            value={
              run.executionSummary?.executionMode === 'local'
                ? 'Local'
                : run.executionSummary?.executionMode === 'remote'
                  ? 'Remote'
                  : 'Not recorded'
            }
            tone="info"
          />
        </div>
        <ExecutionProgressRefresh status={run.status} />
      </Panel>
      <Panel>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">
              Company history context
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              {run.executionSummary?.companyHistoryRetrieved ||
              run.companyHistoryMatches?.length
                ? `${run.executionSummary?.companyHistoryMatchCount ?? run.companyHistoryMatches?.length ?? 0} relevant company history matches were retrieved for reviewer comparison.`
                : 'No relevant company history matches were retrieved for this run.'}
            </p>
          </div>
          <Link
            href={`/app/reviews/${run.id}?tab=company-history`}
            className="text-sm font-medium text-slate-700 underline underline-offset-4"
          >
            Review company history
          </Link>
        </div>
      </Panel>
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel>
          <h2 className="text-lg font-semibold text-slate-950">
            Source document
          </h2>
          <p className="mt-2 break-words text-sm font-medium text-slate-900">
            {run.document.fileName}
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            {run.document.summary ??
              'No source summary is available for this run yet.'}
          </p>
          <Link
            href={`/app/documents/${run.document.id}`}
            className="mt-4 inline-flex text-sm font-medium text-slate-700 underline underline-offset-4"
          >
            Open source document
          </Link>
        </Panel>
        <Panel>
          <h2 className="text-lg font-semibold text-slate-950">
            Recommended review paths
          </h2>
          <div className="mt-4 overflow-hidden rounded-lg border border-slate-200">
            {reviewCandidates.length ? (
              <div className="flex items-start gap-3 border-b border-slate-200 bg-sky-50/60 px-4 py-3">
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-sky-600" aria-hidden="true" />
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-sky-800">Active review</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {reviewCandidates.map((candidate) => (
                      <Badge key={candidate.id} tone="info">{candidate.eccn}</Badge>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}
            {blockedCandidates.length ? (
              <div className="flex items-start gap-3 border-b border-slate-200 bg-amber-50/70 px-4 py-3">
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-amber-500" aria-hidden="true" />
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-amber-900">Evidence required</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {blockedCandidates.map((candidate) => (
                      <Badge key={candidate.id} tone="warning">{candidate.eccn}</Badge>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}
            {fallbackCandidates.length ? (
              <div className="flex items-start gap-3 bg-slate-50 px-4 py-3">
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-slate-400" aria-hidden="true" />
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">Fallback after exclusion</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {fallbackCandidates.map((candidate) => (
                      <Badge key={candidate.id}>{candidate.eccn}</Badge>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}
            {!reviewCandidates.length && !blockedCandidates.length && !fallbackCandidates.length ? (
              <p className="px-4 py-3 text-sm text-slate-600">No review candidates were generated from the available source evidence.</p>
            ) : null}
          </div>
          {run.finalInternalRecommendation ? (
            <div className="mt-4 border-t border-slate-200 pt-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                Recorded human conclusion
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-700">
                {run.finalInternalRecommendation}
              </p>
            </div>
          ) : null}
          {run.uncertaintyFlags.length ? (
            <div className="mt-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                Uncertainty flags
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {run.uncertaintyFlags.map((flag) => (
                  <Badge key={flag} tone="warning">{flag.replace(/_/g, ' ')}</Badge>
                ))}
              </div>
            </div>
          ) : null}
        </Panel>
      </div>
    </div>
  );
}

function ProcessingRunState({ run }: { run: ClassificationRunRecord }) {
  return (
    <Panel className="overflow-hidden p-0">
      <div className="border-b border-slate-200 bg-slate-50 px-5 py-4 sm:px-6">
        <div className="flex items-center gap-3">
          <span
            className="flex h-9 w-9 shrink-0 animate-spin items-center justify-center rounded-full border-2 border-sky-200 border-t-sky-700"
            aria-hidden="true"
          />
          <div>
            <p className="text-sm font-semibold text-slate-950">
              Analysis in progress
            </p>
            <p className="mt-0.5 text-sm text-slate-600">
              Substrata is preparing extracted technical facts and cited review paths.
            </p>
          </div>
        </div>
        <ExecutionProgressRefresh status={run.status} />
      </div>
      <div className="grid divide-y divide-slate-200 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        {[
          ['Source document', 'Reading the uploaded material'],
          ['Technical facts', 'Extracting source-backed details'],
          ['Review output', 'Preparing review paths and memo draft'],
        ].map(([label, detail]) => (
          <div key={label} className="p-5 sm:p-6">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
              {label}
            </p>
            <div className="mt-3 h-2 w-20 animate-pulse rounded-full bg-slate-200" />
            <p className="mt-3 text-sm leading-6 text-slate-600">{detail}</p>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function FactsTab({ run }: { run: ClassificationRunRecord }) {
  const groups = Array.from(
    new Set(run.extractedSpecs.map((fact) => fact.category || 'Other')),
  );
  return (
    <div className="space-y-6">
      <Panel>
        <h2 className="text-lg font-semibold text-slate-950">
          Extracted technical facts
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          Source-grounded facts used to support the cited review paths.
        </p>
      </Panel>
      {run.extractedSpecs.length === 0 ? (
        <Panel>
          <EmptyState
            title="No extracted facts available for this run"
            body="The current run has not produced extracted technical facts yet."
          />
        </Panel>
      ) : (
        groups.map((group) => (
          <Panel key={group}>
            <h2 className="text-base font-semibold capitalize text-slate-950">
              {group}
            </h2>
            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              {run.extractedSpecs
                .filter((fact) => (fact.category || 'Other') === group)
                .map((fact) => (
                  <FactCard key={fact.id} fact={fact} />
                ))}
            </div>
          </Panel>
        ))
      )}
      {run.factIssues.length ? (
        <Panel>
          <h2 className="text-lg font-semibold text-slate-950">
            Open contradictions and scope warnings
          </h2>
          <div className="mt-4 space-y-3">
            {run.factIssues.map((issue) => (
              <div
                key={issue.id}
                className="rounded-lg border border-amber-200 bg-amber-50 p-4"
              >
                <p className="font-medium text-amber-950">{issue.summary}</p>
                {issue.details ? (
                  <p className="mt-2 text-sm text-amber-900">{issue.details}</p>
                ) : null}
              </div>
            ))}
          </div>
        </Panel>
      ) : null}
    </div>
  );
}

function ReviewPathsTab({ run }: { run: ClassificationRunRecord }) {
  const latestReview = run.humanReviews[0];
  const { reviewCandidates, fallbackCandidates, blockedCandidates } = groupCandidates(
    run.eccnCandidates,
  );
  const hasReviewPaths = run.reviewPaths.length > 0;
  const hasCandidates = run.eccnCandidates.length > 0;
  const candidateCard = (candidate: (typeof run.eccnCandidates)[number]) => (
    <div key={candidate.id} className="rounded-lg border border-slate-200 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-sm font-semibold text-slate-950">{candidate.eccn}</p>
          <p className="mt-1 text-sm text-slate-600">{candidate.officialTitle || candidate.title}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge tone={candidate.candidateType === 'fallback_candidate' ? 'warning' : confidenceTone(candidate.confidence)}>
            {candidate.candidateType === 'blocked_candidate' ? 'Evidence required' : candidate.candidateType === 'fallback_candidate' ? 'Fallback path' : 'Review candidate'}
          </Badge>
          <Badge tone={confidenceTone(candidate.confidence)}>{candidate.confidence} evidence</Badge>
          <Badge tone="warning">Human review required</Badge>
        </div>
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-700"><span className="font-medium">Why it may apply:</span> {candidate.whyItMayApply}</p>
      <p className="mt-2 text-sm leading-6 text-slate-600"><span className="font-medium">Why it may not apply:</span> {candidate.whyItMayNotApply}</p>
      {candidate.matchedTechnicalFacts.length ? (
        <div className="mt-3"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Supporting facts</p><ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">{candidate.matchedTechnicalFacts.slice(0, 5).map((fact) => <li key={fact}>{fact}</li>)}</ul></div>
      ) : null}
      {candidate.missingInformation.length ? <div className="mt-3 rounded-md bg-amber-50 p-3 text-sm text-amber-900"><span className="font-medium">Missing evidence:</span> {candidate.missingInformation.slice(0, 4).join('; ')}</div> : null}
      {candidate.companyHistorySupport?.length ? <div className="mt-3 rounded-md bg-sky-50 p-3 text-sm text-sky-900"><span className="font-medium">Company history influence:</span> Similar internal material increases review priority only; it is not classification authority.</div> : null}
      {candidate.reviewerQuestions.length ? <p className="mt-3 text-sm text-slate-700"><span className="font-medium">Reviewer action:</span> {candidate.reviewerQuestions[0]}</p> : null}
    </div>
  );
  return (
    <div className="space-y-6">
      <Panel>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">
              Recommended review paths
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Cited review paths and potential candidates for qualified human
              evaluation.
            </p>
          </div>
          <div className="text-sm text-slate-600">
            Reviewer: {latestReview?.reviewer?.name ?? 'Unassigned'}
            <br />
            Updated:{' '}
            {formatDateTime(
              latestReview?.reviewedAt ?? run.completedAt ?? run.createdAt,
            )}
          </div>
        </div>
      </Panel>
      {!hasReviewPaths && !hasCandidates ? (
        <Panel>
          <EmptyState
            title="No review paths generated yet"
            body="This run has not produced review paths or ECCN candidates."
          />
        </Panel>
      ) : hasReviewPaths ? (
        run.reviewPaths.map((path) => (
          <Panel key={path.id}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-semibold text-slate-950">{path.title}</h2>
                <p className="mt-1 text-sm text-slate-600">{path.scope}</p>
              </div>
              <StatusBadge status={path.status} />
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-700">
              {path.whyTriggered}
            </p>
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Supporting facts
                </p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">
                  {path.supportingFacts.map((fact) => (
                    <li key={fact.id}>
                      {fact.label}: {fact.value}
                      {fact.unit ? ` ${fact.unit}` : ''}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Missing information
                </p>
                {path.missingInformation.length ? (
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">
                    {path.missingInformation.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-sm text-slate-500">
                    No missing information recorded.
                  </p>
                )}
              </div>
            </div>
            {path.reviewerQuestions.length ? (
              <div className="mt-4 rounded-md bg-amber-50 p-3 text-sm text-amber-900">
                <span className="font-medium">Reviewer questions:</span>{' '}
                {path.reviewerQuestions.join(' ')}
              </div>
            ) : null}
            {path.regulatoryCitations.length ? (
              <div className="mt-4 border-t border-slate-200 pt-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Cited review path basis
                </p>
                <div className="mt-2 space-y-3">
                  {path.regulatoryCitations.map((citation) => (
                    <div
                      key={citation.id ?? citation.citationLabel}
                      className="rounded-lg bg-slate-50 p-3"
                    >
                      <p className="text-sm font-medium text-slate-950">
                        {citation.citationLabel}
                      </p>
                      <p className="mt-1 text-sm text-slate-600">
                        {citation.citationText}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {citation.source} / {citation.relevance}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </Panel>
        ))) : (
        <InlineNotice tone="info" title="Candidate review paths found">
          Substrata found ECCN review candidates, but no finalized review-path package has been recorded yet. A qualified reviewer should confirm the applicable path.
        </InlineNotice>
      )}
      {hasCandidates ? (
      <Panel>
        <h2 className="text-lg font-semibold text-slate-950">
          Candidate review paths requiring confirmation
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          Candidate paths are source-grounded review inputs. They require qualified human confirmation before an internal conclusion is recorded.
        </p>
        {reviewCandidates.length ? (
          <>
            <h3 className="mt-5 text-sm font-semibold text-slate-950">Review candidates</h3>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {reviewCandidates.map(candidateCard)}
          </div>
          </>
        ) : null}
        {fallbackCandidates.length ? <><h3 className="mt-6 border-t border-slate-200 pt-5 text-sm font-semibold text-slate-950">Fallback candidates</h3><p className="mt-1 text-sm text-slate-600">Broad comparison points only after narrower review paths are excluded.</p><div className="mt-4 grid gap-4 lg:grid-cols-2">{fallbackCandidates.map(candidateCard)}</div></> : null}
        {blockedCandidates.length ? <><h3 className="mt-6 border-t border-slate-200 pt-5 text-sm font-semibold text-slate-950">Blocked / evidence required</h3><p className="mt-1 text-sm text-slate-600">Relevant review paths that need affirmative technical evidence before a specific candidate can be supported.</p><div className="mt-4 grid gap-4 lg:grid-cols-2">{blockedCandidates.map(candidateCard)}</div></> : null}
      </Panel>
      ) : null}
      {run.classificationTrace ? (
        <Panel>
          <h2 className="text-lg font-semibold text-slate-950">Classification trace</h2>
          <p className="mt-2 text-sm text-slate-600">
            Deterministic routing details for audit and debugging.
          </p>
          <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Backend / extraction</dt>
              <dd className="mt-1 text-sm text-slate-800">
                {String(run.classificationTrace.backendMode ?? 'legacy')} /{' '}
                {String(run.classificationTrace.extractionSource ?? 'not recorded').replace(/_/g, ' ')}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Profiles</dt>
              <dd className="mt-1 text-sm text-slate-800">
                {Array.isArray(run.classificationTrace.detectedProfiles)
                  ? run.classificationTrace.detectedProfiles.join(', ').replace(/_/g, ' ')
                  : 'Legacy run'}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Paths / signals</dt>
              <dd className="mt-1 text-sm text-slate-800">
                {Array.isArray(run.classificationTrace.reviewPathsOpened) ? run.classificationTrace.reviewPathsOpened.length : 0} paths /{' '}
                {Array.isArray(run.classificationTrace.matchedSignals) ? run.classificationTrace.matchedSignals.length : 0} signals
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Candidates shown</dt>
              <dd className="mt-1 text-sm text-slate-800">
                {reviewCandidates.length} review / {fallbackCandidates.length} fallback / {blockedCandidates.length} blocked
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">History matches</dt>
              <dd className="mt-1 text-sm text-slate-800">{Number(run.classificationTrace.companyHistoryMatchCount ?? 0)}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Contradictions</dt>
              <dd className="mt-1 text-sm text-slate-800">
                {Array.isArray(run.classificationTrace.contradictions) ? run.classificationTrace.contradictions.length : 0}
              </dd>
            </div>
          </dl>
        </Panel>
      ) : null}
    </div>
  );
}

function CompanyHistoryTab({ run }: { run: ClassificationRunRecord }) {
  const matches = run.companyHistoryMatches ?? [];
  return (
    <div className="space-y-6">
      <Panel>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">
              Company history
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Prior internal review material is reviewer context only and does
              not replace human approval.
            </p>
          </div>
          <Link
            href="/app/company-history"
            className="text-sm font-medium text-slate-700 underline underline-offset-4"
          >
            Import company history
          </Link>
        </div>
      </Panel>
      {matches.length === 0 ? (
        <Panel>
          <EmptyState
            title="No relevant company history was found for this review"
            body="This run did not retrieve comparable indexed internal reference material from this organization."
          />
        </Panel>
      ) : (
        <Panel>
          <div className="space-y-3">
            {matches.map((match) => (
              <div
                key={match.id}
                className="rounded-lg border border-slate-200 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link
                      href={`/app/company-history/documents/${match.companyHistoryDocumentId}`}
                      className="break-all font-medium text-slate-950 underline-offset-4 hover:underline"
                    >
                      {match.sourceFileName}
                    </Link>
                    <p className="mt-1 text-sm text-slate-500">
                      Imported {formatDateTime(match.importedAt)} · Relevance
                      score {Math.round(match.score * 100)}%
                    </p>
                  </div>
                  <Badge
                    tone={
                      match.matchTier === 'direct'
                        ? 'success'
                        : match.matchTier === 'partial'
                          ? 'default'
                          : 'warning'
                    }
                  >
                    {match.matchTier} internal match
                  </Badge>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-700">
                  {match.matchReasons.join('; ')}
                </p>
                <div className="mt-3 rounded-md bg-slate-50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Evidence excerpt
                  </p>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                    {match.excerpt}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      )}
      <InlineNotice tone="default">
        Internal company history supports reviewer comparison only. Qualified
        reviewer confirmation remains required.
      </InlineNotice>
    </div>
  );
}

function QuestionsTab({ run }: { run: ClassificationRunRecord }) {
  const questions = [
    ...run.reviewPaths.flatMap((path) =>
      path.reviewerQuestions.map((question) => ({
        question,
        related: path.title,
        status: path.status === 'needs_more_evidence' ? 'Blocking' : 'Open',
      })),
    ),
    ...run.eccnCandidates.flatMap((candidate) =>
      candidate.reviewerQuestions.map((question) => ({
        question,
        related: candidate.eccn,
        status: 'Open',
      })),
    ),
    ...run.uncertaintyFlags.map((flag) => ({
      question: `Clarify ${flag.replace(/_/g, ' ')} before reviewer conclusion.`,
      related: 'Uncertainty flag',
      status: 'Blocking',
    })),
  ];
  return (
    <div className="space-y-6">
      <Panel>
        <h2 className="text-lg font-semibold text-slate-950">
          Reviewer questions
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          Questions generated from missing information, cited paths, and
          uncertainty flags.
        </p>
      </Panel>
      {questions.length === 0 ? (
        <Panel>
          <EmptyState
            title="No open reviewer questions"
            body="No questions were generated for this run. Continue with the cited review paths and human reviewer conclusion."
          />
        </Panel>
      ) : (
        <Panel>
          <div className="space-y-3">
            {questions.map((item, index) => (
              <div
                key={`${item.related}-${item.question}-${index}`}
                className="rounded-lg border border-slate-200 p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="font-medium text-slate-950">{item.question}</p>
                  <Badge
                    tone={item.status === 'Blocking' ? 'warning' : 'default'}
                  >
                    {item.status}
                  </Badge>
                </div>
                <p className="mt-2 text-sm text-slate-500">
                  Related to: {item.related}
                </p>
              </div>
            ))}
          </div>
        </Panel>
      )}
    </div>
  );
}

function MemoTab({
  run,
  demoStatus,
  canReview,
  memoDownloadHref,
}: {
  run: ClassificationRunRecord;
  demoStatus: Awaited<
    ReturnType<typeof fetchServerDemoPublicationStatus>
  > | null;
  canReview: boolean;
  memoDownloadHref: string;
}) {
  const latestReview = run.humanReviews[0];
  return (
    <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="min-w-0 space-y-6">
        <Panel>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                Classification memo draft
              </p>
              <h2 className="mt-1 text-xl font-semibold text-slate-950">
                {run.document.title}
              </h2>
            </div>
            {run.reviewMemo?.contentMarkdown ? (
              <MemoDownloadLink href={memoDownloadHref} />
            ) : null}
          </div>
          {run.reviewMemo?.contentMarkdown ? (
            <div className="mt-6 max-w-none text-sm leading-7 text-slate-700">
              <MarkdownRenderer markdown={run.reviewMemo.contentMarkdown} />
            </div>
          ) : (
            <div className="mt-6">
              <EmptyState
                title="Memo draft not available"
                body="Substrata has not generated a classification memo draft for this run yet."
              />
            </div>
          )}
        </Panel>
        <Panel>
          <h2 className="text-lg font-semibold text-slate-950">
            Reviewer signoff
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Record authenticated reviewer actions, caveats, and internal
            recommendation. Human review remains required.
          </p>
          {run.validationIssues?.length ? (
            <div className="mt-4">
              <InlineNotice
                tone="error"
                title="Evidence checks require attention"
              >
                {run.validationIssues.map((issue) => issue.message).join(' ')}
              </InlineNotice>
            </div>
          ) : null}
          <div className="mt-4">
            <ReviewActionForm
              runId={run.id}
              defaultStatus={
                (latestReview?.status as
                  | 'pending_review'
                  | 'reviewed'
                  | 'approved'
                  | 'needs_more_information'
                  | 'rejected') ?? 'pending_review'
              }
              defaultNote={latestReview?.notes}
              defaultRecommendation={latestReview?.finalInternalRecommendation}
              canReview={canReview}
            />
          </div>
        </Panel>
      </div>
      <aside className="min-w-0 space-y-6">
        <Panel>
          <h2 className="text-base font-semibold text-slate-950">
            Memo status
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            {run.reviewStatusDetail ?? run.workflowLabel}
          </p>
          <p className="mt-3 text-sm text-slate-500">
            Updated{' '}
            {formatDateTime(
              run.reviewMemo?.updatedAt ?? run.completedAt ?? run.createdAt,
            )}
          </p>
        </Panel>
        {demoStatus ? (
          <DemoPublicationControls
            runId={run.id}
            documentTitle={run.document.title}
            documentFileName={run.document.fileName}
            status={demoStatus}
          />
        ) : null}
        <Panel>
          <h2 className="text-base font-semibold text-slate-950">
            Source document
          </h2>
          <p className="mt-2 break-words text-sm font-medium text-slate-900">
            {run.document.fileName}
          </p>
          <Link
            href={`/app/documents/${run.document.id}`}
            className="mt-3 inline-flex text-sm font-medium text-slate-700 underline underline-offset-4"
          >
            Open source
          </Link>
        </Panel>
      </aside>
    </div>
  );
}

function AuditTab({ run }: { run: ClassificationRunRecord }) {
  return (
    <div className="space-y-6">
      <Panel>
        <h2 className="text-lg font-semibold text-slate-950">
          Execution provenance
        </h2>
        {run.executionProvenance ? (
          <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-slate-500">Execution status</dt>
              <dd className="mt-1 font-medium text-slate-950">
                {run.executionProvenance.status}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Backend / provider</dt>
              <dd className="mt-1 break-words font-medium text-slate-950">
                {run.executionProvenance.backend}
                {run.executionProvenance.provider
                  ? ` / ${run.executionProvenance.provider}`
                  : ''}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">External job ID</dt>
              <dd className="mt-1 break-all font-mono text-xs text-slate-950">
                {run.executionProvenance.externalJobId ?? 'Not available'}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Runtime</dt>
              <dd className="mt-1 break-words font-medium text-slate-950">
                {[
                  run.executionProvenance.gpuVendor,
                  run.executionProvenance.gpuName,
                  run.executionProvenance.runtimeVersion,
                ]
                  .filter(Boolean)
                  .join(' / ') || 'Not reported'}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Model</dt>
              <dd className="mt-1 break-words font-medium text-slate-950">
                {run.executionProvenance.modelName ?? 'Not recorded'}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Image</dt>
              <dd className="mt-1 break-all font-mono text-xs text-slate-950">
                {run.executionProvenance.imageDigest ??
                  run.executionProvenance.imageName ??
                  'Not recorded'}
              </dd>
            </div>
          </dl>
        ) : (
          <EmptyState
            title="Execution provenance pending"
            body="The queued run has not recorded provider execution details yet."
          />
        )}
        {run.artifacts?.length ? (
          <div className="mt-5 border-t border-slate-200 pt-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-medium text-slate-950">
                Run artifacts
              </p>
              <a
                href={buildApiUrl(
                  `/v1/classification-runs/${run.id}/artifacts`,
                )}
                className="text-sm font-medium text-slate-700 underline underline-offset-4"
              >
                View artifact manifest
              </a>
            </div>
            <ul className="mt-3 space-y-1 text-sm text-slate-600">
              {run.artifacts.map((artifact) => (
                <li key={artifact.id} className="break-words">
                  {artifact.kind.replace(/_/g, ' ')} — {artifact.fileName}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </Panel>
      <Panel>
        <h2 className="text-lg font-semibold text-slate-950">Audit trail</h2>
        <p className="mt-2 text-sm text-slate-600">
          Reviewer actions and material changes recorded against this case file.
        </p>
        {run.reviewerActions?.length ? (
          <div className="mt-4 space-y-4">
            {run.reviewerActions.map((action) => (
              <div key={action.id} className="flex gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                  <Icon name="activity" size={14} />
                </span>
                <div className="min-w-0">
                  <p className="break-words text-sm font-semibold capitalize text-slate-900">
                    {action.actionType.replace(/_/g, ' ')}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {action.actorUser?.name ?? 'Workspace member'} ·{' '}
                    {formatDateTime(action.createdAt)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-4">
            <EmptyState
              title="No reviewer actions recorded"
              body="Authenticated reviewer decisions and notes will appear in this case timeline."
            />
          </div>
        )}
      </Panel>
    </div>
  );
}

export default async function ReviewDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ tab?: string | string[] }>;
}) {
  const { id } = await params;
  const query = searchParams ? await searchParams : undefined;
  const activeTab = tabId(query?.tab);
  const session = await requireCompletedOnboarding(`/app/reviews/${id}`);
  const [run, demoStatus] = await Promise.all([
    fetchServerRun(id),
    session.membership?.role === 'OWNER' || session.membership?.role === 'ADMIN'
      ? fetchServerDemoPublicationStatus(id).catch(() => null)
      : Promise.resolve(null),
  ]);
  const canReview =
    session.membership?.role === 'OWNER' ||
    session.membership?.role === 'ADMIN' ||
    session.membership?.role === 'REVIEWER';
  const memoDownloadHref = buildApiUrl(
    `/v1/classification-runs/${run.id}/memo/download`,
  );
  const isProcessing = ['pending', 'queued', 'running'].includes(run.status);
  const content = isProcessing ? (
    <ProcessingRunState run={run} />
  ) : activeTab === 'facts' ? (
      <FactsTab run={run} />
    ) : activeTab === 'review-paths' ? (
      <ReviewPathsTab run={run} />
    ) : activeTab === 'company-history' ? (
      <CompanyHistoryTab run={run} />
    ) : activeTab === 'questions' ? (
      <QuestionsTab run={run} />
    ) : activeTab === 'memo' ? (
      <MemoTab
        run={run}
        demoStatus={demoStatus}
        canReview={canReview}
        memoDownloadHref={memoDownloadHref}
      />
    ) : activeTab === 'audit' ? (
      <AuditTab run={run} />
    ) : (
      <OverviewTab run={run} />
    );

  return (
    <AppShell
      session={session}
      currentPath="/app/reviews"
      title={run.document.title}
      headerContent={
        <ReviewCaseHeader
          session={session}
          run={run}
          activeTab={activeTab}
          tabs={tabs}
        />
      }
    >
      <ReviewTabDeepLink />
      <div className="min-w-0 space-y-6 overflow-x-hidden">
        <main aria-live="polite">{content}</main>
      </div>
    </AppShell>
  );
}
