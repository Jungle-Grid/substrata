import bcrypt from 'bcrypt';
import { MembershipRole, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const DEV_PASSWORD = 'SubstrataDemoPass123!';

async function upsertUser(input: {
  email: string;
  name: string;
  password?: string;
}) {
  const user = await prisma.user.upsert({
    where: { email: input.email },
    update: {
      name: input.name,
      emailVerifiedAt: new Date(),
      onboardingCompletedAt: new Date(),
    },
    create: {
      email: input.email,
      name: input.name,
      emailVerifiedAt: new Date(),
      onboardingCompletedAt: new Date(),
    },
  });

  if (input.password) {
    await prisma.passwordCredential.upsert({
      where: { userId: user.id },
      update: {
        passwordHash: await bcrypt.hash(input.password, 12),
      },
      create: {
        userId: user.id,
        passwordHash: await bcrypt.hash(input.password, 12),
      },
    });
  }

  return user;
}

async function main() {
  const organization = await prisma.organization.upsert({
    where: { slug: 'substrata-demo' },
    update: {
      name: 'Substrata Demo Workspace',
      industry: 'Semiconductors',
    },
    create: {
      name: 'Substrata Demo Workspace',
      slug: 'substrata-demo',
      industry: 'Semiconductors',
    },
  });

  const owner = await upsertUser({
    email: 'owner@substrata.local',
    name: 'Demo Owner',
    password: DEV_PASSWORD,
  });

  const reviewer = await upsertUser({
    email: 'reviewer@substrata.local',
    name: 'Demo Reviewer',
    password: DEV_PASSWORD,
  });

  await prisma.membership.upsert({
    where: {
      organizationId_userId: {
        organizationId: organization.id,
        userId: owner.id,
      },
    },
    update: {
      role: MembershipRole.OWNER,
    },
    create: {
      organizationId: organization.id,
      userId: owner.id,
      role: MembershipRole.OWNER,
    },
  });

  await prisma.membership.upsert({
    where: {
      organizationId_userId: {
        organizationId: organization.id,
        userId: reviewer.id,
      },
    },
    update: {
      role: MembershipRole.REVIEWER,
    },
    create: {
      organizationId: organization.id,
      userId: reviewer.id,
      role: MembershipRole.REVIEWER,
    },
  });

  const document = await prisma.document.upsert({
    where: { id: 'doc_seed_orion_x7' },
    update: {
      organizationId: organization.id,
    },
    create: {
      id: 'doc_seed_orion_x7',
      organizationId: organization.id,
      title: 'Orion-X7 Edge Accelerator Datasheet',
      fileName: 'sample-datasheet.txt',
      mimeType: 'text/plain',
      sizeBytes: 96,
      storagePath: 'workers/classifier/samples/sample-datasheet.txt',
      rawText:
        '7 nm process node. Supports 112 Gbps PAM4 SerDes lanes. Radiation-tolerant packaging option.',
      sourceType: 'seed',
    },
  });

  const run = await prisma.classificationRun.upsert({
    where: { id: 'run_seed_orion_x7' },
    update: {
      organizationId: organization.id,
      documentId: document.id,
      status: 'completed',
      trigger: 'seed',
      confidence: 0.66,
      uncertaintyFlags: [
        'multiple_plausible_eccns',
        'requires_engineering_confirmation',
      ],
      requiresHumanReview: true,
      workerJobId: 'local-seed-run',
      workerVersion: 'python-local-v3',
      rulesVersion: 'ear-review-v3',
      extractedTextPath: 'artifacts/doc_seed_orion_x7/extracted-text.txt',
      structuredOutputPath: 'artifacts/doc_seed_orion_x7/output.json',
      memoArtifactPath: 'artifacts/doc_seed_orion_x7/memo.md',
      completedAt: new Date(),
    },
    create: {
      id: 'run_seed_orion_x7',
      organizationId: organization.id,
      documentId: document.id,
      status: 'completed',
      trigger: 'seed',
      confidence: 0.66,
      uncertaintyFlags: [
        'multiple_plausible_eccns',
        'requires_engineering_confirmation',
      ],
      requiresHumanReview: true,
      workerJobId: 'local-seed-run',
      workerVersion: 'python-local-v3',
      rulesVersion: 'ear-review-v3',
      extractedTextPath: 'artifacts/doc_seed_orion_x7/extracted-text.txt',
      structuredOutputPath: 'artifacts/doc_seed_orion_x7/output.json',
      memoArtifactPath: 'artifacts/doc_seed_orion_x7/memo.md',
      completedAt: new Date(),
    },
  });

  await prisma.extractedSpec.deleteMany({
    where: { classificationRunId: run.id },
  });
  await prisma.citation.deleteMany({
    where: { classificationRunId: run.id },
  });
  await prisma.eCCNCandidate.deleteMany({
    where: { classificationRunId: run.id },
  });
  await prisma.reviewMemo.deleteMany({
    where: { classificationRunId: run.id },
  });
  await prisma.humanReview.deleteMany({
    where: { classificationRunId: run.id },
  });

  const candidate = await prisma.eCCNCandidate.create({
    data: {
      organizationId: organization.id,
      classificationRunId: run.id,
      eccn: '3A001',
      title: 'Electronics review path for high-performance components',
      rationale:
        'The extracted semiconductor facts support a deeper Category 3 electronics review path.',
      confidence: 0.66,
      confidenceLevel: 'medium',
      matchedTechnicalFacts: [
        'process_node: 7 nm',
        'serdes_rate: 112 Gbps',
        'radiation_tolerance: present',
      ],
      whyItMayApply:
        'The extracted semiconductor facts support a deeper Category 3 electronics review path.',
      whyItMayNotApply:
        'The seeded evidence does not yet map cleanly to a specific threshold within the control text.',
      missingInformation: [
        'Precise control-text threshold mapping',
        'Supporting engineering clarification for deployment-specific claims',
      ],
      reviewerQuestions: [
        'Which exact Category 3 threshold is the closest fit for this semiconductor performance profile?',
      ],
      uncertaintyFlags: [
        'multiple_plausible_eccns',
        'requires_engineering_confirmation',
      ],
    },
  });

  await prisma.extractedSpec.createMany({
    data: [
      {
        organizationId: organization.id,
        classificationRunId: run.id,
        name: 'process_node',
        value: '7',
        unit: 'nm',
        sourceSnippet: '7 nm process node',
        importance:
          'Process technology can matter when a reviewer compares performance claims to semiconductor control thresholds.',
        confidence: 0.75,
        confidenceLevel: 'medium',
        category: 'converter_performance',
      },
      {
        organizationId: organization.id,
        classificationRunId: run.id,
        name: 'serdes_rate',
        value: '112',
        unit: 'Gbps',
        sourceSnippet: '112 Gbps PAM4 SerDes lanes',
        importance:
          'High-speed interconnect claims are often the most concrete export-relevant technical facts in a first-pass review.',
        confidence: 0.7,
        confidenceLevel: 'medium',
        category: 'digital_interface',
      },
    ],
  });

  await prisma.citation.createMany({
    data: [
      {
        organizationId: organization.id,
        classificationRunId: run.id,
        eccnCandidateId: candidate.id,
        sourceTitle: 'Uploaded datasheet',
        sourceUrl: null,
        sourceSection: 'Uploaded or bundled datasheet text',
        quotedText: '112 Gbps PAM4 SerDes lanes',
        relevanceNote:
          'Indicates performance characteristics that may be classification-relevant.',
      },
      {
        organizationId: organization.id,
        classificationRunId: run.id,
        eccnCandidateId: candidate.id,
        sourceTitle: 'CCL Category 3 electronics review',
        sourceUrl: 'https://www.ecfr.gov/',
        sourceSection: '15 CFR Supplement No. 1 to Part 774, Category 3',
        quotedText:
          'Category 3 contains electronics review paths for certain high-performance components and related interfaces.',
        relevanceNote:
          'Connects extracted semiconductor performance to the Category 3 review path.',
      },
    ],
  });

  await prisma.reviewMemo.create({
    data: {
      organizationId: organization.id,
      classificationRunId: run.id,
      generatedBy: 'seed',
      contentMarkdown:
        '# Draft ECCN Review Memo — Orion-X7 Edge Accelerator Datasheet\n\n## 1. Document Summary\n- Title: Orion-X7 Edge Accelerator Datasheet\n- Disclaimer: Draft for expert review only. This memo is not a final legal or compliance determination.',
    },
  });

  await prisma.humanReview.create({
    data: {
      organizationId: organization.id,
      classificationRunId: run.id,
      reviewerId: reviewer.id,
      status: 'pending_review',
    },
  });

  await prisma.auditEvent.createMany({
    data: [
      {
        organizationId: organization.id,
        actorUserId: owner.id,
        actor: 'seed',
        action: 'organization.seeded',
        entityType: 'Organization',
        entityId: organization.id,
        metadata: { name: organization.name },
      },
      {
        organizationId: organization.id,
        actorUserId: reviewer.id,
        actor: 'seed',
        action: 'document.seeded',
        entityType: 'Document',
        entityId: document.id,
        metadata: { title: document.title },
      },
      {
        organizationId: organization.id,
        actorUserId: reviewer.id,
        actor: 'seed',
        action: 'classification_run.completed',
        entityType: 'ClassificationRun',
        entityId: run.id,
        metadata: { status: 'completed' },
      },
      {
        organizationId: organization.id,
        actorUserId: reviewer.id,
        actor: 'seed',
        action: 'memo.generated',
        entityType: 'ReviewMemo',
        entityId: run.id,
        metadata: { generatedBy: 'seed' },
      },
    ],
  });

  console.log('Seeded Substrata demo workspace');
  console.log(`Owner login: owner@substrata.local / ${DEV_PASSWORD}`);
  console.log(`Reviewer login: reviewer@substrata.local / ${DEV_PASSWORD}`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
