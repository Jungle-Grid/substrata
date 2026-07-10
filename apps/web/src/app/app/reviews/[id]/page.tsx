import Link from 'next/link';
import { ActionMenu } from '../../../../components/action-menu';
import { AppShell } from '../../../../components/app-shell';
import { DemoPublicationControls } from '../../../../components/demo-publication-controls';
import { ExecutionProgressRefresh } from '../../../../components/execution-progress-refresh';
import { Icon } from '../../../../components/icon';
import { MarkdownRenderer } from '../../../../components/markdown-renderer';
import { MemoDownloadLink } from '../../../../components/memo-download-link';
import { ReviewActionForm } from '../../../../components/review-action-form';
import { ReviewTabDeepLink } from '../../../../components/review-tab-deep-link';
import {
  Badge,
  EmptyState,
  InlineNotice,
  Panel,
  StatusBadge,
} from '../../../../components/ui';
import { buildApiUrl } from '../../../../lib/api-base';
import { getExecutionNotice } from '../../../../lib/execution-status';
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

function tabHref(id: TabId, runId: string) {
  return `/app/reviews/${runId}?tab=${id}`;
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
  const executionNotice = getExecutionNotice(run);
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
              run.backendUsed
                ? run.backendUsed.replace(/_/g, ' ')
                : 'Not recorded'
            }
            tone="info"
          />
        </div>
        <ExecutionProgressRefresh status={run.status} />
      </Panel>
      <InlineNotice tone={executionNotice.tone} title={executionNotice.title}>
        {executionNotice.body}
      </InlineNotice>
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
            Current recommendation
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-700">
            {run.finalInternalRecommendation ??
              'No reviewer recommendation has been recorded yet.'}
          </p>
          {run.uncertaintyFlags.length ? (
            <div className="mt-4">
              <InlineNotice tone="warning" title="Open uncertainty flags">
                {run.uncertaintyFlags
                  .map((flag) => flag.replace(/_/g, ' '))
                  .join(', ')}
              </InlineNotice>
            </div>
          ) : (
            <p className="mt-4 text-sm text-slate-500">
              No open uncertainty flags are recorded.
            </p>
          )}
          <p className="mt-4 text-sm font-medium text-slate-900">
            Next action: review the cited paths and record a human reviewer
            conclusion.
          </p>
        </Panel>
      </div>
    </div>
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
      {run.reviewPaths.length === 0 ? (
        <Panel>
          <EmptyState
            title="No review paths yet"
            body="This run has not produced a review-path package yet."
          />
        </Panel>
      ) : (
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
        ))
      )}
      <Panel>
        <h2 className="text-lg font-semibold text-slate-950">
          Potential ECCN candidates
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          Specific identifiers with regulation mapping are analytical starting
          points and require qualified reviewer confirmation.
        </p>
        {run.eccnCandidates.length ? (
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {run.eccnCandidates.map((candidate) => (
              <div
                key={candidate.id}
                className="rounded-lg border border-slate-200 p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-950">
                      {candidate.eccn}
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      {candidate.officialTitle}
                    </p>
                  </div>
                  <Badge tone={confidenceTone(candidate.confidence)}>
                    {candidate.confidence} evidence confidence
                  </Badge>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-700">
                  {candidate.whyItMayApply}
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {candidate.whyItMayNotApply}
                </p>
                {candidate.missingInformation.length ? (
                  <p className="mt-3 text-sm text-amber-800">
                    Missing: {candidate.missingInformation.join('; ')}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-4">
            <EmptyState
              title="No specific ECCN candidates supported"
              body="Substrata did not find enough regulation-backed evidence to support a specific candidate yet."
            />
          </div>
        )}
      </Panel>
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
  const latestReview = run.humanReviews[0];
  const canReview =
    session.membership?.role === 'OWNER' ||
    session.membership?.role === 'ADMIN' ||
    session.membership?.role === 'REVIEWER';
  const memoDownloadHref = buildApiUrl(
    `/v1/classification-runs/${run.id}/memo/download`,
  );
  const content =
    activeTab === 'facts' ? (
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
      description="Classification case file with source-grounded facts, recommended review paths, uncertainty flags, company context, and human reviewer controls."
      actions={
        <div className="flex flex-wrap gap-2">
          <Badge
            tone={
              run.status === 'completed'
                ? 'success'
                : run.status === 'needs_attention' || run.status === 'blocked'
                  ? 'danger'
                  : 'info'
            }
          >
            {run.processingLabel ?? run.status}
          </Badge>
          <Badge tone={run.hasReviewerConclusion ? 'success' : 'warning'}>
            {run.reviewStatusDetail ?? run.workflowLabel}
          </Badge>
          <Link
            href={`/app/documents/${run.document.id}`}
            className="inline-flex items-center rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
          >
            Source document
          </Link>
          <ActionMenu
            items={[
              {
                label: 'Open source document',
                href: `/app/documents/${run.document.id}`,
              },
              { label: 'Open memo draft', href: tabHref('memo', run.id) },
              {
                label: 'Open company history',
                href: tabHref('company-history', run.id),
              },
            ]}
          />
        </div>
      }
    >
      <ReviewTabDeepLink />
      <div className="min-w-0 space-y-6 overflow-x-hidden">
        <Panel className="p-4 sm:p-5">
          <div className="flex min-w-0 flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex min-w-0 gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-700">
                <Icon name="clipboard-check" size={21} />
              </span>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500">
                  Classification case file
                </p>
                <p className="mt-1 truncate text-lg font-semibold text-slate-950">
                  {run.document.fileName}
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  {run.requiresHumanReview
                    ? 'Human review required before any internal classification decision.'
                    : 'Reviewer decision state recorded.'}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center sm:flex sm:text-left">
              <div className="rounded-lg bg-slate-50 px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                  Confidence
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {run.confidence
                    ? `${Math.round(run.confidence * 100)}%`
                    : 'Pending'}
                </p>
              </div>
              <div className="rounded-lg bg-amber-50 px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-amber-700">
                  Uncertainty
                </p>
                <p className="mt-1 text-sm font-semibold text-amber-900">
                  {run.uncertaintyFlags.length} flags
                </p>
              </div>
              <div className="rounded-lg bg-sky-50 px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-sky-700">
                  Reviewer
                </p>
                <p className="mt-1 max-w-28 truncate text-sm font-semibold text-sky-950">
                  {latestReview?.reviewer?.name ?? 'Unassigned'}
                </p>
              </div>
            </div>
          </div>
          <nav
            aria-label="Case file sections"
            className="mt-5 flex max-w-full gap-1 overflow-x-auto border-t border-slate-100 pt-4"
          >
            {tabs.map((tab) => (
              <Link
                key={tab.id}
                href={tabHref(tab.id, run.id)}
                aria-current={activeTab === tab.id ? 'page' : undefined}
                className={`shrink-0 rounded-lg px-3 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200 ${activeTab === tab.id ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'}`}
              >
                {tab.label}
              </Link>
            ))}
          </nav>
        </Panel>
        <main aria-live="polite">{content}</main>
      </div>
    </AppShell>
  );
}
