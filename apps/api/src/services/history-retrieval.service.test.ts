import assert from 'node:assert/strict';
import test from 'node:test';
import { prisma } from '@substrata/db';
import { appendCompanyHistoryComparison, retrieveCompanyHistory } from './history-retrieval.service';

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
  let values: unknown[] = [];
  prisma.$queryRaw = (async (query: { values?: unknown[] }) => {
    values = query.values ?? [];
    return [];
  }) as typeof prisma.$queryRaw;

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
  }
});
