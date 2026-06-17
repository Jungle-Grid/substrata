import fs from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { HttpError } from '../lib/errors';

const execFileAsync = promisify(execFile);

export async function extractTextFromStoredFile(input: {
  absolutePath: string;
  mimeType: string;
  originalFileName: string;
}) {
  const fileName = input.originalFileName.toLowerCase();
  const isPdf =
    input.mimeType === 'application/pdf' || fileName.endsWith('.pdf');
  const isText =
    input.mimeType.startsWith('text/') ||
    /\.(txt|md|csv|json)$/i.test(input.originalFileName);

  if (isPdf) {
    try {
      const { stdout } = await execFileAsync('pdftotext', [
        '-layout',
        input.absolutePath,
        '-',
      ], {
        maxBuffer: 32 * 1024 * 1024,
      });
      return stdout.trim();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown PDF extraction error.';
      const stderr =
        typeof error === 'object' &&
        error !== null &&
        'stderr' in error &&
        typeof (error as { stderr?: unknown }).stderr === 'string'
          ? (error as { stderr: string }).stderr.trim()
          : '';
      const code =
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        typeof (error as { code?: unknown }).code !== 'undefined'
          ? String((error as { code: unknown }).code)
          : 'unknown';

      console.error('PDF text extraction failed', {
        fileName: input.originalFileName,
        mimeType: input.mimeType,
        absolutePath: input.absolutePath,
        code,
        message,
        stderr,
      });

      throw new HttpError(422, 'Failed to extract text from the uploaded PDF.', {
        fileName: input.originalFileName,
        message,
        stderr: stderr || null,
        code,
      });
    }
  }

  if (isText) {
    try {
      const text = await fs.readFile(input.absolutePath, 'utf8');
      return text.trim();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown text extraction error.';
      console.error('Text file extraction failed', {
        fileName: input.originalFileName,
        mimeType: input.mimeType,
        absolutePath: input.absolutePath,
        message,
      });
      throw new HttpError(422, 'Failed to read the uploaded text file.', {
        fileName: input.originalFileName,
        message,
      });
    }
  }

  throw new HttpError(415, 'Unsupported file type. Upload a PDF or text file.', {
    fileName: input.originalFileName,
    mimeType: input.mimeType,
  });
}
