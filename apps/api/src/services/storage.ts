import path from 'node:path';
import { repoRoot } from '../lib/paths';
import { HttpError } from '../lib/errors';

export interface StorageDriver {
  resolve(storagePath: string): string;
}

export function relativePrivateStorageKey(root: string, absolutePath: string) {
  if (!absolutePath || !path.isAbsolute(absolutePath)) {
    throw new HttpError(400, 'Storage path must be an absolute path within private storage.');
  }

  const resolvedRoot = path.resolve(root);
  const resolvedPath = path.resolve(absolutePath);
  const relativePath = path.relative(resolvedRoot, resolvedPath);

  if (
    !relativePath ||
    relativePath === '..' ||
    relativePath.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relativePath)
  ) {
    throw new HttpError(400, 'Storage path must remain within private storage.');
  }

  return relativePath.split(path.sep).join('/');
}

export class LocalStorageDriver implements StorageDriver {
  constructor(private readonly root: string) {}

  resolve(storagePath: string) {
    if (!storagePath || path.isAbsolute(storagePath)) {
      throw new HttpError(400, 'Storage path must be a relative private storage key.');
    }

    const resolvedRoot = path.resolve(this.root);
    const resolved = path.resolve(resolvedRoot, storagePath);
    const rootWithSeparator = resolvedRoot.endsWith(path.sep)
      ? resolvedRoot
      : `${resolvedRoot}${path.sep}`;

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
