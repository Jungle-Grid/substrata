import type {
  CandidateFactMapping,
  Citation,
  ClassificationRun,
  Document,
  ECCNCandidate,
  ExtractedSpec,
  FactIssue,
  HumanReview,
  PublicDemoPublication,
  RegulationSource,
  ReviewMemo,
  ReviewMemoVersion,
  ReviewPath,
  ReviewPathFact,
  ReviewerAction,
  ExecutionJob,
  Artifact,
  ClassificationHistoryMatch,
  CompanyHistoryChunk,
  CompanyHistoryDocument,
  User,
} from '@substrata/db';
import {
  deriveProcessingLabel,
  deriveReviewStatus,
  isValidSpecificEccn,
} from './classification-integrity';

type CitationWithSource = Citation & {
  regulationSource?: RegulationSource | null;
};

type ReviewPathWithRelations = ReviewPath & {
  facts: Array<ReviewPathFact & { extractedSpec: ExtractedSpec }>;
  citations: CitationWithSource[];
};

type ECCNCandidateWithRelations = ECCNCandidate & {
  citations: CitationWithSource[];
  regulationSource?: RegulationSource | null;
  factMappings: Array<CandidateFactMapping & { extractedSpec: ExtractedSpec }>;
};

type CompanyHistoryMatchWithRelations = ClassificationHistoryMatch & {
  companyHistoryChunk: CompanyHistoryChunk;
  companyHistoryDocument: CompanyHistoryDocument & { document: Document };
};

type RunWithRelations = ClassificationRun & {
  document: Document;
  extractedSpecs: ExtractedSpec[];
  factIssues: FactIssue[];
  reviewPaths: ReviewPathWithRelations[];
  eccnCandidates: ECCNCandidateWithRelations[];
  reviewMemo: ReviewMemo | null;
  reviewMemoVersions: ReviewMemoVersion[];
  humanReviews: Array<HumanReview & { reviewer?: User | null }>;
  reviewerActions: Array<ReviewerAction & { actorUser?: User | null }>;
  executionJob?: ExecutionJob | null;
  artifacts?: Artifact[];
  companyHistoryMatches?: CompanyHistoryMatchWithRelations[];
};

type PublicDemoRunWithPublication = PublicDemoPublication & {
  activeClassificationRun:
    | (RunWithRelations & {
        publicDemoPublication?: PublicDemoPublication | null;
      })
    | null;
};

type DocumentWithRunRelations = Document & {
  classificationRuns?: Array<Record<string, unknown>>;
};

function latestReview(run: RunWithRelations) {
  return run.humanReviews[0] ?? null;
}

function hasRecordedReviewerConclusion(review: HumanReview | null | undefined) {
  return Boolean(review?.conclusionRecordedAt);
}

function formatWorkflowLabel(
  workflowState: ClassificationRun['workflowState'],
  review: HumanReview | null | undefined,
) {
  if (hasRecordedReviewerConclusion(review)) {
    return 'Human-reviewed';
  }

  switch (workflowState) {
    case 'awaiting_reviewer_assignment':
      return 'Completed analysis';
    case 'in_technical_review':
      return 'Under qualified reviewer review';
    case 'needs_additional_documentation':
      return 'Needs more documentation';
    case 'escalated':
      return 'Escalated';
    case 'reviewer_conclusion_recorded':
      return 'Reviewer conclusion recorded';
    case 'approved_for_internal_use':
      return 'Approved for internal use';
    case 'closed':
      return 'Closed';
    case 'draft_generated':
    default:
      return 'Draft generated';
  }
}

function presentCapabilitySignals(value: unknown) {
  return Array.isArray(value) ? value : [];
}

function presentValidationIssues(value: unknown) {
  return Array.isArray(value) ? value : [];
}

function safeDemoDocumentName(
  publication: PublicDemoPublication,
  document: Document,
) {
  return (
    publication.sourceDocumentDisplayName ?? document.displayFileName ?? null
  );
}

