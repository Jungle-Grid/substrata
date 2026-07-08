import { prisma } from '@substrata/db';
import { createClassificationRun } from '../apps/api/src/services/classification.service';

type ExecutionPreference = 'fireworks' | 'jungle_grid' | 'auto';

const executionPreference = process.argv[2] as ExecutionPreference | undefined;
const origin = process.argv[3] ?? 'public';
const visibility = process.argv[4] ?? 'public_demo';

if (!executionPreference || !['fireworks', 'jungle_grid', 'auto'].includes(executionPreference)) {
  throw new Error('Usage: tsx scripts/live-smoke-backends.ts fireworks|jungle_grid|auto [origin] [visibility]');
}

const sourceText = [
  'Orion X7 public semiconductor datasheet.',
  'Device: 64-bit multicore application processor for industrial control.',
  'Interfaces: PCIe Gen4, Gigabit Ethernet, USB 3.0, CAN-FD, SPI, I2C, UART.',
  'Security features include AES-256 acceleration, SHA-2 hashing, secure boot, random number generator, key storage, and lifecycle controls.',
  'Operating temperature -40 C to 105 C.',
  'This public brief is synthetic smoke-test data.',
].join(' ');

async function main() {
  const organization = await prisma.organization.upsert({
    where: { slug: 'smoke-test-org' },
    update: {},
    create: {
      name: 'Smoke Test Org',
      slug: 'smoke-test-org',
      industry: 'Semiconductors',
    },
  });

  const user = await prisma.user.upsert({
    where: { email: 'smoke-test@substrata.local' },
    update: {},
    create: {
      email: 'smoke-test@substrata.local',
      name: 'Smoke Test User',
      emailVerifiedAt: new Date(),
      onboardingCompletedAt: new Date(),
    },
  });

  await prisma.membership.upsert({
    where: {
      organizationId_userId: {
        organizationId: organization.id,
        userId: user.id,
      },
    },
    update: { role: 'OWNER' },
    create: {
      organizationId: organization.id,
      userId: user.id,
      role: 'OWNER',
    },
  });

  const document = await prisma.document.create({
    data: {
      organizationId: organization.id,
      title: `${executionPreference} smoke datasheet`,
      fileName: `${executionPreference}-smoke.txt`,
      displayFileName: `${executionPreference}-smoke.txt`,
      mimeType: 'text/plain',
      sizeBytes: sourceText.length,
      storagePath: `smoke/${executionPreference}-smoke.txt`,
      sourceType: 'manual',
      documentType: 'Datasheet',
      manufacturer: 'Smoke Semi',
      extractionStatus: 'completed',
      origin: origin as 'public' | 'customer_provided' | 'internal',
      visibility: visibility as 'private' | 'organization' | 'public_demo',
      rawText: sourceText,
    },
  });

  const run = await createClassificationRun({
    documentId: document.id,
    organizationId: organization.id,
    actorUserId: user.id,
    trigger: 'manual',
    executionPreference,
  });

  console.log(
    JSON.stringify(
      {
        runId: run.id,
        documentId: document.id,
        status: run.status,
        backendUsed: run.backendUsed,
        backendReason: run.backendReason,
        underlyingProvider: run.underlyingProvider,
        costUsd: run.costUsd,
        latencyMs: run.latencyMs,
        tokensUsed: run.tokensUsed,
        completedAt: run.completedAt,
        validationIssueCount: Array.isArray(run.validationIssues)
          ? run.validationIssues.length
          : null,
      },
      null,
      2,
    ),
  );
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
