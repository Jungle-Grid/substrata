import assert from 'node:assert/strict';
import test from 'node:test';
import { prisma } from '@substrata/db';
import { chunkCompanyHistoryText } from './history-ingestion.service';
import {
  appendCompanyHistoryComparison,
  retrieveCompanyHistory,
  retrieveCompanyHistoryWithTrace,
  validateHistoryProjection,
} from './history-retrieval.service';

test('Company History memo section keeps comparison material separate from review candidates', () => {
  const memo = appendCompanyHistoryComparison('# Draft ECCN Review Memo\n\n## 2. Extracted Technical Facts\n- Secure boot', {
    productPrecedents: [
    {
      companyHistoryDocumentId: 'history_doc_1',
      companyHistoryChunkId: 'chunk_1',
      sourceFileName: 'prior-review.pdf',
      sourceTitle: 'Prior internal review',
      importedAt: new Date('2026-07-10T12:00:00.000Z'),
      excerpt: 'Part Number: ABC-123. Secure boot is present.',
      rank: 1,
      score: 4.2,
      matchTier: 'partial',
      matchReasons: ['Shared technical evidence: secure boot'],
      retrievalMethod: 'postgres_lexical_v1',
      retrievalVersion: 'company_history_retrieval_v1',
      supportingMatches: ['Shared technical evidence: secure boot'],
      materialDifferences: [],
      blockingContradictions: [],
      similarityComponents: { lexical: 1, positiveBoost: 3, contradictionPenalty: 0 },
      recommendedUse: 'precedent',
      recordRole: 'product_precedent',
      agreements: ['Shared technical evidence: secure boot'],
      configurationDifferences: [],
    },
    ],
    technicalComparisons: [],
    counselGuidance: [],
    internalPolicy: [],
  });

  assert.match(memo, /## Company History Comparison/);
  assert.match(memo, /prior-review\.pdf/);
  assert.match(memo, /Internal precedent only — not regulatory authority/);
  assert.doesNotMatch(memo, /automatic classification approval/i);
});

test('runtime role precedence keeps product memos out of counsel and policy sections', async () => {
  const originalQueryRaw = prisma.$queryRaw;
  const originalCount = prisma.companyHistoryChunk.count;
  prisma.companyHistoryChunk.count = (async () => 4) as typeof prisma.companyHistoryChunk.count;
  prisma.$queryRaw = (async () => [
    {
      chunkId: 'memo_chunk', chunkOrdinal: 0, historyDocumentId: 'memo_document',
      content: 'Product: NX100 Secure Network Interface Card\nOutside counsel was consulted. Human review required. Not legal advice.',
      baseScore: 1, fileName: 'prior-product-review.md', title: 'Internal Classification Memo',
      importedAt: new Date(), metadata: null, recordType: 'prior_memo',
    },
    {
      chunkId: 'counsel_chunk', chunkOrdinal: 0, historyDocumentId: 'counsel_document',
      content: 'Counsel findings concerning customer-accessible encryption.',
      baseScore: 1, fileName: 'q3-review.pdf', title: 'Counsel Review Summary',
      importedAt: new Date(), metadata: null, recordType: 'other',
    },
    {
      chunkId: 'policy_chunk', chunkOrdinal: 0, historyDocumentId: 'policy_document',
      content: 'All reviewers must obtain approval before finalization.',
      baseScore: 1, fileName: 'review-rules.txt', title: 'Internal Export Policy',
      importedAt: new Date(), metadata: null, recordType: 'other',
    },
  ]) as typeof prisma.$queryRaw;
  try {
    const retrieval = await retrieveCompanyHistoryWithTrace({
      organizationId: 'org_roles', documentTitle: 'NX100 product brief', sourceText: 'NX100 Secure Network Interface Card',
      extractedSpecs: [{ name: 'product_name', value: 'NX100' }],
    });
    assert.equal(retrieval.pools.productPrecedents[0]?.recordRole, 'classification_memo');
    assert.equal(retrieval.pools.counselGuidance[0]?.recordRole, 'counsel_guidance');
    assert.equal(retrieval.pools.internalPolicy[0]?.recordRole, 'internal_policy');
    const memo = appendCompanyHistoryComparison('# Memo', {
      productPrecedents: retrieval.pools.productPrecedents,
      technicalComparisons: retrieval.pools.technicalComparisons,
      counselGuidance: retrieval.pools.counselGuidance,
      internalPolicy: retrieval.pools.internalPolicy,
    });
    const precedents = memo.split('### Product precedents')[1]?.split('### Relevant counsel guidance')[0] ?? '';
    const counsel = memo.split('### Relevant counsel guidance')[1]?.split('### Relevant internal policy')[0] ?? '';
    const policy = memo.split('### Relevant internal policy')[1] ?? '';
    assert.match(precedents, /prior-product-review\.md/);
    assert.doesNotMatch(precedents, /q3-review\.pdf|review-rules\.txt/);
    assert.match(counsel, /q3-review\.pdf/);
    assert.doesNotMatch(counsel, /prior-product-review\.md|review-rules\.txt/);
    assert.match(policy, /review-rules\.txt/);
    assert.doesNotMatch(policy, /prior-product-review\.md|q3-review\.pdf/);
  } finally {
    prisma.$queryRaw = originalQueryRaw;
    prisma.companyHistoryChunk.count = originalCount;
  }
});

test('spreadsheet retrieval retains the selected row locator and never renders the container', async () => {
  const originalQueryRaw = prisma.$queryRaw;
  const originalCount = prisma.companyHistoryChunk.count;
  const selectedRow = 'Record ID: AS-2025-002\nProduct: NX100 Secure Network Interface Card\nPorts: 2x 200GbE\nECCN: 5A991';
  prisma.companyHistoryChunk.count = (async () => 2) as typeof prisma.companyHistoryChunk.count;
  prisma.$queryRaw = (async () => [{
    chunkId: 'csv_nx100', chunkOrdinal: 1, historyDocumentId: 'prior_csv', content: selectedRow,
    baseScore: 1, fileName: 'prior-classifications.csv', title: 'Prior classifications', importedAt: new Date(),
    metadata: null, recordType: 'spreadsheet',
  }]) as typeof prisma.$queryRaw;
  try {
    const retrieval = await retrieveCompanyHistoryWithTrace({
      organizationId: 'org_csv', documentTitle: 'NX120 networking brief', sourceText: 'NX100 Secure Network Interface Card with 200GbE',
      extractedSpecs: [{ name: 'product_name', value: 'NX100' }],
    });
    const match = retrieval.pools.productPrecedents[0]!;
    assert.equal(match.recordLocator, 'CSV row 3');
    assert.deepEqual(match.recordLocatorMetadata, { kind: 'csv_row', rowNumber: 3, recordId: 'AS-2025-002', chunkOrdinal: 1 });
    assert.equal(match.excerpt, selectedRow);
    const memo = appendCompanyHistoryComparison('# Memo', {
      productPrecedents: retrieval.pools.productPrecedents,
      technicalComparisons: [], counselGuidance: [], internalPolicy: [],
    });
    assert.match(memo, /Locator: CSV row 3/);
    assert.match(memo, /AS-2025-002/);
    assert.doesNotMatch(memo, /AX900|AS-2025-001/);
  } finally {
    prisma.$queryRaw = originalQueryRaw;
    prisma.companyHistoryChunk.count = originalCount;
  }
});

test('history projection validation rejects role-routing and multi-record CSV leakage', () => {
  const issues = validateHistoryProjection({
    productPrecedents: [{
      companyHistoryDocumentId: 'document', companyHistoryChunkId: 'chunk', sourceFileName: 'history.csv', sourceTitle: 'History',
      recordLocator: 'CSV row 3', recordLocatorMetadata: { kind: 'csv_row', rowNumber: 3, recordId: 'R-2', chunkOrdinal: 1 },
      importedAt: new Date(), excerpt: 'Record ID: R-1\nRecord ID: R-2', rank: 1, score: 1, matchTier: 'direct',
      matchReasons: [], retrievalMethod: 'test', retrievalVersion: 'test', supportingMatches: [], materialDifferences: [],
      blockingContradictions: [], similarityComponents: {}, recommendedUse: 'precedent', recordRole: 'counsel_guidance', agreements: [], configurationDifferences: [],
    }],
    technicalComparisons: [], counselGuidance: [], internalPolicy: [],
  });
  assert.ok(issues.some((issue) => issue.code === 'HISTORY_ROLE_SECTION_MISMATCH'));
  assert.ok(issues.some((issue) => issue.code === 'STRUCTURED_HISTORY_RECORD_LEAKAGE'));
});

test('history retrieval passes the active organization into its lexical query', async () => {
  const originalQueryRaw = prisma.$queryRaw;
  const originalCount = prisma.companyHistoryChunk.count;
  let values: unknown[] = [];
  prisma.$queryRaw = (async (query: { values?: unknown[] }) => {
    values = query.values ?? [];
    return [];
  }) as typeof prisma.$queryRaw;
  prisma.companyHistoryChunk.count = (async () => 0) as typeof prisma.companyHistoryChunk.count;

  try {
    const matches = await retrieveCompanyHistory({
      organizationId: 'org_history_only',
      documentTitle: 'ABC-123 technical datasheet',
      sourceText: 'Secure boot and high speed interface.',
      extractedSpecs: [{ name: 'part_number', value: 'ABC-123' }],
    });
    assert.deepEqual(matches, []);
    assert.ok(values.includes('org_history_only'));
  } finally {
    prisma.$queryRaw = originalQueryRaw;
    prisma.companyHistoryChunk.count = originalCount;
  }
});

test('validated internal record references are retrieval hints, not product facts', async () => {
  const originalQueryRaw = prisma.$queryRaw;
  const originalCount = prisma.companyHistoryChunk.count;
  let values: unknown[] = [];
  prisma.$queryRaw = (async (query: { values?: unknown[] }) => {
    values = query.values ?? [];
    return [];
  }) as typeof prisma.$queryRaw;
  prisma.companyHistoryChunk.count = (async () => 0) as typeof prisma.companyHistoryChunk.count;
  try {
    await retrieveCompanyHistoryWithTrace({
      organizationId: 'org_history_hint',
      documentTitle: 'Technical source',
      sourceText: 'ZX100 accelerator with 128 GB HBM memory.',
      extractedSpecs: [{ name: 'product_name', value: 'ZX100 accelerator' }],
      historyRecordHints: ['CASE-2026-019'],
    });
    const query = values.find((value): value is string => typeof value === 'string' && value.includes(' OR '));
    assert.match(query ?? '', /CASE-2026-019/);
  } finally {
    prisma.$queryRaw = originalQueryRaw;
    prisma.companyHistoryChunk.count = originalCount;
  }
});

test('explicit comparison-product references are organization-scoped retrieval hints', async () => {
  const originalQueryRaw = prisma.$queryRaw;
  const originalCount = prisma.companyHistoryChunk.count;
  let values: unknown[] = [];
  prisma.$queryRaw = (async (query: { values?: unknown[] }) => {
    values = query.values ?? [];
    return [];
  }) as typeof prisma.$queryRaw;
  prisma.companyHistoryChunk.count = (async () => 0) as typeof prisma.companyHistoryChunk.count;
  try {
    await retrieveCompanyHistoryWithTrace({
      organizationId: 'org_comparison_hint_only',
      documentTitle: 'Current network adapter technical brief',
      sourceText: 'Current adapter has secure boot and 200GbE ports.',
      extractedSpecs: [{ name: 'product_name', value: 'Current network adapter' }],
      historyRecordHints: ['Prior network adapter memo'],
    });
    assert.ok(values.includes('org_comparison_hint_only'));
    const query = values.find((value): value is string => typeof value === 'string' && value.includes(' OR '));
    assert.match(query ?? '', /Prior/);
    assert.match(query ?? '', /network/);
  } finally {
    prisma.$queryRaw = originalQueryRaw;
    prisma.companyHistoryChunk.count = originalCount;
  }
});

test('AX900 history parses into an indexed chunk and is carried into the AX920 memo comparison', async () => {
  const ax900History = `# Internal Classification Memo - AX900 AI Accelerator Module

## Product family
AI accelerator cards

## Key technical facts captured by reviewer
- PCIe Gen5 x16 accelerator card
- 96 GB HBM3 memory
- 240 INT8 TOPS claimed peak performance
- 120 FP16 TFLOPS claimed peak performance
- Firmware signing exists for device integrity.

## Prior classification used in internal records
3A090, subject to final human review and export-control approval.

Use this record as internal precedent only. Do not automatically classify a new product as 3A090.`;
  const indexedChunk = chunkCompanyHistoryText(ax900History)[0];
  assert.ok(indexedChunk, 'AX900 should produce at least one searchable indexed chunk');

  const originalQueryRaw = prisma.$queryRaw;
  const originalCount = prisma.companyHistoryChunk.count;
  const queryValues: unknown[][] = [];
  prisma.companyHistoryChunk.count = (async () => 1) as typeof prisma.companyHistoryChunk.count;
  prisma.$queryRaw = (async (query: { values?: unknown[] }) => {
    queryValues.push(query.values ?? []);
    return [{
      chunkId: 'chunk_ax900',
      historyDocumentId: 'history_ax900',
      content: indexedChunk.content,
      baseScore: 0.42,
      fileName: 'memo_AX900_ai_accelerator.md',
      title: 'Internal Classification Memo AX900 AI Accelerator',
      importedAt: new Date('2026-07-10T12:00:00.000Z'),
      metadata: { eccnMentions: [{ value: '3A090' }] },
      recordType: 'prior_memo',
    }];
  }) as typeof prisma.$queryRaw;

  try {
    const retrieval = await retrieveCompanyHistoryWithTrace({
      organizationId: 'org_accelerator_demo',
      documentTitle: 'NEW_UPLOAD_datasheet_AX920_nextgen_ai_accelerator.pdf',
      sourceText: `AX920 NextGen AI Accelerator is an AI accelerator card with PCIe Gen5 x16, 128 GB HBM3E,
310 TOPS INT8, 155 TFLOPS FP16, firmware signing, and optional remote attestation.`,
      extractedSpecs: [
        { name: 'product_name', value: 'AX920 NextGen AI Accelerator' },
        { name: 'product_family', value: 'AI accelerator cards' },
        { name: 'interface', value: 'PCIe Gen5 x16' },
        { name: 'memory', value: '128 GB HBM3E' },
        { name: 'peak_int8_performance', value: '310 TOPS INT8' },
        { name: 'peak_fp16_performance', value: '155 TFLOPS FP16' },
        { name: 'security_notes', value: 'Firmware signing; optional remote attestation under review' },
      ],
      detectedProductProfile: 'ai_accelerator_card',
      reviewPathContext: ['Category 3 electronics', 'advanced computing'],
      candidateEccns: ['3A991'],
      reviewerQuestions: ['Confirm whether remote attestation exposes a customer-facing security feature.'],
    });

    assert.equal(retrieval.matches.length, 1);
    assert.equal(retrieval.matches[0]?.sourceFileName, 'memo_AX900_ai_accelerator.md');
    assert.match(retrieval.matches[0]?.matchReasons.join(' ') ?? '', /AI accelerator cards/);
    assert.match(retrieval.matches[0]?.matchReasons.join(' ') ?? '', /PCIe Gen5 x16/);
    assert.match(retrieval.matches[0]?.matchReasons.join(' ') ?? '', /HBM memory/);
    assert.match(retrieval.matches[0]?.matchReasons.join(' ') ?? '', /high INT8\/FP16 performance evidence/);
    assert.match(retrieval.matches[0]?.matchReasons.join(' ') ?? '', /firmware-signing or attestation note/);
    assert.equal(retrieval.trace.primaryCandidateCount, 1);
    assert.equal(retrieval.trace.keywordCandidateCount, 0);
    assert.equal(retrieval.trace.indexMethod, 'postgres_full_text');
    assert.equal(retrieval.trace.embeddingVectorDimensions, null);

    const primaryFtsQuery = queryValues.flat().find(
      (value): value is string => typeof value === 'string' && value.includes(' OR '),
    );
    assert.ok(primaryFtsQuery, 'primary retrieval must use OR semantics rather than requiring every query term');
    assert.match(primaryFtsQuery, /accelerator/i);
    assert.match(primaryFtsQuery, /HBM3E/i);
    assert.match(primaryFtsQuery, /PCIe/i);

    const memo = appendCompanyHistoryComparison('# Draft ECCN Review Memo', {
      productPrecedents: retrieval.pools.productPrecedents,
      technicalComparisons: retrieval.pools.technicalComparisons,
      counselGuidance: retrieval.pools.counselGuidance,
      internalPolicy: retrieval.pools.internalPolicy,
    });
    assert.match(memo, /Company History Comparison/);
    assert.match(memo, /memo_AX900_ai_accelerator\.md/);
    assert.match(memo, /Related product family: AI accelerator cards/);
    assert.match(memo, /Internal precedent only — not regulatory authority/);
    assert.doesNotMatch(memo, /No comparable prior company history found/);
  } finally {
    prisma.$queryRaw = originalQueryRaw;
    prisma.companyHistoryChunk.count = originalCount;
  }
});

test('history retrieval performs a keyword fallback when no full-text candidate is found', async () => {
  const originalQueryRaw = prisma.$queryRaw;
  const originalCount = prisma.companyHistoryChunk.count;
  let queryCount = 0;
  prisma.companyHistoryChunk.count = (async () => 1) as typeof prisma.companyHistoryChunk.count;
  prisma.$queryRaw = (async () => {
    queryCount += 1;
    if (queryCount === 1) return [];
    return [{
      chunkId: 'chunk_ax900_fallback',
      historyDocumentId: 'history_ax900_fallback',
      content: 'AX900 is a PCIe accelerator card with HBM memory and 240 TOPS. Prior internal review: 3A090.',
      baseScore: 0,
      fileName: 'datasheet_AX900_ai_accelerator.pdf',
      title: 'AX900 AI Accelerator',
      importedAt: new Date('2026-07-10T12:00:00.000Z'),
      metadata: null,
      recordType: 'datasheet',
    }];
  }) as typeof prisma.$queryRaw;

  try {
    const retrieval = await retrieveCompanyHistoryWithTrace({
      organizationId: 'org_accelerator_demo',
      documentTitle: 'AX920 NextGen AI Accelerator',
      sourceText: 'AI accelerator card with PCIe Gen5 x16, HBM3E, 310 TOPS, and 155 TFLOPS.',
      extractedSpecs: [
        { name: 'product_family', value: 'AI accelerator cards' },
        { name: 'interface', value: 'PCIe Gen5 x16' },
        { name: 'memory', value: '128 GB HBM3E' },
      ],
    });

    assert.equal(retrieval.matches[0]?.sourceFileName, 'datasheet_AX900_ai_accelerator.pdf');
    assert.equal(retrieval.trace.retrievalMethod, 'postgres_keyword_fallback_v1');
    assert.equal(retrieval.trace.primaryCandidateCount, 0);
    assert.equal(retrieval.trace.keywordCandidateCount, 1);
    assert.equal(queryCount, 2);
  } finally {
    prisma.$queryRaw = originalQueryRaw;
    prisma.companyHistoryChunk.count = originalCount;
  }
});

test('README and administrative records are excluded from product precedents', async () => {
  const originalQueryRaw = prisma.$queryRaw;
  const originalCount = prisma.companyHistoryChunk.count;
  prisma.companyHistoryChunk.count = (async () => 2) as typeof prisma.companyHistoryChunk.count;
  prisma.$queryRaw = (async () => [{
    chunkId: 'chunk_readme', historyDocumentId: 'history_readme',
    content: 'README upload instructions mention gateways, Ethernet, TLS, and accelerators.',
    baseScore: 4, fileName: 'README_DEMO_USE.txt', title: 'README',
    importedAt: new Date(), metadata: null, recordType: 'other',
  }, {
    chunkId: 'chunk_product', historyDocumentId: 'history_product',
    content: 'Industrial gateway with Ethernet and MQTT over TLS.',
    baseScore: 1, fileName: 'gateway-engineering-note.txt', title: 'Gateway engineering note',
    importedAt: new Date(), metadata: null, recordType: 'technical_spec',
  }]) as typeof prisma.$queryRaw;
  try {
    const retrieval = await retrieveCompanyHistoryWithTrace({
      organizationId: 'org_roles', documentTitle: 'ignored title',
      sourceText: 'Industrial gateway with Ethernet and MQTT over TLS.',
      extractedSpecs: [{ name: 'interface', value: 'Ethernet' }],
    });
    assert.equal(retrieval.matches.length, 1);
    assert.equal(retrieval.matches[0]?.recordRole, 'product_precedent');
    assert.equal(retrieval.matches[0]?.sourceFileName, 'gateway-engineering-note.txt');
    assert.equal(retrieval.pools.productPrecedents.length, 1);
    assert.equal(retrieval.pools.productPrecedents[0]?.sourceFileName, 'gateway-engineering-note.txt');
    assert.equal(retrieval.pools.excludedAdministrative[0]?.recordRole, 'dataset_readme');
  } finally {
    prisma.$queryRaw = originalQueryRaw;
    prisma.companyHistoryChunk.count = originalCount;
  }
});

test('history explanations cannot turn an absent accelerator into an agreement', async () => {
  const originalQueryRaw = prisma.$queryRaw;
  const originalCount = prisma.companyHistoryChunk.count;
  prisma.companyHistoryChunk.count = (async () => 1) as typeof prisma.companyHistoryChunk.count;
  prisma.$queryRaw = (async () => [{
    chunkId: 'chunk_accelerator', historyDocumentId: 'history_accelerator',
    content: 'AI accelerator card with HBM and 96 TOPS.', baseScore: 1,
    fileName: 'accelerator-datasheet.txt', title: 'Accelerator datasheet',
    importedAt: new Date(), metadata: null, recordType: 'datasheet',
  }]) as typeof prisma.$queryRaw;
  try {
    const retrieval = await retrieveCompanyHistoryWithTrace({
      organizationId: 'org_negative', documentTitle: 'irrelevant',
      sourceText: 'Industrial gateway. No AI accelerator is included.',
      extractedSpecs: [{ name: 'product_form', value: 'industrial gateway' }],
    });
    const match = retrieval.matches[0];
    assert.equal(match?.recommendedUse, 'contrast');
    assert.ok(match?.blockingContradictions.length);
    assert.doesNotMatch(match?.agreements.join(' ') ?? '', /shared.*AI accelerator product family/i);
  } finally {
    prisma.$queryRaw = originalQueryRaw;
    prisma.companyHistoryChunk.count = originalCount;
  }
});
