export interface AuthUser {
  id: string;
  email: string;
  name: string;
  emailVerifiedAt?: string | null;
  onboardingCompletedAt?: string | null;
  hasPassword: boolean;
  authMethods: string[];
}

export interface AuthOrganization {
  id: string;
  name: string;
  slug: string;
  industry?: string | null;
  defaultExecutionPreference?: 'local' | 'remote';
}

export interface MembershipRecord {
  id?: string;
  role: 'OWNER' | 'ADMIN' | 'REVIEWER' | 'ANALYST' | 'VIEWER';
}

export interface AuthSessionRecord {
  authenticated: boolean;
  csrfToken: string;
  user?: AuthUser;
  organization?: AuthOrganization;
  membership?: MembershipRecord | null;
  memberships?: Array<{
    organizationId: string;
    organizationName: string;
    role: MembershipRecord['role'];
  }>;
}

export interface RegulationSourceRecord {
  id?: string;
  authority: string;
  regulationTitle: string;
  regulationVersion?: string | null;
  citationText: string;
  citationUrl?: string | null;
  sourceIdentifier?: string | null;
  section?: string | null;
  paragraph?: string | null;
  kind:
    | 'primary_regulation'
    | 'agency_guidance'
    | 'internal_playbook'
    | 'reviewer_note';
  lastVerifiedAt?: string | null;
  verificationStatus:
    | 'current'
    | 'needs_verification'
    | 'archived'
    | 'superseded';
}

export interface RegulatoryCitationRecord {
  id?: string;
  citationLabel: string;
  citationText: string;
  source: string;
  relevance: string;
  regulationSource?: RegulationSourceRecord | null;
}

export interface FactRecord {
  id: string;
  canonicalFieldName: string;
  label: string;
  value: string;
  rawExtractedValue?: string;
  unit?: string | null;
  rawExtractedUnit?: string | null;
  sourceSnippet: string;
  sourceText: string;
  sourceDocumentId?: string | null;
  sourcePageFrom?: number | null;
  sourcePageTo?: number | null;
  boundingBoxes?: Array<Record<string, number>> | null;
  importance: string;
  category: string;
  confidence: 'high' | 'medium' | 'low';
  extractionRationale?: string | null;
  valueType: 'directly_stated' | 'inferred' | 'normalized' | 'calculated';
  extractionMethod?: string | null;
  extractionMethodVersion?: string | null;
  extractedAt?: string;
  reviewerStatus:
    | 'unreviewed'
    | 'verified'
    | 'corrected'
    | 'rejected'
    | 'suppressed';
  reviewerNote?: string | null;
  suppressFromMemo?: boolean;
}

export interface FactIssueRecord {
  id: string;
  issueType:
    | 'contradiction'
    | 'duplicate'
    | 'family_scope_warning'
    | 'unverified_identifier'
    | 'ambiguous_unit';
  summary: string;
  details?: string | null;
  primaryFactId?: string | null;
  relatedFactId?: string | null;
}

export interface ReviewPathRecord {
  id: string;
  title: string;
  scope: string;
  type:
    | 'product_area'
    | 'technical_risk'
    | 'encryption_security'
    | 'special_environment'
    | 'military_space'
    | 'general_fallback';
  status:
    | 'open'
    | 'excluded_by_reviewer'
    | 'needs_more_evidence'
    | 'escalated'
    | 'resolved';
  whyTriggered: string;
  technicalRiskArea?: string | null;
  missingInformation: string[];
  reviewerQuestions: string[];
  reviewerNotes?: string | null;
  decisionRationale?: string | null;
  supportingFacts: FactRecord[];
  regulatoryCitations: RegulatoryCitationRecord[];
}

