ALTER TABLE "Organization"
ADD COLUMN IF NOT EXISTS "defaultExecutionPreference" TEXT NOT NULL DEFAULT 'auto';
