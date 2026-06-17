import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const organization = await prisma.organization.upsert({
    where: { slug: 'substrata-demo' },
    update: {},
    create: {
      name: 'Substrata Demo Org',
      slug: 'substrata-demo',
    },
  });

  const user = await prisma.user.upsert({
    where: { email: 'reviewer@substrata.local' },
    update: {
      organizationId: organization.id,
    },
    create: {
      organizationId: organization.id,
      email: 'reviewer@substrata.local',
      name: 'Demo Reviewer',
      role: 'compliance_manager',
    },
  });

  const document = await prisma.document.upsert({
    where: { id: 'doc_seed_orion_x7' },
    update: {},
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

  const existingRun = await prisma.classificationRun.findUnique({
    where: { id: 'run_seed_orion_x7' },
  });

  if (!existingRun) {
    const run = await prisma.classificationRun.create({
      data: {
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

    const candidate = await prisma.eCCNCandidate.create({
      data: {
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
        reviewerId: user.id,
        status: 'pending_review',
      },
    });

    await prisma.auditEvent.createMany({
      data: [
        {
          organizationId: organization.id,
          actorUserId: user.id,
          actor: 'seed',
          action: 'document.seeded',
          entityType: 'Document',
          entityId: document.id,
          metadata: { title: document.title },
        },
        {
          organizationId: organization.id,
          actorUserId: user.id,
          actor: 'seed',
          action: 'classification_run.completed',
          entityType: 'ClassificationRun',
          entityId: run.id,
          metadata: { status: 'completed' },
        },
        {
          organizationId: organization.id,
          actorUserId: user.id,
          actor: 'seed',
          action: 'memo.generated',
          entityType: 'ReviewMemo',
          entityId: run.id,
          metadata: { generatedBy: 'seed' },
        },
      ],
    });
  }
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