export interface ECCNCandidateRecord {
  id: string;
  eccn: string;
  title: string;
  officialTitle: string;
  status: 'proposed' | 'approved' | 'rejected' | 'modified' | 'review_required';
  confidence: 'high' | 'medium' | 'low';
  confidenceRationale?: string | null;
  paragraphReference?: string | null;
  controlCriteria: string[];
  factMappings: Array<{
    id: string;
    factId: string;
    factName: string;
    criterionLabel: string;
    matchedValue: string;
    comparisonResult: string;
    notes?: string | null;
  }>;
  matchedTechnicalFacts: string[];
  whyItMayApply: string;
  whyItMayNotApply: string;
  mayApplyReasons: string[];
  mayNotApplyReasons: string[];
  missingInformation: string[];
  uncertaintyFlags: string[];
  reviewerQuestions: string[];
  alternativeCandidates: Array<{
    eccn: string;
    title: string;
    status: 'considered' | 'excluded' | 'open';
    rationale: string;
  }>;
  reviewerDisposition?: string | null;
  reviewerDispositionRationale?: string | null;
  reviewPathId?: string | null;
  isSpecificEccn: boolean;
  regulationSource?: RegulationSourceRecord | null;
  regulatoryCitations: RegulatoryCitationRecord[];
  candidateType?:
    | 'review_candidate'
    | 'fallback_candidate'
    | 'blocked_candidate'
    | 'excluded_candidate'
    | 'reviewer_final';
  companyHistorySupport?: Array<Record<string, unknown>>;
  contradictions?: Array<Record<string, unknown>>;
  humanReviewRequired?: true;
}

export interface CapabilitySignalRecord {
  key:
    | 'hasCryptography'
    | 'hasEncryption'
    | 'hasDecryption'
    | 'hasKeyManagement'
    | 'hasCryptographicAccelerator'
    | 'hasSecureBoot'
    | 'hasTrustedExecution'
    | 'hasSecureKeyStorage'
    | 'hasHardwareSecurityModule'
    | 'hasAuthenticationSecurityFeatures'
    | 'hasHighSpeedInterfaces'
    | 'hasProgrammableLogic'
    | 'hasAdvancedProcessor'
    | 'hasRFOrWirelessCapability';
  detected: boolean;
  confidence: 'high' | 'medium' | 'low';
  summary: string;
  supportingFactIds: string[];
  supportingCitationIds: string[];
}

export interface ValidationIssueRecord {
  code: string;
  severity: 'error' | 'warning';
  message: string;
  path: string;
  supportingFactIds: string[];
  supportingCitationIds: string[];
}

export interface HumanReviewRecord {
  id: string;
  status: string;
  workflowState:
    | 'draft_generated'
    | 'awaiting_reviewer_assignment'
    | 'in_technical_review'
    | 'needs_additional_documentation'
    | 'escalated'
    | 'reviewer_conclusion_recorded'
    | 'approved_for_internal_use'
    | 'closed';
  notes?: string | null;
  approvalScope?: string | null;
  finalInternalRecommendation?: string | null;
  caveats?: string | null;
  assumptions?: string | null;
  missingInformation?: string | null;
  claimedAt?: string | null;
  reviewedAt?: string | null;
  conclusionRecordedAt?: string | null;
  reopenedAt?: string | null;
  reviewer?: {
    id?: string;
    name: string;
    email?: string;
  } | null;
}

export interface ReviewMemoRecord {
  id?: string;
  contentMarkdown: string;
  generatedBy?: string;
  versionNumber?: number;
  reviewStateSnapshot?:
    | 'draft_generated'
    | 'awaiting_reviewer_assignment'
    | 'in_technical_review'
    | 'needs_additional_documentation'
    | 'escalated'
    | 'reviewer_conclusion_recorded'
    | 'approved_for_internal_use'
    | 'closed';
  reviewerStatusSnapshot?: string | null;
  disclaimer?: string | null;
  updatedAt?: string;
  versions?: Array<{
    id: string;
    versionNumber: number;
    generatedBy: string;
    reviewStateSnapshot: string;
    reviewerStatusSnapshot?: string | null;
    disclaimer?: string | null;
    createdAt: string;
  }>;
}

export interface ReviewerActionRecord {
  id: string;
  actionType: string;
  targetType: string;
  targetId: string;
  details?: Record<string, unknown> | null;
  createdAt: string;
  actorUser?: {
    id: string;
    name: string;
    email: string;
  } | null;
}

