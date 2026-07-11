ALTER TABLE "ClassificationRun"
ADD COLUMN "heuristicResult" JSONB,
ADD COLUMN "classificationTrace" JSONB;

ALTER TABLE "ECCNCandidate"
ADD COLUMN "candidateType" TEXT NOT NULL DEFAULT 'review_candidate',
ADD COLUMN "companyHistorySupport" JSONB,
ADD COLUMN "contradictions" JSONB,
ADD COLUMN "humanReviewRequired" BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX "ECCNCandidate_classificationRunId_candidateType_idx"
ON "ECCNCandidate"("classificationRunId", "candidateType");
