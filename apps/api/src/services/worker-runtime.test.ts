import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';
import { normalizeLocalWorkerArtifactKey } from './worker-runtime';

test('local worker artifacts are stored as run-scoped private keys', () => {
  const storageRoot = '/tmp/substrata-private-storage';
  const runDir = path.join(
    storageRoot,
    'organizations',
    'org_1',
    'classification-runs',
    'run_1',
  );
  const memoPath = path.join(runDir, 'artifacts', 'document-memo.md');

  assert.equal(
    normalizeLocalWorkerArtifactKey({ storageRoot, runDir, artifactPath: memoPath }),
    'organizations/org_1/classification-runs/run_1/artifacts/document-memo.md',
  );
});

test('local worker artifacts cannot escape their private run directory', () => {
  const storageRoot = '/tmp/substrata-private-storage';
  const runDir = path.join(
    storageRoot,
    'organizations',
    'org_1',
    'classification-runs',
    'run_1',
  );

  assert.throws(
    () =>
      normalizeLocalWorkerArtifactKey({
        storageRoot,
        runDir,
        artifactPath: path.join(storageRoot, 'organizations', 'org_1', 'classification-runs', 'run_2', 'artifacts', 'memo.md'),
      }),
    /private run directory/,
  );
  assert.throws(
    () =>
      normalizeLocalWorkerArtifactKey({
        storageRoot,
        runDir,
        artifactPath: '/tmp/outside-private-storage/memo.md',
      }),
    /private run directory/,
  );
  assert.throws(
    () =>
      normalizeLocalWorkerArtifactKey({
        storageRoot,
        runDir,
        artifactPath: 'artifacts/memo.md',
      }),
    /absolute/,
  );
});
