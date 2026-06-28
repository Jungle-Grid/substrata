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

export interface RegulatoryCitationRecord {
  id?: string;
  citationLabel: string;
  citationText: string;
  source: string;
  relevance: string;
}

export interface ECCNCandidateRecord {
  id: string;
  eccn: string;
  title: string;
  confidence: 'high' | 'medium' | 'low';
  matchedTechnicalFacts: string[];
  regulatoryCitations: RegulatoryCitationRecord[];
  whyItMayApply: string;
  whyItMayNotApply: string;
  missingInformation: string[];
  uncertaintyFlags: string[];
  reviewerQuestions: string[];
}

export interface ExtractedSpecRecord {
  id: string;
  name: string;
  value: string;
  unit?: string | null;
  sourceSnippet: string;
  importance: string;
  category: string;
  confidence: 'high' | 'medium' | 'low';
}

export interface HumanReviewRecord {
  id: string;
  status: string;
  notes?: string | null;
  reviewedAt?: string | null;
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
  updatedAt?: string;
}

export interface ClassificationRunRecord {
  id: string;
  status: string;
  confidence?: number | null;
  uncertaintyFlags: string[];
  requiresHumanReview: boolean;
  extractedTextPath?: string | null;
  structuredOutputPath?: string | null;
  memoArtifactPath?: string | null;
  createdAt?: string;
  completedAt?: string | null;
  document: {
    id: string;
    title: string;
    fileName: string;
    mimeType?: string | null;
    sizeBytes?: number | null;
    storagePath?: string | null;
    sourceType?: string;
    summary?: string | null;
  };
  extractedSpecs: ExtractedSpecRecord[];
  eccnCandidates: ECCNCandidateRecord[];
  reviewMemo?: ReviewMemoRecord | null;
  humanReviews: HumanReviewRecord[];
}

export interface DocumentRecord {
  id: string;
  title: string;
  fileName: string;
  mimeType?: string | null;
  sizeBytes?: number | null;
  storagePath?: string | null;
  sourceType?: string;
  rawText?: string | null;
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
