import type {
  ClassificationRun,
  Citation,
  Document,
  ECCNCandidate,
  ExtractedSpec,
  HumanReview,
  PublicDemoPublication,
  ReviewMemo,
  User,
} from '@substrata/db';

type RunWithRelations = ClassificationRun & {
  document: Document;
  extractedSpecs: ExtractedSpec[];
  eccnCandidates: (ECCNCandidate & { citations: Citation[] })[];
  reviewMemo: ReviewMemo | null;
  humanReviews: Array<HumanReview & { reviewer?: User | null }>;
};

type PublicDemoRunWithPublication = PublicDemoPublication & {
  activeClassificationRun:
    | (ClassificationRun & {
        document: Document;
        extractedSpecs: ExtractedSpec[];
        eccnCandidates: (ECCNCandidate & { citations: Citation[] })[];
        reviewMemo: ReviewMemo | null;
        humanReviews: Array<HumanReview & { reviewer?: User | null }>;
      })
    | null;
};

type DocumentWithRunRelations = Document & {
  classificationRuns?: Array<
    ClassificationRun & {
      extractedSpecs?: ExtractedSpec[];
      eccnCandidates?: Array<ECCNCandidate & { citations?: Citation[] }>;
      reviewMemo?: ReviewMemo | null;
      humanReviews?: Array<HumanReview & { reviewer?: User | null }>;
    }
  >;
};

function presentCitation(citation: Citation) {
  return {
    id: citation.id,
    citationLabel: citation.sourceTitle,
    citationText: citation.quotedText,
    source: citation.sourceSection ?? citation.sourceUrl ?? citation.sourceTitle,
    relevance: citation.relevanceNote,
  };
}

export function presentRun(run: RunWithRelations) {
  return {
    id: run.id,
    status: run.status,
    confidence: run.confidence,
    uncertaintyFlags: run.uncertaintyFlags,
    requiresHumanReview: run.requiresHumanReview,
    extractedTextPath: run.extractedTextPath,
    structuredOutputPath: run.structuredOutputPath,
    memoArtifactPath: run.memoArtifactPath,
    completedAt: run.completedAt,
    createdAt: run.createdAt,
    document: {
      id: run.document.id,
      title: run.document.title,
      fileName: run.document.fileName,
      mimeType: run.document.mimeType,
      sizeBytes: run.document.sizeBytes,
      storagePath: run.document.storagePath,
      sourceType: run.document.sourceType,
      summary: run.document.rawText?.slice(0, 420) ?? null,
    },
    extractedSpecs: run.extractedSpecs.map((spec: ExtractedSpec) => ({
      id: spec.id,
      name: spec.name,
      value: spec.value,
      unit: spec.unit,
      sourceSnippet: spec.sourceSnippet,
      importance: spec.importance,
      category: spec.category,
      confidence: spec.confidenceLevel,
    })),
    eccnCandidates: run.eccnCandidates.map((candidate: ECCNCandidate & { citations: Citation[] }) => ({
      id: candidate.id,
      eccn: candidate.eccn,
      title: candidate.title,
      confidence: candidate.confidenceLevel,
      matchedTechnicalFacts: candidate.matchedTechnicalFacts,
      regulatoryCitations: candidate.citations.map(presentCitation),
      whyItMayApply: candidate.whyItMayApply,
      whyItMayNotApply: candidate.whyItMayNotApply,
      missingInformation: candidate.missingInformation,
      uncertaintyFlags: candidate.uncertaintyFlags,
      reviewerQuestions: candidate.reviewerQuestions,
    })),
    reviewMemo: run.reviewMemo
      ? {
          id: run.reviewMemo.id,
          contentMarkdown: run.reviewMemo.contentMarkdown,
          generatedBy: run.reviewMemo.generatedBy,
          updatedAt: run.reviewMemo.updatedAt,
        }
      : null,
    humanReviews: run.humanReviews.map((review) => ({
      id: review.id,
      status: review.status,
      notes: review.notes,
      reviewedAt: review.reviewedAt,
      reviewer: review.reviewer
        ? {
            id: review.reviewer.id,
            name: review.reviewer.name,
            email: review.reviewer.email,
          }
        : null,
    })),
  };
}