function presentRegulationSource(source?: RegulationSource | null) {
  if (!source) {
    return null;
  }

  return {
    id: source.id,
    authority: source.authority,
    regulationTitle: source.regulationTitle,
    regulationVersion: source.regulationVersion,
    citationText: source.citationText,
    citationUrl: source.citationUrl,
    sourceIdentifier: source.sourceIdentifier,
    section: source.section,
    paragraph: source.paragraph,
    kind: source.kind,
    lastVerifiedAt: source.lastVerifiedAt,
    verificationStatus: source.verificationStatus,
  };
}

function presentCitation(citation: CitationWithSource) {
  return {
    id: citation.id,
    citationLabel: citation.sourceTitle,
    citationText: citation.quotedText,
    source:
      citation.sourceSection ?? citation.sourceUrl ?? citation.sourceTitle,
    relevance: citation.relevanceNote,
    regulationSource: presentRegulationSource(citation.regulationSource),
  };
}

function presentFact(spec: ExtractedSpec) {
  return {
    id: spec.id,
    canonicalFieldName: spec.name,
    label: spec.label ?? spec.name.replace(/_/g, ' '),
    value: spec.reviewerCorrectedValue ?? spec.value,
    rawExtractedValue: spec.value,
    unit: spec.reviewerCorrectedUnit ?? spec.unit,
    rawExtractedUnit: spec.unit,
    category: spec.category,
    confidence: spec.confidenceLevel,
    extractionRationale: spec.extractionRationale,
    sourceDocumentId: spec.sourceDocumentId,
    sourceSnippet: spec.sourceSnippet,
    sourceText: spec.sourceText ?? spec.sourceSnippet,
    sourcePageFrom: spec.sourcePageFrom,
    sourcePageTo: spec.sourcePageTo,
    boundingBoxes: spec.boundingBoxes,
    importance: spec.importance,
    valueType: spec.valueType,
    extractionMethod: spec.extractionMethod,
    extractionMethodVersion: spec.extractionMethodVersion,
    extractedAt: spec.extractedAt,
    reviewerStatus: spec.reviewerStatus,
    reviewerNote: spec.reviewerNote,
    suppressFromMemo: spec.suppressFromMemo,
  };
}

function presentReviewPath(path: ReviewPathWithRelations) {
  return {
    id: path.id,
    title: path.title,
    scope: path.scope,
    type: path.type,
    status: path.status,
    whyTriggered: path.whyTriggered,
    technicalRiskArea: path.technicalRiskArea,
    missingInformation: path.missingInformation,
    reviewerQuestions: path.reviewerQuestions,
    reviewerNotes: path.reviewerNotes,
    decisionRationale: path.decisionRationale,
    supportingFacts: path.facts.map((item) => presentFact(item.extractedSpec)),
    regulatoryCitations: path.citations.map(presentCitation),
  };
}

function presentCandidate(candidate: ECCNCandidateWithRelations) {
  return {
    id: candidate.id,
    eccn: candidate.eccn,
    title: candidate.title,
    officialTitle: candidate.officialTitle ?? candidate.title,
    status: candidate.status,
    confidence: candidate.confidenceLevel,
    confidenceRationale: candidate.confidenceRationale,
    paragraphReference: candidate.paragraphReference,
    controlCriteria: Array.isArray(candidate.controlCriteria)
      ? candidate.controlCriteria
      : [],
    factMappings: candidate.factMappings.map((mapping) => ({
      id: mapping.id,
      factId: mapping.extractedSpecId,
      factName: mapping.extractedSpec.name,
      criterionLabel: mapping.criterionLabel,
      matchedValue: mapping.matchedValue,
      comparisonResult: mapping.comparisonResult,
      notes: mapping.notes,
    })),
    matchedTechnicalFacts: candidate.matchedTechnicalFacts,
    whyItMayApply: candidate.whyItMayApply,
    whyItMayNotApply: candidate.whyItMayNotApply,
    mayApplyReasons: candidate.mayApplyReasons,
    mayNotApplyReasons: candidate.mayNotApplyReasons,
    missingInformation: candidate.missingInformation,
    uncertaintyFlags: candidate.uncertaintyFlags,
    reviewerQuestions: candidate.reviewerQuestions,
    alternativeCandidates: candidate.alternativeCandidates ?? [],
    reviewerDisposition: candidate.reviewerDisposition,
    reviewerDispositionRationale: candidate.reviewerDispositionRationale,
    reviewPathId: candidate.reviewPathId,
    isSpecificEccn: candidate.isSpecificEccn,
    candidateType: candidate.candidateType ?? 'review_candidate',
    companyHistorySupport: Array.isArray(candidate.companyHistorySupport)
      ? candidate.companyHistorySupport
      : [],
    contradictions: Array.isArray(candidate.contradictions)
      ? candidate.contradictions
      : [],
    humanReviewRequired: candidate.humanReviewRequired ?? true,
    regulationSource: presentRegulationSource(candidate.regulationSource),
    regulatoryCitations: candidate.citations.map(presentCitation),
  };
}

