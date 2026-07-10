import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { getLocalStorageRoot, repoRoot } from '../lib/paths';
import { HttpError } from '../lib/errors';

function sanitizeFileName(fileName: string) {
  const sanitized = fileName
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[.-]+/, '')
    .slice(0, 180);
  return sanitized || 'upload.bin';
}

const supportedExtensions = new Set(['.pdf', '.txt', '.md', '.csv', '.json']);
const supportedMimeTypes = new Set([
  'application/pdf',
  'text/plain',
  'text/markdown',
  'text/csv',
  'application/json',
]);

function hasUnexpectedBinaryContent(buffer: Buffer) {
  const sample = buffer.subarray(0, Math.min(buffer.length, 8 * 1024));
  return sample.includes(0);
}

export function validateSupportedUpload(input: {
  fileName: string;
  mimeType: string;
  buffer: Buffer;
}) {
  if (!input.buffer.length) {
    throw new HttpError(400, 'Uploaded file is empty.');
  }

  const extension = path.extname(input.fileName).toLowerCase();
  const mimeType = input.mimeType.toLowerCase();
  if (!supportedExtensions.has(extension) || !supportedMimeTypes.has(mimeType)) {
    throw new HttpError(415, 'Unsupported file type. Upload a PDF, TXT, MD, CSV, or JSON file.');
  }

  if (extension === '.pdf') {
    if (mimeType !== 'application/pdf' || !input.buffer.subarray(0, 5).equals(Buffer.from('%PDF-'))) {
      throw new HttpError(415, 'PDF uploads must have a valid PDF signature.');
    }
  } else {
    if (!mimeType.startsWith('text/') && mimeType !== 'application/json') {
      throw new HttpError(415, 'Text-like uploads must use an approved text MIME type.');
    }
    if (hasUnexpectedBinaryContent(input.buffer)) {
      throw new HttpError(415, 'Text-like uploads cannot contain binary content.');
    }
  }

  return { extension, mimeType };
}

export async function persistUploadedDocument(input: {
  file: Express.Multer.File;
  organizationId: string;
  storageScope?: 'documents' | 'history';
  batchId?: string;
}) {
  if (!input.organizationId) {
    throw new HttpError(400, 'Organization storage scope is required.');
  }

  validateSupportedUpload({
    fileName: input.file.originalname,
    mimeType: input.file.mimetype || 'application/octet-stream',
    buffer: input.file.buffer,
  });

  const safeFileName = sanitizeFileName(input.file.originalname || 'upload.bin');
  const storageScope = input.storageScope ?? 'documents';
  const scopePath =
    storageScope === 'history'
      ? path.join('history', input.batchId ?? 'unassigned')
      : 'documents';
  const storagePath = path.join('organizations', input.organizationId, scopePath, `${randomUUID()}-${safeFileName}`);
  const absolutePath = path.join(getLocalStorageRoot(), storagePath);

  await fs.mkdir(path.dirname(absolutePath), { recursive: true });
  await fs.writeFile(absolutePath, input.file.buffer);

  return {
    storagePath,
    absolutePath,
    fileName: input.file.originalname,
    mimeType: input.file.mimetype || 'application/octet-stream',
    sizeBytes: input.file.size,
    sha256: createHash('sha256').update(input.file.buffer).digest('hex'),
  };
}

export async function loadBundledSampleDatasheet() {
  const relativePath = path.join(
    'workers',
    'classifier',
    'samples',
    'public-semiconductor-demo-datasheet.txt',
  );
  const absolutePath = path.join(repoRoot, relativePath);
  const rawText = await fs.readFile(absolutePath, 'utf8');

  return {
    title: 'Asteria A112 Edge Accelerator Public Demo Datasheet',
    fileName: 'public-semiconductor-demo-datasheet.txt',
    mimeType: 'text/plain',
    sizeBytes: Buffer.byteLength(rawText, 'utf8'),
    storagePath: relativePath,
    documentType: 'Public technical datasheet',
    manufacturer: 'Asteria Microsystems',
    sourceUrl: 'https://example.com/public-demo/asteria-a112-datasheet',
    versionLabel: 'Rev. 2.3',
    extractionStatus: 'completed' as const,
    origin: 'public' as const,
    visibility: 'organization' as const,
    rawText,
    sourceType: 'seed' as const,
  };
}
