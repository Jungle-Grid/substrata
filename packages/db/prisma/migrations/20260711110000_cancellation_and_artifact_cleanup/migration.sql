ALTER TYPE "ClassificationRunStatus" ADD VALUE IF NOT EXISTS 'cancelled';

ALTER TABLE "ClassificationRun"
ADD COLUMN "cancellationRequestedAt" TIMESTAMP(3),
ADD COLUMN "cancelledAt" TIMESTAMP(3),
ADD COLUMN "cancellationFailureReason" TEXT;

ALTER TABLE "Artifact"
ADD COLUMN "deletionRequestedAt" TIMESTAMP(3),
ADD COLUMN "deletionAttemptCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "deletionFailureReason" TEXT;
