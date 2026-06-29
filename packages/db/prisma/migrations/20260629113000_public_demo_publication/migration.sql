CREATE TYPE "PublicDemoPublicationStatus" AS ENUM ('published', 'unpublished');

CREATE TABLE "PublicDemoPublication" (
    "id" TEXT NOT NULL,
    "status" "PublicDemoPublicationStatus" NOT NULL DEFAULT 'unpublished',
    "activeClassificationRunId" TEXT,
    "publishedAt" TIMESTAMP(3),
    "publishedByUserId" TEXT,
    "publicTitle" TEXT,
    "publicSummary" TEXT,
    "sourceDocumentDisplayName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PublicDemoPublication_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PublicDemoPublication_activeClassificationRunId_key" ON "PublicDemoPublication"("activeClassificationRunId");
CREATE INDEX "PublicDemoPublication_status_updatedAt_idx" ON "PublicDemoPublication"("status", "updatedAt");

ALTER TABLE "PublicDemoPublication" ADD CONSTRAINT "PublicDemoPublication_activeClassificationRunId_fkey" FOREIGN KEY ("activeClassificationRunId") REFERENCES "ClassificationRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PublicDemoPublication" ADD CONSTRAINT "PublicDemoPublication_publishedByUserId_fkey" FOREIGN KEY ("publishedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
