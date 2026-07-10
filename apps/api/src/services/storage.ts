import path from 'node:path';
import { repoRoot } from '../lib/paths';
import { HttpError } from '../lib/errors';

export interface StorageDriver {
  resolve(storagePath: string): string;
}

export class LocalStorageDriver implements StorageDriver {
  constructor(private readonly root: string) {}

  resolve(storagePath: string) {
    if (!storagePath || path.isAbsolute(storagePath)) {
      throw new HttpError(400, 'Storage path must be a relative private storage key.');
    }

    const resolved = path.resolve(this.root, storagePath);
    const rootWithSeparator = this.root.endsWith(path.sep)
      ? this.root
      : `${this.root}${path.sep}`;

    if (!resolved.startsWith(rootWithSeparator)) {
      throw new HttpError(400, 'Storage path must remain within private storage.');
    }

    return resolved;
  }
}

export function createStorageDriver() {
  return new LocalStorageDriver(
    path.resolve(repoRoot, process.env.LOCAL_STORAGE_ROOT ?? './tmp/storage'),
  );
}
