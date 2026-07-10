import assert from 'node:assert/strict';
import test from 'node:test';
import { chunkCompanyHistoryText, extractCompanyHistoryMetadata } from './history-ingestion.service';

test('history ingestion produces offset chunks and source-backed markers', () => {
  const text = [
    'Part Number: ABC-12345',
    'Model: Orion-X7',
    'Prior review noted 3A001 for reviewer comparison.',
    'The product includes secure boot and a 112 Gbps serial interface.',
  ].join('\n');

  const metadata = extractCompanyHistoryMetadata(text);
  assert.equal(metadata.productIdentifiers[0]?.value, 'ABC-12345');
  assert.equal(metadata.skuModelStrings[1]?.value, 'Orion-X7');
  assert.equal(metadata.eccnMentions[0]?.value, '3A001');
  assert.match(metadata.eccnMentions[0]?.sourceSnippet ?? '', /3A001/);

  const chunks = chunkCompanyHistoryText(text.repeat(30));
  assert.ok(chunks.length > 1);
  assert.equal(chunks[0]?.charStart, 0);
  assert.ok((chunks[1]?.charStart ?? 0) < (chunks[0]?.charEnd ?? 0));
  assert.equal(chunks.every((chunk) => chunk.contentHash.length === 64), true);
});