export interface ClassificationRunRecord {
  id: string;
  archivedAt?: string | null;
  lifecycle?: 'active' | 'archived';
  lifecycleActions?: { canCancel: boolean; canArchive: boolean; canRestore: boolean; canPermanentlyDelete: boolean };
  cancellationRequestedAt?: string | null;
  cancelledAt?: string | null;
  cancellationFailureReason?: string | null;
  status: string;
  processingStatus?: string;
  processingLabel?: string;
  workflowState:
    | 'draft_generated'
    | 'awaiting_reviewer_assignment'
    | 'in_technical_review'
    | 'needs_additional_documentation'
    | 'escalated'
    | 'reviewer_conclusion_recorded'
    | 'approved_for_internal_use'
    | 'closed';
  workflowLabel: string;
  reviewStatus?: string;
  reviewStatusLabel?: string;
  reviewStatusDetail?: string;
  confidence?: number | null;
  confidenceRationale?: string | null;
  backendUsed?: string | null;
  backendReason?: string | null;
  underlyingProvider?: string | null;
  costUsd?: number | null;
  latencyMs?: number | null;
  tokensUsed?: number | null;
  uncertaintyFlags: string[];
  requiresHumanReview: boolean;
  reviewerAssignedUserId?: string | null;
  reviewerClaimedAt?: string | null;
  finalInternalRecommendation?: string | null;
  conclusionDisclaimer?: string | null;
  /** Legacy client-only fields; lifecycle API responses never expose storage paths. */
  extractedTextPath?: string | null;
  structuredOutputPath?: string | null;
  memoArtifactPath?: string | null;
  capabilitySignals?: CapabilitySignalRecord[];
  validationIssues?: ValidationIssueRecord[];
  heuristicResult?: Record<string, unknown> | null;
  classificationTrace?: Record<string, unknown> | null;
  fallbackUsed?: boolean;
  validationStatus?: string;
  executionSummary?: {
    executionMode?: 'local' | 'remote';
    selectedProvider?: 'gemma_local' | 'fireworks' | 'junglegrid' | 'amd_notebook_manual' | null;
    backendSelected?: string | null;
    backendCompleted: boolean;
    backendOutputValidated: boolean;
    memoValidated: boolean;
    workerOutputValidated: boolean;
    fallbackEnabled: boolean;
    fallbackUsed: boolean;
    missingFactCount: number;
    warningCount: number;
    evidenceChecksUnresolved: boolean;
    companyHistoryRetrieved: boolean;
    companyHistoryMatchCount: number;
  };
  executionProvenance?: {
    id: string;
    status: string;
    backend: string;
    externalJobId?: string | null;
    provider?: string | null;
    gpuVendor?: string | null;
    gpuName?: string | null;
    runtimeVersion?: string | null;
    modelName?: string | null;
    imageName?: string | null;
    imageDigest?: string | null;
    queuedAt?: string | null;
    submittedAt?: string | null;
    startedAt?: string | null;
    completedAt?: string | null;
    durationMs?: number | null;
    costEstimateUsd?: number | null;
    costActualUsd?: number | null;
    inputTokens?: number | null;
    outputTokens?: number | null;
    logPath?: string | null;
    errorMessage?: string | null;
  } | null;
  artifacts?: Array<{
    id: string;
    kind: string;
    fileName: string;
    mimeType?: string | null;
    sizeBytes?: number | null;
    sha256?: string | null;
    createdAt?: string;
    deletionRequestedAt?: string | null;
    deletionAttemptCount?: number;
    deletionFailureReason?: string | null;
    canDelete?: boolean;
    canRetryDeletion?: boolean;
  }>;
  companyHistoryMatches?: Array<{
    id: string;
    rank: number;
    score: number;
    matchTier: 'direct' | 'partial' | 'weak';
    matchReasons: string[];
    agreements: string[];
    materialDifferences: string[];
    blockingContradictions: string[];
    configurationDifferences: string[];
    recordRole: string;
    recommendedUse: 'precedent' | 'partial_precedent' | 'contrast' | 'context' | 'irrelevant';
    retrievalMethod: string;
    retrievalVersion: string;
    createdAt: string;
    sourceFileName: string;
    sourceTitle: string;
    importedAt: string;
    companyHistoryDocumentId: string;
    companyHistoryChunkId: string;
    excerpt: string;
  }>;
  createdAt?: string;
  completedAt?: string | null;
  lastReviewerActionAt?: string | null;
  document: {
    id: string;
    title: string;
    fileName: string;
    displayFileName?: string | null;
    mimeType?: string | null;
    sizeBytes?: number | null;
    storagePath?: string | null;
    sourceType?: string;
    documentType?: string | null;
    manufacturer?: string | null;
    sourceUrl?: string | null;
    sourceDate?: string | null;
    versionLabel?: string | null;
    sha256?: string | null;
    pageCount?: number | null;
    extractionStatus?: string | null;
    origin?: string | null;
    visibility?: string | null;
    summary?: string | null;
  };
  extractedSpecs: FactRecord[];
  factIssues: FactIssueRecord[];
  reviewPaths: ReviewPathRecord[];
  eccnCandidates: ECCNCandidateRecord[];
  reviewMemo?: ReviewMemoRecord | null;
  humanReviews: HumanReviewRecord[];
  reviewerActions: ReviewerActionRecord[];
  humanReviewStatus: string;
  hasReviewerConclusion: boolean;
}

