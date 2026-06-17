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

export interface ApiResult<T> {
  data: T | null;
  fallback: boolean;
  error?: string;
}
