import { Prisma, prisma } from '@substrata/db';
import { HttpError } from '../lib/errors';
import { recordAuditEvent } from './audit.service';

export const historyBatchInclude = {
  documents: {
    include: {
      document: {
        select: {
          id: true,
          title: true,
          fileName: true,
          displayFileName: true,
          mimeType: true,
          sizeBytes: true,
          sha256: true,
          createdAt: true,
        },
      },
      duplicateOfHistoryDocument: {
        include: {
          document: {
            select: {
              id: true,
              fileName: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  },
} as const;

export async function createCompanyHistoryBatch(input: {
  organizationId: string;
  createdByUserId: string;
  name: string;
}) {
  const batch = await prisma.companyHistoryBatch.create({
    data: {
      organizationId: input.organizationId,
      createdByUserId: input.createdByUserId,
      name: input.name,
      status: 'queued',
    },
  });

  await recordAuditEvent({
    organizationId: input.organizationId,
    actorUserId: input.createdByUserId,
    actor: 'user',
    action: 'company_history.batch_created',
    entityType: 'CompanyHistoryBatch',
    entityId: batch.id,
    metadata: { name: batch.name },
  });

  return batch;
}

export async function findCompanyHistoryDuplicate(input: {
  organizationId: string;
  sha256: string;
}) {
  return prisma.companyHistoryDocument.findFirst({
    where: {
      organizationId: input.organizationId,
      ingestionStatus: { not: 'duplicate' },
      document: { sha256: input.sha256 },
    },
    orderBy: { createdAt: 'asc' },
  });
}

export async function registerCompanyHistoryDocument(input: {
  organizationId: string;
  batchId: string;
  actorUserId: string;
  document: {
    title: string;
    fileName: string;
    mimeType: string;
    sizeBytes: number;
    storagePath: string;
    sha256: string;
  };
  recordType:
    | 'datasheet'
    | 'prior_memo'
    | 'catalog'
    | 'review_note'
    | 'spreadsheet'
    | 'approval_record'
    | 'technical_spec'
    | 'other';
  duplicateOfHistoryDocumentId?: string | null;
}) {
  const record = await prisma.$transaction(async (tx) => {
    const document = await tx.document.create({
      data: {
        organizationId: input.organizationId,
        title: input.document.title,
        fileName: input.document.fileName,
        displayFileName: input.document.fileName,
        mimeType: input.document.mimeType,
        sizeBytes: input.document.sizeBytes,
        storagePath: input.document.storagePath,
        sha256: input.document.sha256,
        extractionStatus: 'pending',
        origin: 'internal',
        visibility: 'private',
        sourceType: 'upload',
      },
    });

    const historyDocument = await tx.companyHistoryDocument.create({
      data: {
        organizationId: input.organizationId,
        batchId: input.batchId,
        documentId: document.id,
        recordType: input.recordType,
        ingestionStatus: input.duplicateOfHistoryDocumentId ? 'duplicate' : 'queued',
        duplicateOfHistoryDocumentId: input.duplicateOfHistoryDocumentId ?? null,
      },
      include: {
        document: true,
      },
    });

    await tx.companyHistoryBatch.update({
      where: { id: input.batchId },
      data: { fileCount: { increment: 1 } },
    });

    return historyDocument;
  });

  await recordAuditEvent({
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    actor: 'user',
    action: input.duplicateOfHistoryDocumentId
      ? 'company_history.document_deduplicated'
      : 'company_history.document_uploaded',
    entityType: 'CompanyHistoryDocument',
    entityId: record.id,
    metadata: {
      batchId: input.batchId,
      documentId: record.documentId,
      fileName: record.document.fileName,
      recordType: record.recordType,
      sha256: record.document.sha256,
    },
  });

  await refreshCompanyHistoryBatch(input.organizationId, input.batchId);
  return record;
}

export async function refreshCompanyHistoryBatch(organizationId: string, batchId: string) {
  const documents = await prisma.companyHistoryDocument.findMany({
    where: { organizationId, batchId },
    select: { ingestionStatus: true },
  });

  if (!documents.length) {
    return null;
  }

  const completedCount = documents.filter((item) =>
    ['indexed', 'duplicate'].includes(item.ingestionStatus),
  ).length;
  const failedCount = documents.filter((item) => item.ingestionStatus === 'failed').length;
  const pendingCount = documents.length - completedCount - failedCount;
  const status = pendingCount > 0
    ? documents.some((item) => item.ingestionStatus === 'processing')
      ? 'processing'
      : 'queued'
    : failedCount > 0
      ? completedCount > 0
        ? 'completed_with_errors'
        : 'failed'
      : 'completed';

  return prisma.companyHistoryBatch.update({
    where: { id: batchId },
    data: { status, completedCount, failedCount },
  });
}

export async function listCompanyHistoryBatches(organizationId: string) {
  return prisma.companyHistoryBatch.findMany({
    where: { organizationId },
    include: historyBatchInclude,
    orderBy: { createdAt: 'desc' },
  });
}

export async function getCompanyHistoryBatch(organizationId: string, batchId: string) {
  return prisma.companyHistoryBatch.findFirst({
    where: { id: batchId, organizationId },
    include: historyBatchInclude,
  });
}

export async function getCompanyHistoryDocument(organizationId: string, historyDocumentId: string) {
  return prisma.companyHistoryDocument.findFirst({
    where: { id: historyDocumentId, organizationId },
    include: {
      document: {
        select: {
          id: true,
          title: true,
          fileName: true,
          displayFileName: true,
          mimeType: true,
          sizeBytes: true,
          sha256: true,
          createdAt: true,
        },
      },
      batch: { select: { id: true, name: true, createdAt: true } },
      duplicateOfHistoryDocument: {
        include: { document: { select: { id: true, fileName: true } } },
      },
      chunks: {
        orderBy: [{ ingestionVersion: 'desc' }, { ordinal: 'asc' }],
        take: 20,
        select: {
          id: true,
          ordinal: true,
          content: true,
          charStart: true,
          charEnd: true,
          ingestionVersion: true,
        },
      },
      classificationHistoryMatches: {
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          rank: true,
          score: true,
          matchTier: true,
          matchReasons: true,
          createdAt: true,
          classificationRunId: true,
        },
      },
    },
  });
}

export async function reprocessCompanyHistoryDocument(input: {
  organizationId: string;
  historyDocumentId: string;
  actorUserId: string;
}) {
  const existing = await prisma.companyHistoryDocument.findFirst({
    where: { id: input.historyDocumentId, organizationId: input.organizationId },
  });

  if (!existing) {
    throw new HttpError(404, 'Company History document not found.');
  }
  if (!['failed', 'indexed'].includes(existing.ingestionStatus)) {
    throw new HttpError(409, 'Only failed or indexed Company History documents can be reprocessed.');
  }

  const updated = await prisma.companyHistoryDocument.update({
    where: { id: existing.id },
    data: {
      ingestionStatus: 'queued',
      ingestionVersion: { increment: 1 },
      errorCode: null,
      errorMessage: null,
      processedAt: null,
    },
  });

  await refreshCompanyHistoryBatch(input.organizationId, updated.batchId);
  await recordAuditEvent({
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    actor: 'user',
    action: 'company_history.document_reprocess_queued',
    entityType: 'CompanyHistoryDocument',
    entityId: updated.id,
    metadata: {
      batchId: updated.batchId,
      ingestionVersion: updated.ingestionVersion,
    },
  });

  return updated;
}

export function historyTotals(batch: Awaited<ReturnType<typeof getCompanyHistoryBatch>>) {
  if (!batch) return null;
  const documents = batch.documents;
  return {
    files: batch.fileCount,
    queued: documents.filter((item) => item.ingestionStatus === 'queued').length,
    processing: documents.filter((item) => item.ingestionStatus === 'processing').length,
    indexed: documents.filter((item) => item.ingestionStatus === 'indexed').length,
    failed: documents.filter((item) => item.ingestionStatus === 'failed').length,
    duplicates: documents.filter((item) => item.ingestionStatus === 'duplicate').length,
  };
}

export function historyMetadata(value: unknown) {
  return value && typeof value === 'object' ? value : null;
}

export type HistoryMatchReasons = Prisma.JsonArray;