export function presentPublicDemoRun(publication: PublicDemoRunWithPublication) {
  const run = publication.activeClassificationRun;

  if (!run) {
    throw new Error('Public demo publication is missing its active classification run.');
  }

  const latestReview = run.humanReviews[0] ?? null;

  return {
    id: run.id,
    status: run.status,
    confidence: run.confidence,
    uncertaintyFlags: run.uncertaintyFlags,
    requiresHumanReview: run.requiresHumanReview,
    publicTitle: publication.publicTitle ?? run.document.title,
    publicSummary: publication.publicSummary,
    sourceDocumentDisplayName: publication.sourceDocumentDisplayName,
    canonicalUrl: `/classification-runs/${run.id}`,
    publishedAt: publication.publishedAt,
    createdAt: run.createdAt,
    completedAt: run.completedAt,
    document: {
      title: run.document.title,
      mimeType: run.document.mimeType,
      sizeBytes: run.document.sizeBytes,
      sourceType: run.document.sourceType,
      summary: run.document.rawText?.slice(0, 420) ?? null,
    },
    extractedSpecs: run.extractedSpecs.map((spec) => ({
      id: spec.id,
      name: spec.name,
      value: spec.value,
      unit: spec.unit,
      sourceSnippet: spec.sourceSnippet,
      importance: spec.importance,
      category: spec.category,
      confidence: spec.confidenceLevel,
    })),
    eccnCandidates: run.eccnCandidates.map((candidate) => ({
      id: candidate.id,
      eccn: candidate.eccn,
      title: candidate.title,
      confidence: candidate.confidenceLevel,
      matchedTechnicalFacts: candidate.matchedTechnicalFacts,
      regulatoryCitations: candidate.citations.map(presentCitation),
      whyItMayApply: candidate.whyItMayApply,
      whyItMayNotApply: candidate.whyItMayNotApply,
      missingInformation: candidate.missingInformation,
      uncertaintyFlags: candidate.uncertaintyFlags,
      reviewerQuestions: candidate.reviewerQuestions,
    })),
    reviewMemo: run.reviewMemo
      ? {
          contentMarkdown: run.reviewMemo.contentMarkdown,
          updatedAt: run.reviewMemo.updatedAt,
        }
      : null,
    latestReview: latestReview
      ? {
          status: latestReview.status,
          notes: latestReview.notes,
          reviewedAt: latestReview.reviewedAt,
        }
      : null,
  };
}

export function presentPublicDemoMetadata(publication: PublicDemoRunWithPublication) {
  const run = publication.activeClassificationRun;

  if (!run) {
    throw new Error('Public demo publication is missing its active classification run.');
  }

  return {
    runId: run.id,
    status: publication.status,
    publishedAt: publication.publishedAt,
    publicTitle: publication.publicTitle ?? run.document.title,
    publicSummary: publication.publicSummary,
    sourceDocumentDisplayName: publication.sourceDocumentDisplayName,
    completedAt: run.completedAt,
    canonicalUrl: `/classification-runs/${run.id}`,
  };
}

export function presentDocument(document: DocumentWithRunRelations) {
  return {
    id: document.id,
    title: document.title,
    fileName: document.fileName,
    mimeType: document.mimeType,
    sizeBytes: document.sizeBytes,
    storagePath: document.storagePath,
    sourceType: document.sourceType,
    rawText: document.rawText,
    createdAt: document.createdAt,
    classificationRuns: document.classificationRuns?.map((run) => ({
      id: run.id,
      status: run.status,
      confidence: run.confidence ?? null,
      uncertaintyFlags: run.uncertaintyFlags ?? [],
      requiresHumanReview: run.requiresHumanReview ?? true,
      extractedTextPath: run.extractedTextPath ?? null,
      structuredOutputPath: run.structuredOutputPath ?? null,
      memoArtifactPath: run.memoArtifactPath ?? null,
      document: {
        id: document.id,
        title: document.title,
        fileName: document.fileName,
        mimeType: document.mimeType,
        sizeBytes: document.sizeBytes,
        storagePath: document.storagePath,
        sourceType: document.sourceType,
        summary: document.rawText?.slice(0, 420) ?? null,
      },
      extractedSpecs:
        run.extractedSpecs?.map((spec) => ({
          id: spec.id,
          name: spec.name,
          value: spec.value,
          unit: spec.unit,
          sourceSnippet: spec.sourceSnippet,
          importance: spec.importance,
          category: spec.category,
          confidence: spec.confidenceLevel,
        })) ?? [],
      eccnCandidates:
        run.eccnCandidates?.map((candidate) => ({
          id: candidate.id,
          eccn: candidate.eccn,
          title: candidate.title,
          confidence: candidate.confidenceLevel,
          matchedTechnicalFacts: candidate.matchedTechnicalFacts,
          regulatoryCitations:
            candidate.citations?.map((citation: Citation) => presentCitation(citation)) ??
            [],
          whyItMayApply: candidate.whyItMayApply,
          whyItMayNotApply: candidate.whyItMayNotApply,
          missingInformation: candidate.missingInformation,
          uncertaintyFlags: candidate.uncertaintyFlags,
          reviewerQuestions: candidate.reviewerQuestions,
        })) ?? [],
      reviewMemo: run.reviewMemo
        ? {
            id: run.reviewMemo.id,
            contentMarkdown: run.reviewMemo.contentMarkdown,
            generatedBy: run.reviewMemo.generatedBy,
            updatedAt: run.reviewMemo.updatedAt,
          }
        : null,
      humanReviews:
        run.humanReviews?.map((review) => ({
          id: review.id,
          status: review.status,
          notes: review.notes,
          reviewedAt: review.reviewedAt,
          reviewer: review.reviewer
            ? {
                id: review.reviewer.id,
                name: review.reviewer.name,
                email: review.reviewer.email,
              }
            : null,
        })) ?? [],
    })),
  };
}