export function hasVerifiedSpecificCandidateEvidence(
  candidate: Pick<
    ECCNCandidate,
    'isSpecificEccn' | 'eccn' | 'paragraphReference' | 'controlCriteria'
  > & {
    regulationSource?: Pick<
      RegulationSource,
      'verificationStatus' | 'regulationVersion' | 'lastVerifiedAt'
    > | null;
    factMappings: Array<unknown>;
    citations: Array<unknown>;
  },
) {
  return Boolean(
    candidate.isSpecificEccn &&
    isValidSpecificEccn(candidate.eccn) &&
    candidate.regulationSource?.verificationStatus === 'current' &&
    candidate.regulationSource.regulationVersion &&
    candidate.regulationSource.lastVerifiedAt &&
    candidate.paragraphReference &&
    Array.isArray(candidate.controlCriteria) &&
    candidate.controlCriteria.length > 0 &&
    candidate.factMappings.length > 0 &&
    candidate.citations.length > 0,
  );
}

function presentMemo(record: ReviewMemo | null, versions: ReviewMemoVersion[]) {
  if (!record) {
    return null;
  }

  return {
    id: record.id,
    contentMarkdown: record.contentMarkdown,
    generatedBy: record.generatedBy,
    versionNumber: record.versionNumber,
    reviewStateSnapshot: record.reviewStateSnapshot,
    reviewerStatusSnapshot: record.reviewerStatusSnapshot,
    disclaimer: record.disclaimer,
    updatedAt: record.updatedAt,
    versions: versions
      .slice()
      .sort((left, right) => right.versionNumber - left.versionNumber)
      .map((version) => ({
        id: version.id,
        versionNumber: version.versionNumber,
        generatedBy: version.generatedBy,
        reviewStateSnapshot: version.reviewStateSnapshot,
        reviewerStatusSnapshot: version.reviewerStatusSnapshot,
        disclaimer: version.disclaimer,
        createdAt: version.createdAt,
      })),
  };
}

function presentHumanReview(review: HumanReview & { reviewer?: User | null }) {
  return {
    id: review.id,
    status: review.status,
    workflowState: review.workflowState,
    notes: review.notes,
    approvalScope: review.approvalScope,
    finalInternalRecommendation: review.finalInternalRecommendation,
    caveats: review.caveats,
    assumptions: review.assumptions,
    missingInformation: review.missingInformation,
    claimedAt: review.claimedAt,
    reviewedAt: review.reviewedAt,
    conclusionRecordedAt: review.conclusionRecordedAt,
    reopenedAt: review.reopenedAt,
    reviewer: review.reviewer
      ? {
          id: review.reviewer.id,
          name: review.reviewer.name,
          email: review.reviewer.email,
        }
      : null,
  };
}

function presentReviewerAction(
  action: ReviewerAction & { actorUser?: User | null },
) {
  return {
    id: action.id,
    actionType: action.actionType,
    targetType: action.targetType,
    targetId: action.targetId,
    details: action.details,
    createdAt: action.createdAt,
    actorUser: action.actorUser
      ? {
          id: action.actorUser.id,
          name: action.actorUser.name,
          email: action.actorUser.email,
        }
      : null,
  };
}

function presentFactIssue(issue: FactIssue) {
  return {
    id: issue.id,
    issueType: issue.issueType,
    summary: issue.summary,
    details: issue.details,
    primaryFactId: issue.primaryFactId,
    relatedFactId: issue.relatedFactId,
  };
}

