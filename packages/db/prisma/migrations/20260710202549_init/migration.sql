-- Restored from the applied migration history: this additive migration created
-- the workspace execution preference before later migrations normalized its
-- default to `remote`.
ALTER TABLE "Organization"
ADD COLUMN "defaultExecutionPreference" TEXT NOT NULL DEFAULT 'auto';
