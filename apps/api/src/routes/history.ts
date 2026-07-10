import { Router, type Request } from 'express';
import multer from 'multer';
import { companyHistoryBatchUploadSchema } from '@substrata/shared';
import { canManageCompanyHistory } from '../lib/authz';
import { HttpError } from '../lib/errors';
import { requireCsrf } from '../middleware/auth';
import {
  createCompanyHistoryBatch,
  findCompanyHistoryDuplicate,
  getCompanyHistoryBatch,
  getCompanyHistoryDocument,
  historyMetadata,
  historyTotals,
  listCompanyHistoryBatches,
  registerCompanyHistoryDocument,
  reprocessCompanyHistoryDocument,
} from '../services/history.service';
import { enqueueCompanyHistoryIngestion } from '../services/history-ingestion.service';
import { persistUploadedDocument } from '../services/document-upload.service';
import {
  HISTORY_MAX_FILES,
  HISTORY_MAX_FILE_BYTES,
  validateCompanyHistoryBatchFiles,
} from '../services/history-upload-policy';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    files: HISTORY_MAX_FILES,
    fileSize: HISTORY_MAX_FILE_BYTES,
  },
});

function requireHistoryManager(req: Request) {
  const membership = req.authContext!.membership;
  if (!canManageCompanyHistory(membership.role)) {
    throw new HttpError(403, 'Only workspace owners and admins can manage Company History.');
  }
}