function presentCompanyHistoryMatch(match: CompanyHistoryMatchWithRelations) {
  const structured = match.matchReasons && typeof match.matchReasons === 'object' && !Array.isArray(match.matchReasons)
    ? match.matchReasons as Record<string, unknown>
    : null;
  return {
    id: match.id,
    rank: match.rank,
    score: match.score,
    matchTier: match.matchTier,
    matchReasons: Array.isArray(match.matchReasons)
      ? match.matchReasons.filter(
          (reason): reason is string => typeof reason === 'string',
        )
      : Array.isArray(structured?.agreements) ? structured.agreements.filter((reason): reason is string => typeof reason === 'string') : [],
    agreements: Array.isArray(structured?.agreements) ? structured.agreements.filter((reason): reason is string => typeof reason === 'string') : [],
    materialDifferences: Array.isArray(structured?.materialDifferences) ? structured.materialDifferences.filter((reason): reason is string => typeof reason === 'string') : [],
    blockingContradictions: Array.isArray(structured?.blockingContradictions) ? structured.blockingContradictions.filter((reason): reason is string => typeof reason === 'string') : [],
    configurationDifferences: Array.isArray(structured?.configurationDifferences) ? structured.configurationDifferences.filter((reason): reason is string => typeof reason === 'string') : [],
    recordRole: typeof structured?.recordRole === 'string' ? structured.recordRole : 'technical_source',
    recommendedUse: typeof structured?.recommendedUse === 'string' ? structured.recommendedUse : 'context',
    retrievalMethod: match.retrievalMethod,
    retrievalVersion: match.retrievalVersion,
    createdAt: match.createdAt,
    sourceFileName: match.companyHistoryDocument.document.fileName,
    sourceTitle: match.companyHistoryDocument.document.title,
    importedAt: match.companyHistoryDocument.createdAt,
    companyHistoryDocumentId: match.companyHistoryDocumentId,
    companyHistoryChunkId: match.companyHistoryChunkId,
    excerpt: match.companyHistoryChunk.content,
  };
}

function metadataRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function metadataBoolean(metadata: Record<string, unknown>, key: string) {
  return typeof metadata[key] === 'boolean' ? metadata[key] : undefined;
}

function metadataNumber(metadata: Record<string, unknown>, key: string) {
  return typeof metadata[key] === 'number' ? metadata[key] : undefined;
}

export function presentExecutionSummary(run: RunWithRelations) {
  const metadata = metadataRecord(run.executionJob?.metadata);
  const backendStatus =
    typeof metadata.backendStatus === 'string' ? metadata.backendStatus : null;
  const backendCompleted =
    (metadataBoolean(metadata, 'backendCompleted') ??
      (backendStatus === 'completed' ||
        run.executionJob?.status === 'completed'));
  const backendOutputValidated =
    metadataBoolean(metadata, 'backendOutputValidated') ??
    (backendCompleted && Boolean(run.reviewMemo?.contentMarkdown));
  const memoValidated =
    metadataBoolean(metadata, 'memoValidated') ??
    Boolean(run.reviewMemo?.contentMarkdown);
  const workerOutputValidated =
    metadataBoolean(metadata, 'workerOutputValidated') ??
    backendOutputValidated;
  const fallbackUsed =
    run.fallbackUsed ||
    metadataBoolean(metadata, 'fallbackUsed') === true ||
    metadata.classificationMode === 'heuristic_fallback';
  const validationIssues = presentValidationIssues(
    run.validationIssues,
  ) as Array<{
    severity?: string;
  }>;
  const missingFactCount = metadataNumber(metadata, 'missingFactCount') ?? 0;
  const warningCount =
    metadataNumber(metadata, 'warningCount') ??
    validationIssues.filter((issue) => issue.severity === 'warning').length;
  const evidenceChecksUnresolved =
    (metadataBoolean(metadata, 'evidenceChecksUnresolved') ?? false) ||
    missingFactCount > 0 ||
    warningCount > 0 ||
    validationIssues.length > 0 ||
    run.uncertaintyFlags.length > 0 ||
    run.factIssues.length > 0;
  const companyHistoryMatchCount = run.companyHistoryMatches?.length ?? 0;

  return {
    executionMode:
      (typeof metadata.executionMode === 'string' ? metadata.executionMode : null) ??
      (run.executionJob?.backend === 'local' ? 'local' : 'remote'),
    selectedProvider:
      (typeof metadata.selectedProvider === 'string' ? metadata.selectedProvider : null) ??
      run.executionJob?.provider ?? null,
    backendSelected:
      (typeof metadata.backendSelected === 'string'
        ? metadata.backendSelected
        : null) ??
      run.executionJob?.backend ??
      run.backendUsed,
    backendCompleted,
    backendOutputValidated,
    memoValidated,
    workerOutputValidated,
    fallbackEnabled:
      metadataBoolean(metadata, 'fallbackEnabled') ??
      !['0', 'false', 'no', 'off'].includes(
        String(process.env.AI_FALLBACK_TO_HEURISTIC ?? 'true').toLowerCase(),
      ),
    fallbackUsed,
    missingFactCount,
    warningCount,
    evidenceChecksUnresolved,
    companyHistoryRetrieved:
      metadataBoolean(metadata, 'companyHistoryRetrieved') ??
      companyHistoryMatchCount > 0,
    companyHistoryMatchCount,
  };
}