export interface PublicClassificationRunRecord {
  id: string;
  status: string;
  processingStatus?: string;
  processingLabel?: string;
  workflowState: ClassificationRunRecord['workflowState'];
  workflowLabel: string;
  reviewStatus?: string;
  reviewStatusLabel?: string;
  reviewStatusDetail?: string;
  confidence?: number | null;
  confidenceRationale?: string | null;
  backendUsed?: string | null;
  backendReason?: string | null;
  underlyingProvider?: string | null;
  costUsd?: number | null;
  latencyMs?: number | null;
  tokensUsed?: number | null;
  uncertaintyFlags: string[];
  requiresHumanReview: boolean;
  publicTitle: string;
  publicSummary?: string | null;
  sourceDocumentDisplayName?: string | null;
  canonicalUrl: string;
  publishedAt?: string | null;
  createdAt?: string;
  completedAt?: string | null;
  demoBanner: string;
  capabilitySignals?: CapabilitySignalRecord[];
  validationIssues?: ValidationIssueRecord[];
  document: {
    title: string;
    displayFileName?: string | null;
    mimeType?: string | null;
    sizeBytes?: number | null;
    sourceType?: string;
    documentType?: string | null;
    manufacturer?: string | null;
    versionLabel?: string | null;
    pageCount?: number | null;
    summary?: string | null;
  };
  extractedSpecs: FactRecord[];
  factIssues: FactIssueRecord[];
  reviewPaths: ReviewPathRecord[];
  eccnCandidates: ECCNCandidateRecord[];
  reviewMemo?: ReviewMemoRecord | null;
  latestReview?: {
    status: string;
    workflowState: string;
    notes?: string | null;
    conclusionRecordedAt?: string | null;
    reviewedAt?: string | null;
  } | null;
}

export interface DemoPublicationStatusRecord {
  canPublish: boolean;
  publishBlockTitle?: string | null;
  publishBlockReason?: string | null;
  isPublished: boolean;
  publishedAt?: string | null;
  publicTitle?: string | null;
  publicSummary?: string | null;
  sourceDocumentDisplayName?: string | null;
  canonicalUrl: string;
  activeDemoRunId?: string | null;
  willReplaceActiveDemo: boolean;
}

export interface DocumentRecord {
  id: string;
  title: string;
  fileName: string;
  displayFileName?: string | null;
  mimeType?: string | null;
  sizeBytes?: number | null;
  sourceType?: string;
  documentType?: string | null;
  manufacturer?: string | null;
  sourceUrl?: string | null;
  sourceDate?: string | null;
  versionLabel?: string | null;
  sha256?: string | null;
  pageCount?: number | null;
  extractionStatus?: string | null;
  origin?: string | null;
  visibility?: string | null;
  rawText?: string | null;
  archivedAt?: string | null;
  lifecycle?: 'active' | 'archived';
  lifecycleActions?: { canArchive: boolean; canRestore: boolean; canPermanentlyDelete: boolean };
  createdAt?: string;
  classificationRuns?: ClassificationRunRecord[];
  demoNote?: string;
}

