import path from 'node:path';
import { repoRoot } from '../lib/paths';

export interface StorageDriver {
  resolve(storagePath: string): string;
}

export class LocalStorageDriver implements StorageDriver {
  constructor(private readonly root: string) {}

  resolve(storagePath: string) {
    return path.resolve(this.root, storagePath);
  }
}

export function createStorageDriver() {
  return new LocalStorageDriver(
    path.resolve(repoRoot, process.env.LOCAL_STORAGE_ROOT ?? './tmp/storage'),
  );
}