export function presentRun(run: RunWithRelations) {
  const review = latestReview(run);
  const reviewStatus = deriveReviewStatus(review, run.requiresHumanReview);

  return {
    id: run.id,
    archivedAt: run.archivedAt,
    lifecycle: run.archivedAt ? 'archived' : 'active',
    lifecycleActions: {
      canCancel: !run.archivedAt && ['pending', 'queued', 'running', 'unknown'].includes(run.status),
      canArchive: !run.archivedAt && !['pending', 'queued', 'running', 'unknown'].includes(run.status),
      canRestore: Boolean(run.archivedAt),
      canPermanentlyDelete: Boolean(run.archivedAt) && !['pending', 'queued', 'running', 'unknown'].includes(run.status),
    },
    cancellationRequestedAt: run.cancellationRequestedAt,
    cancelledAt: run.cancelledAt,
    cancellationFailureReason: run.cancellationFailureReason,
    status: run.status,
    processingStatus: run.status,
    processingLabel: deriveProcessingLabel(run.status),
    workflowState: run.workflowState,
    workflowLabel: formatWorkflowLabel(run.workflowState, review),
    reviewStatus: reviewStatus.code,
    reviewStatusLabel: reviewStatus.label,
    reviewStatusDetail: reviewStatus.detail,
    confidence: run.confidence,
    confidenceRationale: run.confidenceRationale,
    backendUsed: run.backendUsed,
    backendReason: run.backendReason,
    underlyingProvider: run.underlyingProvider,
    costUsd: run.costUsd,
    latencyMs: run.latencyMs,
    tokensUsed: run.tokensUsed,
    uncertaintyFlags: run.uncertaintyFlags,
    requiresHumanReview: run.requiresHumanReview,
    reviewerAssignedUserId: run.reviewerAssignedUserId,
    reviewerClaimedAt: run.reviewerClaimedAt,
    finalInternalRecommendation: run.finalInternalRecommendation,
    conclusionDisclaimer:
      run.conclusionDisclaimer ??
      'Classification support, not legal advice. Requires qualified reviewer confirmation.',
    capabilitySignals: presentCapabilitySignals(run.capabilitySignals),
    validationIssues: presentValidationIssues(run.validationIssues),
    heuristicResult: run.heuristicResult ?? null,
    classificationTrace: run.classificationTrace ?? null,
    fallbackUsed: run.fallbackUsed,
    validationStatus: run.validationStatus,
    executionSummary: presentExecutionSummary(run),
    executionProvenance: run.executionJob
      ? {
          id: run.executionJob.id,
          status: run.executionJob.status,
          backend: run.executionJob.backend,
          externalJobId: run.executionJob.externalJobId,
          provider: run.executionJob.provider,
          gpuVendor: run.executionJob.gpuVendor,
          gpuName: run.executionJob.gpuName,
          runtimeVersion: run.executionJob.runtimeVersion,
          modelName: run.executionJob.modelName,
          imageName: run.executionJob.imageName,
          imageDigest: run.executionJob.imageDigest,
          queuedAt: run.executionJob.queuedAt,
          submittedAt: run.executionJob.submittedAt,
          startedAt: run.executionJob.startedAt,
          completedAt: run.executionJob.completedAt,
          durationMs: run.executionJob.durationMs,
          costEstimateUsd: run.executionJob.costEstimateUsd,
          costActualUsd: run.executionJob.costActualUsd,
          inputTokens: run.executionJob.inputTokens,
          outputTokens: run.executionJob.outputTokens,
          logPath: run.executionJob.logPath,
          errorMessage: run.executionJob.errorMessage,
        }
      : null,
    artifacts: (run.artifacts ?? []).map((artifact) => ({
      id: artifact.id,
      kind: artifact.kind,
      fileName: artifact.fileName,
      mimeType: artifact.mimeType,
      sizeBytes: artifact.sizeBytes,
      sha256: artifact.sha256,
      createdAt: artifact.createdAt,
      deletionRequestedAt: artifact.deletionRequestedAt,
      deletionAttemptCount: artifact.deletionAttemptCount,
      deletionFailureReason: artifact.deletionFailureReason,
      canDelete: !['pending', 'queued', 'running', 'unknown'].includes(run.status),
      canRetryDeletion: Boolean(artifact.deletionFailureReason),
    })),
    companyHistoryMatches: (run.companyHistoryMatches ?? []).map(
      presentCompanyHistoryMatch,
    ),
    completedAt: run.completedAt,
    createdAt: run.createdAt,
    lastReviewerActionAt: run.lastReviewerActionAt,
    document: {
      id: run.document.id,
      title: run.document.title,
      fileName: run.document.fileName,
      displayFileName: run.document.displayFileName,
      mimeType: run.document.mimeType,
      sizeBytes: run.document.sizeBytes,
      sourceType: run.document.sourceType,
      documentType: run.document.documentType,
      manufacturer: run.document.manufacturer,
      sourceUrl: run.document.sourceUrl,
      sourceDate: run.document.sourceDate,
      versionLabel: run.document.versionLabel,
      sha256: run.document.sha256,
      pageCount: run.document.pageCount,
      extractionStatus: run.document.extractionStatus,
      origin: run.document.origin,
      visibility: run.document.visibility,
      summary: run.document.rawText?.slice(0, 420) ?? null,
    },
    extractedSpecs: (run.extractedSpecs ?? []).map(presentFact),
    factIssues: (run.factIssues ?? []).map(presentFactIssue),
    reviewPaths: (run.reviewPaths ?? []).map(presentReviewPath),
    eccnCandidates: (run.eccnCandidates ?? []).map(presentCandidate),
    reviewMemo: presentMemo(run.reviewMemo, run.reviewMemoVersions ?? []),
    humanReviews: (run.humanReviews ?? []).map(presentHumanReview),
    reviewerActions: (run.reviewerActions ?? []).map(presentReviewerAction),
    humanReviewStatus: review?.status ?? 'pending_review',
    hasReviewerConclusion: hasRecordedReviewerConclusion(review),
  };
}

