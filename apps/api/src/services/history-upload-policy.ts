import { HttpError } from '../lib/errors';
import { validateSupportedUpload } from './document-upload.service';

export const HISTORY_MAX_FILES = 20;
export const HISTORY_MAX_FILE_BYTES = 8 * 1024 * 1024;
export const HISTORY_MAX_BATCH_BYTES = 50 * 1024 * 1024;

export type HistoryUploadCandidate = {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
};

export function validateCompanyHistoryBatchFiles(files: HistoryUploadCandidate[]) {
  if (!files.length) {
    throw new HttpError(400, 'Upload at least one Company History file.');
  }
  if (files.length > HISTORY_MAX_FILES) {
    throw new HttpError(400, `A Company History batch may contain at most ${HISTORY_MAX_FILES} files.`);
  }

  const totalBytes = files.reduce((total, file) => total + file.size, 0);
  if (totalBytes > HISTORY_MAX_BATCH_BYTES) {
    throw new HttpError(413, 'Company History batch exceeds the 50 MiB total upload limit.');
  }

  for (const file of files) {
    if (file.size > HISTORY_MAX_FILE_BYTES) {
      throw new HttpError(413, 'A Company History file exceeds the 8 MiB per-file upload limit.');
    }
    validateSupportedUpload({
      fileName: file.originalname,
      mimeType: file.mimetype || 'application/octet-stream',
      buffer: file.buffer,
    });
  }
}
