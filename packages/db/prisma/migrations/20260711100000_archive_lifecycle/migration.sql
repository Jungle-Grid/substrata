ALTER TABLE "Document"
ADD COLUMN "archivedAt" TIMESTAMP(3),
ADD COLUMN "archivedByUserId" TEXT;

ALTER TABLE "ClassificationRun"
ADD COLUMN "archivedAt" TIMESTAMP(3),
ADD COLUMN "archivedByUserId" TEXT;

CREATE INDEX "Document_organizationId_archivedAt_createdAt_idx"
ON "Document"("organizationId", "archivedAt", "createdAt");

CREATE INDEX "ClassificationRun_organizationId_archivedAt_createdAt_idx"
ON "ClassificationRun"("organizationId", "archivedAt", "createdAt");