export function presentPublicDemoRun(
  publication: PublicDemoRunWithPublication,
) {
  const run = publication.activeClassificationRun;
  if (!run) {
    throw new Error(
      'Public demo publication is missing its active classification run.',
    );
  }

  const review = latestReview(run);
  const reviewStatus = deriveReviewStatus(review, run.requiresHumanReview);

  return {
    id: run.id,
    status: run.status,
    processingStatus: run.status,
    processingLabel: deriveProcessingLabel(run.status),
    workflowState: run.workflowState,
    workflowLabel: formatWorkflowLabel(run.workflowState, review),
    reviewStatus: reviewStatus.code,
    reviewStatusLabel: reviewStatus.label,
    reviewStatusDetail: reviewStatus.detail,
    confidence: run.confidence,
    confidenceRationale: run.confidenceRationale,
    backendUsed: run.backendUsed,
    backendReason: run.backendReason,
    underlyingProvider: run.underlyingProvider,
    costUsd: run.costUsd,
    latencyMs: run.latencyMs,
    tokensUsed: run.tokensUsed,
    uncertaintyFlags: run.uncertaintyFlags,
    requiresHumanReview: run.requiresHumanReview,
    fallbackUsed: run.fallbackUsed,
    validationStatus: run.validationStatus,
    publicTitle: publication.publicTitle ?? run.document.title,
    publicSummary:
      publication.publicSummary ??
      'Demo using publicly available technical documentation. Example technical workup for qualified reviewer evaluation.',
    sourceDocumentDisplayName: safeDemoDocumentName(publication, run.document),
    canonicalUrl: `/classification-runs/${run.id}`,
    publishedAt: publication.publishedAt,
    createdAt: run.createdAt,
    completedAt: run.completedAt,
    document: {
      title: run.document.title,
      displayFileName: run.document.displayFileName,
      mimeType: run.document.mimeType,
      sizeBytes: run.document.sizeBytes,
      sourceType: run.document.sourceType,
      documentType: run.document.documentType,
      manufacturer: run.document.manufacturer,
      versionLabel: run.document.versionLabel,
      pageCount: run.document.pageCount,
      summary: run.document.rawText?.slice(0, 420) ?? null,
    },
    extractedSpecs: run.extractedSpecs.map(presentFact),
    factIssues: run.factIssues.map(presentFactIssue),
    reviewPaths: run.reviewPaths.map(presentReviewPath),
    eccnCandidates: run.eccnCandidates.map(presentCandidate),
    reviewMemo: run.reviewMemo
      ? {
          contentMarkdown: run.reviewMemo.contentMarkdown,
          versionNumber: run.reviewMemo.versionNumber,
          reviewStateSnapshot: run.reviewMemo.reviewStateSnapshot,
          reviewerStatusSnapshot: run.reviewMemo.reviewerStatusSnapshot,
          disclaimer: run.reviewMemo.disclaimer,
          updatedAt: run.reviewMemo.updatedAt,
        }
      : null,
    latestReview: review
      ? {
          status: review.status,
          workflowState: review.workflowState,
          notes: review.notes,
          conclusionRecordedAt: review.conclusionRecordedAt,
          reviewedAt: review.reviewedAt,
        }
      : null,
    demoBanner:
      'Demo using publicly available technical documentation. Example technical workup, not a customer conclusion.',
    capabilitySignals: presentCapabilitySignals(run.capabilitySignals),
    validationIssues: presentValidationIssues(run.validationIssues),
  };
}

