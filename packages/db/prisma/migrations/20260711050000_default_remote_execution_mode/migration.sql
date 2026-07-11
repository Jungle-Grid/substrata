ALTER TABLE "Organization"
ALTER COLUMN "defaultExecutionPreference" SET DEFAULT 'remote';

UPDATE "Organization"
SET "defaultExecutionPreference" = 'remote'
WHERE "defaultExecutionPreference" NOT IN ('local', 'remote');
