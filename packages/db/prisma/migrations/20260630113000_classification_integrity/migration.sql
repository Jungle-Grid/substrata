ALTER TYPE "ClassificationRunStatus" ADD VALUE IF NOT EXISTS 'needs_attention';

ALTER TABLE "ClassificationRun"
ADD COLUMN IF NOT EXISTS "capabilitySignals" JSONB,
ADD COLUMN IF NOT EXISTS "validationIssues" JSONB;