export interface MemoListRecord {
  id: string;
  classificationRunId: string;
  documentId: string;
  documentTitle: string;
  documentFileName: string;
  generatedBy: string;
  versionNumber?: number;
  reviewStateSnapshot?: string;
  reviewerStatusSnapshot?: string | null;
  updatedAt: string;
  humanReviewStatus: string;
}

export interface TeamMemberRecord {
  id: string;
  role: MembershipRecord['role'];
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    emailVerifiedAt?: string | null;
  };
}

export interface InviteRecord {
  id: string;
  email: string;
  role: MembershipRecord['role'];
  createdAt: string;
  expiresAt: string;
  acceptedAt?: string | null;
  revokedAt?: string | null;
  invitedBy: {
    id: string;
    name: string;
  };
  acceptedBy?: {
    id: string;
    name: string;
  } | null;
}

export interface AuditEventRecord {
  id: string;
  actor: string;
  actorUser?: {
    id: string;
    name: string;
    email: string;
  } | null;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
}

export type CompanyHistoryRecordType =
  | 'datasheet'
  | 'prior_memo'
  | 'catalog'
  | 'review_note'
  | 'spreadsheet'
  | 'approval_record'
  | 'technical_spec'
  | 'other';

export type CompanyHistoryIngestionStatus =
  | 'queued'
  | 'processing'
  | 'indexed'
  | 'duplicate'
  | 'failed';

export interface CompanyHistoryBatchRecord {
  id: string;
  name: string;
  status:
    | 'queued'
    | 'processing'
    | 'completed'
    | 'completed_with_errors'
    | 'failed';
  fileCount: number;
  completedCount: number;
  failedCount: number;
  createdAt: string;
  updatedAt: string;
  totals: {
    files: number;
    queued: number;
    processing: number;
    indexed: number;
    failed: number;
    duplicates: number;
  } | null;
  documents: Array<{
    id: string;
    documentId: string;
    fileName: string;
    title: string;
    mimeType: string;
    sizeBytes: number;
    recordType: CompanyHistoryRecordType;
    status: CompanyHistoryIngestionStatus;
    attemptCount: number;
    errorCode?: string | null;
    errorMessage?: string | null;
    processedAt?: string | null;
    duplicateOf?: { id: string; fileName: string } | null;
    createdAt: string;
  }>;
}

export interface CompanyHistoryDocumentRecord {
  id: string;
  recordType: CompanyHistoryRecordType;
  ingestionStatus: CompanyHistoryIngestionStatus;
  attemptCount: number;
  errorCode?: string | null;
  errorMessage?: string | null;
  metadata?: {
    extractionVersion?: string;
    productIdentifiers?: Array<{ value: string; sourceSnippet: string }>;
    skuModelStrings?: Array<{ value: string; sourceSnippet: string }>;
    eccnMentions?: Array<{ value: string; sourceSnippet: string }>;
  } | null;
  ingestionVersion: number;
  processedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  document: {
    id: string;
    title: string;
    fileName: string;
    displayFileName?: string | null;
    mimeType: string;
    sizeBytes: number;
    sha256?: string | null;
    createdAt: string;
  };
  batch: { id: string; name: string; createdAt: string };
  duplicateOf?: { id: string; fileName: string } | null;
  chunks: Array<{
    id: string;
    ordinal: number;
    content: string;
    charStart: number;
    charEnd: number;
    ingestionVersion: number;
  }>;
  matchUsage: Array<{
    id: string;
    rank: number;
    score: number;
    matchTier: 'direct' | 'partial' | 'weak';
    matchReasons: unknown;
    createdAt: string;
    classificationRunId: string;
  }>;
}
