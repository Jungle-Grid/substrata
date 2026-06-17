-- CreateEnum
CREATE TYPE "DocumentSourceType" AS ENUM ('upload', 'seed', 'manual');

-- CreateEnum
CREATE TYPE "ClassificationRunStatus" AS ENUM ('pending', 'queued', 'running', 'completed', 'failed');

-- CreateEnum
CREATE TYPE "HumanReviewStatus" AS ENUM ('pending_review', 'reviewed', 'needs_more_information', 'in_review', 'approved', 'rejected');

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'reviewer',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER,
    "storagePath" TEXT NOT NULL,
    "sourceType" "DocumentSourceType" NOT NULL DEFAULT 'upload',
    "rawText" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassificationRun" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "status" "ClassificationRunStatus" NOT NULL DEFAULT 'pending',
    "trigger" TEXT NOT NULL DEFAULT 'manual',
    "confidence" DOUBLE PRECISION,
    "uncertaintyFlags" TEXT[],
    "requiresHumanReview" BOOLEAN NOT NULL DEFAULT true,
    "workerJobId" TEXT,
    "workerVersion" TEXT,
    "rulesVersion" TEXT,
    "extractedTextPath" TEXT,
    "structuredOutputPath" TEXT,
    "memoArtifactPath" TEXT,
    "errorMessage" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClassificationRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExtractedSpec" (
    "id" TEXT NOT NULL,
    "classificationRunId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "unit" TEXT,
    "sourceSnippet" TEXT NOT NULL,
    "importance" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExtractedSpec_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ECCNCandidate" (
    "id" TEXT NOT NULL,
    "classificationRunId" TEXT NOT NULL,
    "eccn" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "rationale" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "confidenceLevel" TEXT NOT NULL DEFAULT 'medium',
    "matchedTechnicalFacts" TEXT[],
    "whyItMayApply" TEXT NOT NULL,
    "whyItMayNotApply" TEXT NOT NULL,
    "missingInformation" TEXT[],
    "reviewerQuestions" TEXT[],
    "uncertaintyFlags" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ECCNCandidate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Citation" (
    "id" TEXT NOT NULL,
    "classificationRunId" TEXT NOT NULL,
    "eccnCandidateId" TEXT,
    "sourceTitle" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "sourceSection" TEXT,
    "quotedText" TEXT NOT NULL,
    "relevanceNote" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Citation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReviewMemo" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "classificationRunId" TEXT NOT NULL,
    "contentMarkdown" TEXT NOT NULL,
    "generatedBy" TEXT NOT NULL DEFAULT 'worker_stub',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReviewMemo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HumanReview" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "classificationRunId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "status" "HumanReviewStatus" NOT NULL DEFAULT 'pending_review',
    "notes" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HumanReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditEvent" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "actorUserId" TEXT,
    "actor" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Document_organizationId_createdAt_idx" ON "Document"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "ClassificationRun_organizationId_createdAt_idx" ON "ClassificationRun"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "ClassificationRun_documentId_createdAt_idx" ON "ClassificationRun"("documentId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ReviewMemo_classificationRunId_key" ON "ReviewMemo"("classificationRunId");

-- CreateIndex
CREATE INDEX "AuditEvent_organizationId_createdAt_idx" ON "AuditEvent"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditEvent_entityType_entityId_idx" ON "AuditEvent"("entityType", "entityId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassificationRun" ADD CONSTRAINT "ClassificationRun_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassificationRun" ADD CONSTRAINT "ClassificationRun_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExtractedSpec" ADD CONSTRAINT "ExtractedSpec_classificationRunId_fkey" FOREIGN KEY ("classificationRunId") REFERENCES "ClassificationRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ECCNCandidate" ADD CONSTRAINT "ECCNCandidate_classificationRunId_fkey" FOREIGN KEY ("classificationRunId") REFERENCES "ClassificationRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Citation" ADD CONSTRAINT "Citation_classificationRunId_fkey" FOREIGN KEY ("classificationRunId") REFERENCES "ClassificationRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Citation" ADD CONSTRAINT "Citation_eccnCandidateId_fkey" FOREIGN KEY ("eccnCandidateId") REFERENCES "ECCNCandidate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewMemo" ADD CONSTRAINT "ReviewMemo_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewMemo" ADD CONSTRAINT "ReviewMemo_classificationRunId_fkey" FOREIGN KEY ("classificationRunId") REFERENCES "ClassificationRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HumanReview" ADD CONSTRAINT "HumanReview_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HumanReview" ADD CONSTRAINT "HumanReview_classificationRunId_fkey" FOREIGN KEY ("classificationRunId") REFERENCES "ClassificationRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HumanReview" ADD CONSTRAINT "HumanReview_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