function titleFromFileName(fileName: string) {
  return fileName
    .replace(/\.[^/.]+$/, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim() || 'Company History document';
}

function presentHistoryDocument(document: NonNullable<Awaited<ReturnType<typeof getCompanyHistoryDocument>>>) {
  return {
    id: document.id,
    recordType: document.recordType,
    ingestionStatus: document.ingestionStatus,
    attemptCount: document.attemptCount,
    errorCode: document.errorCode,
    errorMessage: document.errorMessage,
    metadata: historyMetadata(document.metadata),
    ingestionVersion: document.ingestionVersion,
    processedAt: document.processedAt,
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
    document: document.document,
    batch: document.batch,
    duplicateOf: document.duplicateOfHistoryDocument
      ? {
          id: document.duplicateOfHistoryDocument.id,
          fileName: document.duplicateOfHistoryDocument.document.fileName,
        }
      : null,
    chunks: document.chunks
      .filter((chunk) => chunk.ingestionVersion === document.ingestionVersion)
      .map((chunk) => ({
        id: chunk.id,
        ordinal: chunk.ordinal,
        content: chunk.content,
        charStart: chunk.charStart,
        charEnd: chunk.charEnd,
        ingestionVersion: chunk.ingestionVersion,
      })),
    matchUsage: document.classificationHistoryMatches,
  };
}

function presentHistoryBatch(batch: NonNullable<Awaited<ReturnType<typeof getCompanyHistoryBatch>>>) {
  return {
    id: batch.id,
    name: batch.name,
    status: batch.status,
    fileCount: batch.fileCount,
    completedCount: batch.completedCount,
    failedCount: batch.failedCount,
    createdAt: batch.createdAt,
    updatedAt: batch.updatedAt,
    totals: historyTotals(batch),
    documents: batch.documents.map((document) => ({
      id: document.id,
      documentId: document.documentId,
      fileName: document.document.fileName,
      title: document.document.title,
      mimeType: document.document.mimeType,
      sizeBytes: document.document.sizeBytes,
      recordType: document.recordType,
      status: document.ingestionStatus,
      attemptCount: document.attemptCount,
      errorCode: document.errorCode,
      errorMessage: document.errorMessage,
      processedAt: document.processedAt,
      duplicateOf: document.duplicateOfHistoryDocument
        ? {
            id: document.duplicateOfHistoryDocument.id,
            fileName: document.duplicateOfHistoryDocument.document.fileName,
          }
        : null,
      createdAt: document.createdAt,
    })),
  };
}

export const historyRouter = Router();

historyRouter.post('/batches', requireCsrf, upload.array('files', HISTORY_MAX_FILES), async (req, res) => {
  requireHistoryManager(req);
  const { organization, user } = req.authContext!;
  const input = companyHistoryBatchUploadSchema.parse({
    name: req.body.name,
    recordType: req.body.recordType,
  });
  const files = (req.files ?? []) as Express.Multer.File[];

  console.info('Company History upload request received', {
    authenticatedUserId: user.id,
    organizationId: organization.id,
    workspaceId: organization.id,
    membershipRole: req.authContext!.membership.role,
    requestedBatchName: input.name || null,
    requestedMaterialType: input.recordType,
    receivedFileCount: files.length,
  });
  validateCompanyHistoryBatchFiles(files);
  console.info('Company History upload files accepted', {
    authenticatedUserId: user.id,
    organizationId: organization.id,
    workspaceId: organization.id,
    files: files.map((file) => ({
      fileName: file.originalname,
      mimeType: file.mimetype,
      sizeBytes: file.size,
    })),
  });

  const batch = await createCompanyHistoryBatch({
    organizationId: organization.id,
    createdByUserId: user.id,
    name: input.name || `Company History upload ${new Date().toISOString().slice(0, 10)}`,
  });
  console.info('Company History batch created', {
    batchId: batch.id,
    referenceLibraryId: batch.id,
    organizationId: batch.organizationId,
    workspaceId: batch.organizationId,
    batchName: batch.name,
  });

  for (const file of files) {
    const persisted = await persistUploadedDocument({
      file,
      organizationId: organization.id,
      storageScope: 'history',
      batchId: batch.id,
    });
    console.info('Company History storage write completed', {
      batchId: batch.id,
      referenceLibraryId: batch.id,
      organizationId: organization.id,
      workspaceId: organization.id,
      fileName: persisted.fileName,
      mimeType: persisted.mimeType,
      sizeBytes: persisted.sizeBytes,
      storagePath: persisted.storagePath,
      sha256: persisted.sha256,
    });
    const duplicate = await findCompanyHistoryDuplicate({
      organizationId: organization.id,
      sha256: persisted.sha256,
    });
    const historyDocument = await registerCompanyHistoryDocument({
      organizationId: organization.id,
      batchId: batch.id,
      actorUserId: user.id,
      recordType: input.recordType,
      duplicateOfHistoryDocumentId: duplicate?.id ?? null,
      document: {
        title: titleFromFileName(persisted.fileName),
        fileName: persisted.fileName,
        mimeType: persisted.mimeType,
        sizeBytes: persisted.sizeBytes,
        storagePath: persisted.storagePath,
        sha256: persisted.sha256,
      },
    });
    console.info('Company History database record created', {
      batchId: batch.id,
      referenceLibraryId: batch.id,
      referenceFileId: historyDocument.id,
      documentId: historyDocument.documentId,
      organizationId: historyDocument.organizationId,
      workspaceId: historyDocument.organizationId,
      batchName: batch.name,
      materialType: historyDocument.recordType,
      fileName: persisted.fileName,
      mimeType: persisted.mimeType,
      sizeBytes: persisted.sizeBytes,
      ingestionStatus: historyDocument.ingestionStatus,
      duplicateOfReferenceFileId: historyDocument.duplicateOfHistoryDocumentId,
      createdAt: historyDocument.createdAt,
    });
    if (historyDocument.ingestionStatus === 'queued') {
      enqueueCompanyHistoryIngestion(historyDocument.id);
    }
  }

  const hydrated = await getCompanyHistoryBatch(organization.id, batch.id);
  if (!hydrated) {
    throw new HttpError(500, 'Company History batch could not be loaded.');
  }
  const presented = presentHistoryBatch(hydrated);
  console.info('Company History upload accepted for ingestion', {
    batchId: batch.id,
    referenceLibraryId: batch.id,
    organizationId: organization.id,
    workspaceId: organization.id,
    totals: presented.totals,
  });
  return res.status(202).json({
    id: presented.id,
    status: presented.status,
    totals: presented.totals,
    documents: presented.documents.map((document) => ({
      id: document.id,
      fileName: document.fileName,
      status: document.status,
    })),
  });
});

historyRouter.get('/batches', async (req, res) => {
  const batches = await listCompanyHistoryBatches(req.authContext!.organization.id);
  res.json({ batches: batches.map(presentHistoryBatch) });
});

historyRouter.get('/batches/:id', async (req, res) => {
  const batch = await getCompanyHistoryBatch(req.authContext!.organization.id, req.params.id);
  if (!batch) return res.status(404).json({ error: 'Company History batch not found' });
  return res.json(presentHistoryBatch(batch));
});

historyRouter.get('/documents/:id', async (req, res) => {
  const document = await getCompanyHistoryDocument(req.authContext!.organization.id, req.params.id);
  if (!document) return res.status(404).json({ error: 'Company History document not found' });
  return res.json(presentHistoryDocument(document));
});

historyRouter.post('/documents/:id/reprocess', requireCsrf, async (req, res) => {
  requireHistoryManager(req);
  const { organization, user } = req.authContext!;
  const document = await reprocessCompanyHistoryDocument({
    organizationId: organization.id,
    historyDocumentId: String(req.params.id),
    actorUserId: user.id,
  });
  enqueueCompanyHistoryIngestion(document.id);
  return res.status(202).json({
    id: document.id,
    status: document.ingestionStatus,
    ingestionVersion: document.ingestionVersion,
  });
});
