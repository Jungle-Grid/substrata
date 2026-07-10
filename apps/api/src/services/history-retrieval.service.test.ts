import assert from 'node:assert/strict';
import test from 'node:test';
import { prisma } from '@substrata/db';
import { chunkCompanyHistoryText } from './history-ingestion.service';
import {
  appendCompanyHistoryComparison,
  retrieveCompanyHistory,
  retrieveCompanyHistoryWithTrace,
} from './history-retrieval.service';

test('Company History memo section keeps comparison material separate from review candidates', () => {
  const memo = appendCompanyHistoryComparison('# Draft ECCN Review Memo\n\n## 2. Extracted Technical Facts\n- Secure boot', [
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
    },
  ]);

  assert.match(memo, /## Company History Comparison/);
  assert.match(memo, /prior-review\.pdf/);
  assert.match(memo, /Internal company history only\. Not regulatory authority/);
  assert.doesNotMatch(memo, /automatic classification approval/i);
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

    const memo = appendCompanyHistoryComparison('# Draft ECCN Review Memo', retrieval.matches);
    assert.match(memo, /Company History Comparison/);
    assert.match(memo, /memo_AX900_ai_accelerator\.md/);
    assert.match(memo, /Related product family: AI accelerator cards/);
    assert.match(memo, /Internal company history only\. Not regulatory authority/);
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
