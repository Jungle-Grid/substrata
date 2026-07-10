import assert from 'node:assert/strict';
import test from 'node:test';
import { LocalStorageDriver } from './storage';
import { validateCompanyHistoryBatchFiles, HISTORY_MAX_FILES, HISTORY_MAX_FILE_BYTES } from './history-upload-policy';

function textFile(name = 'history.txt', text = 'Prior product model ABC-123') {
  const buffer = Buffer.from(text, 'utf8');
  return {
    originalname: name,
    mimetype: name.endsWith('.json') ? 'application/json' : 'text/plain',
    size: buffer.length,
    buffer,
  };
}

test('Company History upload policy accepts approved text files and rejects unsupported or oversized files', () => {
  assert.doesNotThrow(() => validateCompanyHistoryBatchFiles([textFile()]));
  assert.throws(
    () => validateCompanyHistoryBatchFiles([textFile('history.docx')]),
    /Unsupported file type/,
  );
  assert.throws(
    () => validateCompanyHistoryBatchFiles([{ ...textFile(), size: HISTORY_MAX_FILE_BYTES + 1 }]),
    /8 MiB/,
  );
});

test('Company History upload policy enforces the batch file limit', () => {
  const files = Array.from({ length: HISTORY_MAX_FILES + 1 }, (_, index) => textFile(`history-${index}.txt`));
  assert.throws(() => validateCompanyHistoryBatchFiles(files), /at most/);
});

test('private storage path resolution rejects traversal and absolute paths', () => {
  const storage = new LocalStorageDriver('/tmp/substrata-private-storage');
  assert.equal(
    storage.resolve('organizations/org_1/history/batch_1/file.txt'),
    '/tmp/substrata-private-storage/organizations/org_1/history/batch_1/file.txt',
  );
  assert.throws(() => storage.resolve('../../etc/passwd'), /within private storage/);
  assert.throws(() => storage.resolve('/etc/passwd'), /relative private storage key/);
});
