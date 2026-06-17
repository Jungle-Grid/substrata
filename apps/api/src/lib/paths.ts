import path from 'node:path';
import { fileURLToPath } from 'node:url';

const currentDir = path.dirname(fileURLToPath(import.meta.url));

export const repoRoot = path.resolve(currentDir, '../../../..');
export const workerRoot = path.join(repoRoot, 'workers/classifier');
export const workerEntryPoint = path.join(workerRoot, 'src/main.py');

export function getLocalStorageRoot() {
  return path.resolve(repoRoot, process.env.LOCAL_STORAGE_ROOT ?? './tmp/storage');
}
