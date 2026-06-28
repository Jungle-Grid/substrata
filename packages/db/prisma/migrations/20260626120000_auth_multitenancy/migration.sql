-- CreateEnum
CREATE TYPE "MembershipRole" AS ENUM ('OWNER', 'ADMIN', 'REVIEWER', 'ANALYST', 'VIEWER');

-- CreateEnum
CREATE TYPE "OAuthProvider" AS ENUM ('GOOGLE');

-- AlterTable
ALTER TABLE "Organization"
ADD COLUMN "industry" TEXT;

-- AlterTable
ALTER TABLE "User"
ADD COLUMN "emailVerifiedAt" TIMESTAMP(3),
ADD COLUMN "onboardingCompletedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "PasswordCredential" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PasswordCredential_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OAuthIdentity" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" "OAuthProvider" NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OAuthIdentity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "csrfTokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "lastAccessedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "rotatedFromId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailVerificationToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailVerificationToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Membership" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "MembershipRole" NOT NULL DEFAULT 'REVIEWER',
    "invitedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Membership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkspaceInvite" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "MembershipRole" NOT NULL DEFAULT 'REVIEWER',
    "tokenHash" TEXT NOT NULL,
    "invitedByUserId" TEXT NOT NULL,
    "acceptedByUserId" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkspaceInvite_pkey" PRIMARY KEY ("id")
);

-- BackfillMemberships
INSERT INTO "Membership" ("id", "organizationId", "userId", "role", "createdAt", "updatedAt")
SELECT
    'mbr_' || substr(md5("User"."id" || ':' || "User"."organizationId"), 1, 24),
    "User"."organizationId",
    "User"."id",
    CASE
        WHEN lower("User"."role") IN ('owner') THEN 'OWNER'::"MembershipRole"
        WHEN lower("User"."role") IN ('admin', 'compliance_manager') THEN 'ADMIN'::"MembershipRole"
        WHEN lower("User"."role") IN ('analyst') THEN 'ANALYST'::"MembershipRole"
        WHEN lower("User"."role") IN ('viewer') THEN 'VIEWER'::"MembershipRole"
        ELSE 'REVIEWER'::"MembershipRole"
    END,
    "User"."createdAt",
    "User"."updatedAt"
FROM "User"
ON CONFLICT DO NOTHING;

-- AlterTable
ALTER TABLE "ExtractedSpec"
ADD COLUMN "organizationId" TEXT;

UPDATE "ExtractedSpec"
SET "organizationId" = "ClassificationRun"."organizationId"
FROM "ClassificationRun"
WHERE "ExtractedSpec"."classificationRunId" = "ClassificationRun"."id";

ALTER TABLE "ExtractedSpec"
ALTER COLUMN "organizationId" SET NOT NULL;

-- AlterTable
ALTER TABLE "ECCNCandidate"
ADD COLUMN "organizationId" TEXT;

UPDATE "ECCNCandidate"
SET "organizationId" = "ClassificationRun"."organizationId"
FROM "ClassificationRun"
WHERE "ECCNCandidate"."classificationRunId" = "ClassificationRun"."id";

ALTER TABLE "ECCNCandidate"
ALTER COLUMN "organizationId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Citation"
ADD COLUMN "organizationId" TEXT;

UPDATE "Citation"
SET "organizationId" = "ClassificationRun"."organizationId"
FROM "ClassificationRun"
WHERE "Citation"."classificationRunId" = "ClassificationRun"."id";

ALTER TABLE "Citation"
ALTER COLUMN "organizationId" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "PasswordCredential_userId_key" ON "PasswordCredential"("userId");
CREATE UNIQUE INDEX "OAuthIdentity_provider_providerAccountId_key" ON "OAuthIdentity"("provider", "providerAccountId");
CREATE INDEX "OAuthIdentity_userId_idx" ON "OAuthIdentity"("userId");
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");
CREATE INDEX "Session_userId_expiresAt_idx" ON "Session"("userId", "expiresAt");
CREATE INDEX "Session_organizationId_expiresAt_idx" ON "Session"("organizationId", "expiresAt");
CREATE UNIQUE INDEX "EmailVerificationToken_tokenHash_key" ON "EmailVerificationToken"("tokenHash");
CREATE INDEX "EmailVerificationToken_userId_expiresAt_idx" ON "EmailVerificationToken"("userId", "expiresAt");
CREATE UNIQUE INDEX "PasswordResetToken_tokenHash_key" ON "PasswordResetToken"("tokenHash");
CREATE INDEX "PasswordResetToken_userId_expiresAt_idx" ON "PasswordResetToken"("userId", "expiresAt");
CREATE UNIQUE INDEX "Membership_organizationId_userId_key" ON "Membership"("organizationId", "userId");
CREATE INDEX "Membership_userId_role_idx" ON "Membership"("userId", "role");
CREATE UNIQUE INDEX "WorkspaceInvite_tokenHash_key" ON "WorkspaceInvite"("tokenHash");
CREATE INDEX "WorkspaceInvite_organizationId_email_idx" ON "WorkspaceInvite"("organizationId", "email");
CREATE INDEX "WorkspaceInvite_organizationId_expiresAt_idx" ON "WorkspaceInvite"("organizationId", "expiresAt");
CREATE INDEX "ExtractedSpec_organizationId_createdAt_idx" ON "ExtractedSpec"("organizationId", "createdAt");
CREATE INDEX "ExtractedSpec_classificationRunId_idx" ON "ExtractedSpec"("classificationRunId");
CREATE INDEX "ECCNCandidate_organizationId_createdAt_idx" ON "ECCNCandidate"("organizationId", "createdAt");
CREATE INDEX "ECCNCandidate_classificationRunId_idx" ON "ECCNCandidate"("classificationRunId");
CREATE INDEX "Citation_organizationId_createdAt_idx" ON "Citation"("organizationId", "createdAt");
CREATE INDEX "Citation_classificationRunId_idx" ON "Citation"("classificationRunId");
CREATE INDEX "ReviewMemo_organizationId_createdAt_idx" ON "ReviewMemo"("organizationId", "createdAt");
CREATE INDEX "HumanReview_organizationId_createdAt_idx" ON "HumanReview"("organizationId", "createdAt");
CREATE INDEX "HumanReview_classificationRunId_createdAt_idx" ON "HumanReview"("classificationRunId", "createdAt");

-- AddForeignKey
ALTER TABLE "PasswordCredential" ADD CONSTRAINT "PasswordCredential_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OAuthIdentity" ADD CONSTRAINT "OAuthIdentity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Session" ADD CONSTRAINT "Session_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EmailVerificationToken" ADD CONSTRAINT "EmailVerificationToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkspaceInvite" ADD CONSTRAINT "WorkspaceInvite_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkspaceInvite" ADD CONSTRAINT "WorkspaceInvite_invitedByUserId_fkey" FOREIGN KEY ("invitedByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkspaceInvite" ADD CONSTRAINT "WorkspaceInvite_acceptedByUserId_fkey" FOREIGN KEY ("acceptedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ExtractedSpec" ADD CONSTRAINT "ExtractedSpec_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ECCNCandidate" ADD CONSTRAINT "ECCNCandidate_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Citation" ADD CONSTRAINT "Citation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_organizationId_fkey";

-- AlterTable
ALTER TABLE "User"
DROP COLUMN "organizationId",
DROP COLUMN "role";
