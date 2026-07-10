ALTER TYPE "ClassificationRunStatus" ADD VALUE IF NOT EXISTS 'blocked';

CREATE TYPE "ExecutionJobStatus" AS ENUM ('queued', 'submitted', 'running', 'completed', 'failed', 'blocked', 'unknown');
CREATE TYPE "ArtifactKind" AS ENUM ('source_document', 'extracted_text', 'structured_output', 'memo_markdown', 'worker_log', 'execution_metadata');

ALTER TABLE "ClassificationRun"
  ADD COLUMN "fallbackUsed" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "validationStatus" TEXT NOT NULL DEFAULT 'pending';

CREATE TABLE "ExecutionJob" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "classificationRunId" TEXT NOT NULL,
  "backend" TEXT NOT NULL,
  "status" "ExecutionJobStatus" NOT NULL DEFAULT 'queued',
  "externalJobId" TEXT,
  "provider" TEXT,
  "gpuVendor" TEXT,
  "gpuName" TEXT,
  "runtimeVersion" TEXT,
  "modelName" TEXT,
  "imageName" TEXT,
  "imageDigest" TEXT,
  "queuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "submittedAt" TIMESTAMP(3),
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "durationMs" DOUBLE PRECISION,
  "costEstimateUsd" DOUBLE PRECISION,
  "costActualUsd" DOUBLE PRECISION,
  "inputTokens" INTEGER,
  "outputTokens" INTEGER,
  "logPath" TEXT,
  "metadata" JSONB,
  "errorMessage" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ExecutionJob_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Artifact" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "classificationRunId" TEXT,
  "documentId" TEXT,
  "kind" "ArtifactKind" NOT NULL,
  "storagePath" TEXT NOT NULL,
  "fileName" TEXT NOT NULL,
  "mimeType" TEXT,
  "sizeBytes" INTEGER,
  "sha256" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Artifact_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ExecutionJob_classificationRunId_key" ON "ExecutionJob"("classificationRunId");
CREATE UNIQUE INDEX "ExecutionJob_externalJobId_key" ON "ExecutionJob"("externalJobId");
CREATE INDEX "ExecutionJob_organizationId_status_createdAt_idx" ON "ExecutionJob"("organizationId", "status", "createdAt");
CREATE INDEX "Artifact_organizationId_classificationRunId_createdAt_idx" ON "Artifact"("organizationId", "classificationRunId", "createdAt");
CREATE INDEX "Artifact_documentId_createdAt_idx" ON "Artifact"("documentId", "createdAt");

ALTER TABLE "ExecutionJob" ADD CONSTRAINT "ExecutionJob_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ExecutionJob" ADD CONSTRAINT "ExecutionJob_classificationRunId_fkey" FOREIGN KEY ("classificationRunId") REFERENCES "ClassificationRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Artifact" ADD CONSTRAINT "Artifact_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Artifact" ADD CONSTRAINT "Artifact_classificationRunId_fkey" FOREIGN KEY ("classificationRunId") REFERENCES "ClassificationRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Artifact" ADD CONSTRAINT "Artifact_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;
