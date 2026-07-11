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

test('CSV company history is chunked by row to avoid unrelated ECCN leakage', () => {
  const csv = [
    'product,description,prior_eccn',
    'AX900,AI accelerator card with HBM and PCIe Gen5,3A090',
    'NX100,Secure network interface card with MACsec,5A002',
  ].join('\n');

  const chunks = chunkCompanyHistoryText(csv);
  assert.equal(chunks.length, 2);
  assert.match(chunks[0]?.content ?? '', /AX900/);
  assert.match(chunks[0]?.content ?? '', /3A090/);
  assert.doesNotMatch(chunks[0]?.content ?? '', /NX100|5A002/);
  assert.match(chunks[1]?.content ?? '', /NX100/);
  assert.match(chunks[1]?.content ?? '', /5A002/);
  assert.doesNotMatch(chunks[1]?.content ?? '', /AX900|3A090/);
});
