import { createHash } from 'node:crypto';
import { prisma } from '@substrata/db';
import { createStorageDriver } from './storage';
import { extractTextFromStoredFile } from './text-extraction.service';
import { refreshCompanyHistoryBatch } from './history.service';
import { recordAuditEvent } from './audit.service';

const storage = createStorageDriver();
const activeIngestionIds = new Set<string>();
const MAX_EXTRACTED_TEXT_CHARS = 1_000_000;
const CHUNK_SIZE = 1_200;
const CHUNK_OVERLAP = 180;
const METADATA_VERSION = 'company-history-markers-v1';

function excerpt(text: string, start: number, end: number) {
  const left = Math.max(0, start - 120);
  const right = Math.min(text.length, end + 180);
  return text.slice(left, right).replace(/\s+/g, ' ').trim();
}

function debugPreview(text: string, length = 500) {
  return text.replace(/\s+/g, ' ').trim().slice(0, length);
}

function uniqueMarkerEntries(entries: Array<{ value: string; sourceSnippet: string }>) {
  const seen = new Set<string>();
  return entries.filter((entry) => {
    const key = entry.value.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 20);
}

export function extractCompanyHistoryMetadata(text: string) {
  const productIdentifiers: Array<{ value: string; sourceSnippet: string }> = [];
  const skuModelStrings: Array<{ value: string; sourceSnippet: string }> = [];
  const eccnMentions: Array<{ value: string; sourceSnippet: string }> = [];

  const identifierPattern = /\b(?:part\s*(?:number|no\.?|#)|model|sku|ordering\s*code|device)\s*[:#-]?\s*([A-Z0-9][A-Z0-9_.-]{2,48})/gi;
  for (const match of text.matchAll(identifierPattern)) {
    const value = match[1]?.trim();
    if (!value || match.index === undefined) continue;
    const marker = { value, sourceSnippet: excerpt(text, match.index, match.index + match[0].length) };
    productIdentifiers.push(marker);
    skuModelStrings.push(marker);
  }

  const eccnPattern = /\b[0-9][A-E][0-9]{3}(?:\.[A-Za-z0-9]+|[A-Za-z0-9]*)\b/g;
  for (const match of text.matchAll(eccnPattern)) {
    if (match.index === undefined) continue;
    eccnMentions.push({
      value: match[0],
      sourceSnippet: excerpt(text, match.index, match.index + match[0].length),
    });
  }

  return {
    extractionVersion: METADATA_VERSION,
    productIdentifiers: uniqueMarkerEntries(productIdentifiers),
    skuModelStrings: uniqueMarkerEntries(skuModelStrings),
    eccnMentions: uniqueMarkerEntries(eccnMentions),
  };
}

export function chunkCompanyHistoryText(text: string) {
  const normalized = text.replace(/\r\n/g, '\n').trim();
  const chunks: Array<{ ordinal: number; content: string; charStart: number; charEnd: number; contentHash: string }> = [];

  for (let charStart = 0, ordinal = 0; charStart < normalized.length; ordinal += 1) {
    let charEnd = Math.min(normalized.length, charStart + CHUNK_SIZE);
    if (charEnd < normalized.length) {
      const boundary = normalized.lastIndexOf('\n', charEnd);
      if (boundary > charStart + Math.floor(CHUNK_SIZE * 0.55)) {
        charEnd = boundary;
      }
    }
    const content = normalized.slice(charStart, charEnd).trim();
    if (content) {
      chunks.push({
        ordinal,
        content,
        charStart,
        charEnd,
        contentHash: createHash('sha256').update(content).digest('hex'),
      });
    }
    if (charEnd >= normalized.length) break;
    charStart = Math.max(charEnd - CHUNK_OVERLAP, charStart + 1);
  }

  return chunks;
}

function safeIngestionError(error: unknown) {
  const diagnostic = [
    error instanceof Error ? error.message : '',
    error && typeof error === 'object' && 'details' in error &&
      (error as { details?: unknown }).details &&
      typeof (error as { details?: unknown }).details === 'object'
      ? ['message', 'stderr', 'code']
        .map((key) => (error as { details: Record<string, unknown> }).details[key])
        .filter((value): value is string => typeof value === 'string' && Boolean(value.trim()))
        .join(' | ')
      : '',
  ]
    .filter(Boolean)
    .join(' | ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 800) || 'Company History ingestion error details unavailable.';
  if (error && typeof error === 'object' && 'statusCode' in error) {
    const statusCode = Number((error as { statusCode?: unknown }).statusCode);
    if (statusCode === 415) {
      return {
        code: 'UNSUPPORTED_FILE',
        message: `Parser rejected this file type. ${diagnostic}`.slice(0, 900),
      };
    }
    if (statusCode === 422) {
      return {
        code: 'TEXT_EXTRACTION_FAILED',
        message: `Parser error: ${diagnostic}`.slice(0, 900),
      };
    }
  }
  return {
    code: 'INGESTION_FAILED',
    message: `Company History ingestion did not complete. ${diagnostic}`.slice(0, 900),
  };
}

export async function ingestCompanyHistoryDocument(historyDocumentId: string) {
  if (activeIngestionIds.has(historyDocumentId)) return;
  activeIngestionIds.add(historyDocumentId);

  try {
    const historyDocument = await prisma.companyHistoryDocument.findFirst({
      where: { id: historyDocumentId, ingestionStatus: 'queued' },
      include: { document: true },
    });
    if (!historyDocument) return;

    console.info('Company History ingestion request accepted', {
      referenceFileId: historyDocument.id,
      documentId: historyDocument.documentId,
      batchId: historyDocument.batchId,
      organizationId: historyDocument.organizationId,
      workspaceId: historyDocument.organizationId,
      fileName: historyDocument.document.fileName,
      mimeType: historyDocument.document.mimeType,
      parserStatus: 'queued',
      indexMethod: 'postgres_full_text',
      embeddingStatus: 'not_configured',
    });

    const started = await prisma.companyHistoryDocument.update({
      where: { id: historyDocument.id },
      data: {
        ingestionStatus: 'processing',
        attemptCount: { increment: 1 },
        errorCode: null,
        errorMessage: null,
      },
      include: { document: true },
    });
    await refreshCompanyHistoryBatch(started.organizationId, started.batchId);
    console.info('Company History parsing started', {
      referenceFileId: started.id,
      documentId: started.documentId,
      batchId: started.batchId,
      organizationId: started.organizationId,
      workspaceId: started.organizationId,
      fileName: started.document.fileName,
      mimeType: started.document.mimeType,
      parserStatus: 'processing',
      attemptCount: started.attemptCount,
    });

    const extractedText = await extractTextFromStoredFile({
      absolutePath: storage.resolve(started.document.storagePath),
      mimeType: started.document.mimeType,
      originalFileName: started.document.fileName,
    });
    if (!extractedText.trim()) {
      throw new Error('No usable text was extracted.');
    }
    if (extractedText.length > MAX_EXTRACTED_TEXT_CHARS) {
      throw new Error('Extracted text exceeds the permitted Company History limit.');
    }
    console.info('Company History text extraction completed', {
      referenceFileId: started.id,
      fileName: started.document.fileName,
      organizationId: started.organizationId,
      workspaceId: started.organizationId,
      parserStatus: 'succeeded',
      extractedTextLength: extractedText.length,
      extractedTextPreview: debugPreview(extractedText),
      parserError: null,
    });

    const metadata = extractCompanyHistoryMetadata(extractedText);
    const chunks = chunkCompanyHistoryText(extractedText);
    if (!chunks.length) {
      throw new Error('No searchable text chunks were produced.');
    }
    console.info('Company History chunks prepared for indexing', {
      referenceFileId: started.id,
      fileName: started.document.fileName,
      organizationId: started.organizationId,
      workspaceId: started.organizationId,
      chunkCount: chunks.length,
      chunkTextPreview: debugPreview(chunks[0]?.content ?? ''),
      indexMethod: 'postgres_full_text',
      embeddingStatus: 'not_configured',
      embeddingVectorDimensions: null,
    });

    await prisma.$transaction(async (tx) => {
      await tx.document.update({
        where: { id: started.documentId },
        data: {
          rawText: extractedText,
          extractionStatus: 'completed',
          extractionError: null,
        },
      });
      await tx.companyHistoryChunk.createMany({
        data: chunks.map((chunk) => ({
          organizationId: started.organizationId,
          companyHistoryDocumentId: started.id,
          ingestionVersion: started.ingestionVersion,
          ...chunk,
        })),
      });
      await tx.companyHistoryDocument.update({
        where: { id: started.id },
        data: {
          ingestionStatus: 'indexed',
          metadata,
          processedAt: new Date(),
          errorCode: null,
          errorMessage: null,
        },
      });
    });

    await refreshCompanyHistoryBatch(started.organizationId, started.batchId);
    console.info('Company History indexing completed', {
      referenceFileId: started.id,
      documentId: started.documentId,
      batchId: started.batchId,
      organizationId: started.organizationId,
      workspaceId: started.organizationId,
      fileName: started.document.fileName,
      indexStatus: 'indexed',
      chunkCount: chunks.length,
      indexMethod: 'postgres_full_text',
      embeddingStatus: 'not_configured',
      embeddingVectorDimensions: null,
    });
    await recordAuditEvent({
      organizationId: started.organizationId,
      actor: 'system',
      action: 'company_history.document_indexed',
      entityType: 'CompanyHistoryDocument',
      entityId: started.id,
      metadata: {
        batchId: started.batchId,
        documentId: started.documentId,
        ingestionVersion: started.ingestionVersion,
        chunkCount: chunks.length,
        extractedTextLength: extractedText.length,
        parserStatus: 'succeeded',
        indexMethod: 'postgres_full_text',
        embeddingStatus: 'not_configured',
      },
    });
  } catch (error) {
    const details = safeIngestionError(error);
    const existing = await prisma.companyHistoryDocument.findUnique({
      where: { id: historyDocumentId },
      include: { document: true },
    });
    if (existing) {
      console.error('Company History ingestion failed', {
        referenceFileId: existing.id,
        documentId: existing.documentId,
        batchId: existing.batchId,
        organizationId: existing.organizationId,
        workspaceId: existing.organizationId,
        fileName: existing.document.fileName,
        mimeType: existing.document.mimeType,
        parserStatus: 'failed',
        parserError: details.message,
        errorCode: details.code,
      });
      await prisma.$transaction([
        prisma.companyHistoryDocument.update({
          where: { id: existing.id },
          data: {
            ingestionStatus: 'failed',
            errorCode: details.code,
            errorMessage: details.message,
          },
        }),
        prisma.document.update({
          where: { id: existing.documentId },
          data: { extractionStatus: 'failed', extractionError: details.message },
        }),
      ]);
      await refreshCompanyHistoryBatch(existing.organizationId, existing.batchId);
      await recordAuditEvent({
        organizationId: existing.organizationId,
        actor: 'system',
        action: 'company_history.document_failed',
        entityType: 'CompanyHistoryDocument',
        entityId: existing.id,
        metadata: {
          batchId: existing.batchId,
          errorCode: details.code,
          parserStatus: 'failed',
          parserError: details.message,
          indexMethod: 'postgres_full_text',
          embeddingStatus: 'not_configured',
        },
      });
    }
  } finally {
    activeIngestionIds.delete(historyDocumentId);
  }
}

export function enqueueCompanyHistoryIngestion(historyDocumentId: string) {
  queueMicrotask(() => {
    void ingestCompanyHistoryDocument(historyDocumentId);
  });
}

export async function resumeQueuedCompanyHistoryIngestion() {
  await prisma.companyHistoryDocument.updateMany({
    where: { ingestionStatus: 'processing' },
    data: { ingestionStatus: 'queued' },
  });
  const queued = await prisma.companyHistoryDocument.findMany({
    where: { ingestionStatus: 'queued' },
    select: { id: true },
    take: 100,
  });
  for (const document of queued) {
    enqueueCompanyHistoryIngestion(document.id);
  }
}
