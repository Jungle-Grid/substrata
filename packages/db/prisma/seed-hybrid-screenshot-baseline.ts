import { prisma } from '../src/index';

const organization = await prisma.organization.findUniqueOrThrow({
  where: { slug: 'substrata-demo' },
});
const reviewer = await prisma.user.findUniqueOrThrow({
  where: { email: 'reviewer@substrata.local' },
});

const document = await prisma.document.upsert({
  where: { id: 'doc_fixture_ax920_before' },
  update: { organizationId: organization.id },
  create: {
    id: 'doc_fixture_ax920_before',
    organizationId: organization.id,
    title: 'AX920 NextGen AI Accelerator Card — legacy engine',
    fileName: 'AX920-datasheet.txt',
    mimeType: 'text/plain',
    storagePath: 'fixtures/AX920-datasheet.txt',
    sourceType: 'seed',
    rawText:
      'AX920 AI accelerator card. PCIe Gen5 x16. 128 GB HBM3E. 310 TOPS INT8. 155 TFLOPS FP16. Firmware signing and optional remote attestation.',
  },
});

await prisma.classificationRun.upsert({
  where: { id: 'run_fixture_ax920_before' },
  update: {
    organizationId: organization.id,
    documentId: document.id,
    status: 'completed',
    validationStatus: 'needs_attention',
    confidence: 0.42,
    uncertaintyFlags: ['missing_key_specs', 'limited_regulatory_coverage'],
    completedAt: new Date(),
  },
  create: {
    id: 'run_fixture_ax920_before',
    organizationId: organization.id,
    documentId: document.id,
    status: 'completed',
    trigger: 'seed',
    validationStatus: 'needs_attention',
    confidence: 0.42,
    uncertaintyFlags: ['missing_key_specs', 'limited_regulatory_coverage'],
    requiresHumanReview: true,
    rulesVersion: 'legacy_generic_candidate_v1',
    completedAt: new Date(),
  },
});

await prisma.citation.deleteMany({ where: { classificationRunId: 'run_fixture_ax920_before' } });
await prisma.eCCNCandidate.deleteMany({ where: { classificationRunId: 'run_fixture_ax920_before' } });
await prisma.reviewPath.deleteMany({ where: { classificationRunId: 'run_fixture_ax920_before' } });
await prisma.extractedSpec.deleteMany({ where: { classificationRunId: 'run_fixture_ax920_before' } });
await prisma.reviewMemo.deleteMany({ where: { classificationRunId: 'run_fixture_ax920_before' } });
await prisma.humanReview.deleteMany({ where: { classificationRunId: 'run_fixture_ax920_before' } });

await prisma.extractedSpec.createMany({
  data: ([
    ['product_profile', 'generic_electronics', 'Detected Product Profile', 'profile_detection'],
    ['product_family', 'AI accelerator cards', 'Product Family', 'product_identity'],
    ['pcie_interface', 'PCIe Gen5 x16', 'PCIe Interface', 'digital_interface'],
    ['memory', '128 GB HBM3E', 'Memory', 'memory_cache_integrity'],
    ['compute_performance', '310 TOPS INT8 / 155 TFLOPS FP16', 'Compute Performance', 'compute_processor'],
    ['security_feature', 'Firmware signing / optional remote attestation', 'Security Feature', 'security_cryptography'],
  ] as const).map(([name, value, label, category]) => ({
    organizationId: organization.id,
    classificationRunId: 'run_fixture_ax920_before',
    sourceDocumentId: document.id,
    name,
    value,
    label,
    category,
    sourceSnippet: value,
    importance: 'Legacy extracted fact.',
    confidence: 0.72,
    confidenceLevel: 'medium',
  })),
});

await prisma.reviewPath.create({
  data: {
    organizationId: organization.id,
    classificationRunId: 'run_fixture_ax920_before',
    type: 'product_area',
    status: 'needs_more_evidence',
    title: 'Category 3 general electronics review path',
    scope: 'Broad Category 3 comparison without a narrower advanced-computing route.',
    whyTriggered: 'The legacy generic-electronics profile opened only a broad electronics path.',
    missingInformation: ['Specific ECCN candidate mapping and advanced-computing threshold review.'],
    reviewerQuestions: ['Which narrower review path should be evaluated for this accelerator?'],
  },
});

await prisma.reviewMemo.create({
  data: {
    organizationId: organization.id,
    classificationRunId: 'run_fixture_ax920_before',
    generatedBy: 'legacy_fixture',
    contentMarkdown:
      '# Legacy AX920 memo draft\n\nDetected product profile: generic_electronics. No specific ECCN candidates supported.',
  },
});

await prisma.humanReview.create({
  data: {
    organizationId: organization.id,
    classificationRunId: 'run_fixture_ax920_before',
    reviewerId: reviewer.id,
    status: 'pending_review',
  },
});

console.log('run_fixture_ax920_before');
await prisma.$disconnect();
