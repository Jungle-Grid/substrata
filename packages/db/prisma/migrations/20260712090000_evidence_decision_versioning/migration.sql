ALTER TABLE "ClassificationRun"
  ADD COLUMN "pipelineVersion" TEXT,
  ADD COLUMN "decisionSchemaVersion" TEXT,
  ADD COLUMN "promptVersion" TEXT,
  ADD COLUMN "regulatoryCorpusVersion" TEXT,
  ADD COLUMN "retrievalIndexVersion" TEXT,
  ADD COLUMN "evidenceSnapshot" JSONB,
  ADD COLUMN "contradictionSnapshot" JSONB,
  ADD COLUMN "decisionSnapshot" JSONB;

COMMENT ON COLUMN "ClassificationRun"."pipelineVersion" IS
  'Immutable pipeline version for this run. Existing rows remain legacy and are never silently reinterpreted.';
COMMENT ON COLUMN "ClassificationRun"."regulatoryCorpusVersion" IS
  'Version of the official regulatory corpus available during the run; NULL means unavailable/legacy.';