export function presentPublicDemoMetadata(
  publication: PublicDemoRunWithPublication,
) {
  const run = publication.activeClassificationRun;
  if (!run) {
    throw new Error(
      'Public demo publication is missing its active classification run.',
    );
  }

  return {
    runId: run.id,
    status: publication.status,
    publishedAt: publication.publishedAt,
    publicTitle: publication.publicTitle ?? run.document.title,
    publicSummary:
      publication.publicSummary ??
      'Demo using publicly available technical documentation. Example technical workup for qualified reviewer evaluation.',
    sourceDocumentDisplayName: safeDemoDocumentName(publication, run.document),
    completedAt: run.completedAt,
    canonicalUrl: `/classification-runs/${run.id}`,
  };
}

export function presentDocument(document: DocumentWithRunRelations) {
  return {
    id: document.id,
    title: document.title,
    fileName: document.fileName,
    displayFileName: document.displayFileName,
    mimeType: document.mimeType,
    sizeBytes: document.sizeBytes,
    sourceType: document.sourceType,
    documentType: document.documentType,
    manufacturer: document.manufacturer,
    sourceUrl: document.sourceUrl,
    sourceDate: document.sourceDate,
    versionLabel: document.versionLabel,
    sha256: document.sha256,
    pageCount: document.pageCount,
    extractionStatus: document.extractionStatus,
    origin: document.origin,
    visibility: document.visibility,
    rawText: document.rawText,
    archivedAt: document.archivedAt,
    lifecycle: document.archivedAt ? 'archived' : 'active',
    lifecycleActions: {
      canArchive: !document.archivedAt,
      canRestore: Boolean(document.archivedAt),
      canPermanentlyDelete: Boolean(document.archivedAt),
    },
    createdAt: document.createdAt,
    classificationRuns:
      document.classificationRuns?.map((run) =>
        presentRun({
          ...(run as RunWithRelations),
          document: ((run as { document?: Document }).document ??
            document) as Document,
        }),
      ) ?? [],
  };
}
