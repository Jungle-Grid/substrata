CREATE TYPE "CompanyHistoryBatchStatus" AS ENUM (
  'queued',
  'processing',
  'completed',
  'completed_with_errors',
  'failed'
);

CREATE TYPE "CompanyHistoryRecordType" AS ENUM (
  'datasheet',
  'prior_memo',
  'catalog',
  'review_note',
  'spreadsheet',
  'approval_record',
  'technical_spec',
  'other'
);

CREATE TYPE "CompanyHistoryIngestionStatus" AS ENUM (
  'queued',
  'processing',
  'indexed',
  'duplicate',
  'failed'
);

CREATE TYPE "CompanyHistoryMatchTier" AS ENUM ('direct', 'partial', 'weak');

CREATE TABLE "CompanyHistoryBatch" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "createdByUserId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "status" "CompanyHistoryBatchStatus" NOT NULL DEFAULT 'queued',
  "fileCount" INTEGER NOT NULL DEFAULT 0,
  "completedCount" INTEGER NOT NULL DEFAULT 0,
  "failedCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CompanyHistoryBatch_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CompanyHistoryDocument" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "batchId" TEXT NOT NULL,
  "documentId" TEXT NOT NULL,
  "recordType" "CompanyHistoryRecordType" NOT NULL DEFAULT 'other',
  "ingestionStatus" "CompanyHistoryIngestionStatus" NOT NULL DEFAULT 'queued',
  "attemptCount" INTEGER NOT NULL DEFAULT 0,
  "errorCode" TEXT,
  "errorMessage" TEXT,
  "metadata" JSONB,
  "ingestionVersion" INTEGER NOT NULL DEFAULT 1,
  "processedAt" TIMESTAMP(3),
  "duplicateOfHistoryDocumentId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CompanyHistoryDocument_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CompanyHistoryChunk" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "companyHistoryDocumentId" TEXT NOT NULL,
  "ordinal" INTEGER NOT NULL,
  "content" TEXT NOT NULL,
  "charStart" INTEGER NOT NULL,
  "charEnd" INTEGER NOT NULL,
  "contentHash" TEXT NOT NULL,
  "ingestionVersion" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CompanyHistoryChunk_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ClassificationHistoryMatch" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "classificationRunId" TEXT NOT NULL,
  "companyHistoryDocumentId" TEXT NOT NULL,
  "companyHistoryChunkId" TEXT NOT NULL,
  "rank" INTEGER NOT NULL,
  "score" DOUBLE PRECISION NOT NULL,
  "matchTier" "CompanyHistoryMatchTier" NOT NULL,
  "matchReasons" JSONB NOT NULL,
  "retrievalMethod" TEXT NOT NULL,
  "retrievalVersion" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ClassificationHistoryMatch_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CompanyHistoryDocument_documentId_key" ON "CompanyHistoryDocument"("documentId");
CREATE INDEX "CompanyHistoryBatch_organizationId_createdAt_idx" ON "CompanyHistoryBatch"("organizationId", "createdAt");
CREATE INDEX "CompanyHistoryBatch_organizationId_status_createdAt_idx" ON "CompanyHistoryBatch"("organizationId", "status", "createdAt");
CREATE INDEX "CompanyHistoryDocument_organizationId_batchId_createdAt_idx" ON "CompanyHistoryDocument"("organizationId", "batchId", "createdAt");
CREATE INDEX "CompanyHistoryDocument_organizationId_ingestionStatus_createdAt_idx" ON "CompanyHistoryDocument"("organizationId", "ingestionStatus", "createdAt");
CREATE UNIQUE INDEX "CompanyHistoryChunk_companyHistoryDocumentId_ingestionVersion_ordinal_key" ON "CompanyHistoryChunk"("companyHistoryDocumentId", "ingestionVersion", "ordinal");
CREATE INDEX "CompanyHistoryChunk_organizationId_createdAt_idx" ON "CompanyHistoryChunk"("organizationId", "createdAt");
CREATE INDEX "CompanyHistoryChunk_organizationId_companyHistoryDocumentId_ingestionVersion_idx" ON "CompanyHistoryChunk"("organizationId", "companyHistoryDocumentId", "ingestionVersion");
CREATE UNIQUE INDEX "ClassificationHistoryMatch_classificationRunId_companyHistoryChunkId_key" ON "ClassificationHistoryMatch"("classificationRunId", "companyHistoryChunkId");
CREATE INDEX "ClassificationHistoryMatch_organizationId_classificationRunId_rank_idx" ON "ClassificationHistoryMatch"("organizationId", "classificationRunId", "rank");
CREATE INDEX "Document_organizationId_sha256_idx" ON "Document"("organizationId", "sha256");

ALTER TABLE "CompanyHistoryBatch" ADD CONSTRAINT "CompanyHistoryBatch_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CompanyHistoryBatch" ADD CONSTRAINT "CompanyHistoryBatch_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CompanyHistoryDocument" ADD CONSTRAINT "CompanyHistoryDocument_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CompanyHistoryDocument" ADD CONSTRAINT "CompanyHistoryDocument_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "CompanyHistoryBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CompanyHistoryDocument" ADD CONSTRAINT "CompanyHistoryDocument_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CompanyHistoryDocument" ADD CONSTRAINT "CompanyHistoryDocument_duplicateOfHistoryDocumentId_fkey" FOREIGN KEY ("duplicateOfHistoryDocumentId") REFERENCES "CompanyHistoryDocument"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CompanyHistoryChunk" ADD CONSTRAINT "CompanyHistoryChunk_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CompanyHistoryChunk" ADD CONSTRAINT "CompanyHistoryChunk_companyHistoryDocumentId_fkey" FOREIGN KEY ("companyHistoryDocumentId") REFERENCES "CompanyHistoryDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClassificationHistoryMatch" ADD CONSTRAINT "ClassificationHistoryMatch_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClassificationHistoryMatch" ADD CONSTRAINT "ClassificationHistoryMatch_classificationRunId_fkey" FOREIGN KEY ("classificationRunId") REFERENCES "ClassificationRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClassificationHistoryMatch" ADD CONSTRAINT "ClassificationHistoryMatch_companyHistoryDocumentId_fkey" FOREIGN KEY ("companyHistoryDocumentId") REFERENCES "CompanyHistoryDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClassificationHistoryMatch" ADD CONSTRAINT "ClassificationHistoryMatch_companyHistoryChunkId_fkey" FOREIGN KEY ("companyHistoryChunkId") REFERENCES "CompanyHistoryChunk"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Built-in PostgreSQL full-text search, intentionally no embeddings or external index.
CREATE INDEX "CompanyHistoryChunk_content_fts_idx"
ON "CompanyHistoryChunk"
USING GIN (to_tsvector('simple', "content"));
