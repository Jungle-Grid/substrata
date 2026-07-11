import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import {
  classificationRunCreateSchema,
  documentCreateSchema,
} from '@substrata/shared';
import { parseBody } from '../lib/http';
import { HttpError } from '../lib/errors';
import { canCreateClassification } from '../lib/authz';
import { requireCsrf } from '../middleware/auth';
import { canManageWorkspace } from '../lib/authz';
import { createStorageDriver } from '../services/storage';
import { archiveDocument, permanentlyDeleteDocument, restoreDocument } from '../services/lifecycle.service';
import {
  createDocument,
  getDocument,
  listDocuments,
} from '../services/document.service';
import { recordAuditEvent } from '../services/audit.service';
import { createWorkerClient } from '../services/worker-client';
import { selectExecutionProvider } from '../services/execution-router.service';
import {
  loadBundledSampleDatasheet,
  persistUploadedDocument,
} from '../services/document-upload.service';
import { extractTextFromStoredFile } from '../services/text-extraction.service';
import { presentDocument, presentRun } from '../services/presenters';

export const documentsRouter = Router();
const workerClient = createWorkerClient();
const storage = createStorageDriver();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 12 * 1024 * 1024,
  },
});

const uploadSchema = z.object({
  title: z.string().trim().max(255).optional().default(''),
  rawText: z.string().optional().default(''),
});

function deriveTitleFromFileName(fileName: string) {
  return fileName
    .replace(/\.[^/.]+$/, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

documentsRouter.post('/', requireCsrf, async (req, res) => {
  const input = parseBody(documentCreateSchema, req);
  const { organization, user, membership } = req.authContext!;

  if (!canCreateClassification(membership.role)) {
    throw new HttpError(403, 'You do not have access to create documents.');
  }

  if (!input.rawText?.trim()) {
    throw new HttpError(400, 'Manual documents require source text.');
  }

  const document = await createDocument(organization.id, {
    ...input,
    storagePath: `organizations/${organization.id}/manual/${randomUUID()}.txt`,
    sourceType: 'manual',
    mimeType: 'text/plain',
  });

  await recordAuditEvent({
    organizationId: organization.id,
    actorUserId: user.id,
    actor: 'user',
    action: 'document.created',
    entityType: 'Document',
    entityId: document.id,
    metadata: {
      fileName: document.fileName,
      sourceType: document.sourceType,
      mimeType: document.mimeType,
    },
  });

  res.status(201).json(presentDocument(document));
});

documentsRouter.post('/upload', requireCsrf, upload.single('file'), async (req, res) => {
  const { organization, user, membership } = req.authContext!;
  if (!canCreateClassification(membership.role)) {
    throw new HttpError(403, 'You do not have access to upload documents.');
  }
  const input = uploadSchema.parse({
    title: req.body.title,
    rawText: req.body.rawText,
  });

  if (!req.file) {
    throw new HttpError(400, 'No file was uploaded.');
  }

  console.log('Received document upload', {
    organizationId: organization.id,
    actorUserId: user.id,
    fileName: req.file.originalname,
    mimeType: req.file.mimetype,
    sizeBytes: req.file.size,
    hasRawTextFallback: Boolean(input.rawText.trim()),
  });

  const persisted = await persistUploadedDocument({
    file: req.file,
    organizationId: organization.id,
  });
  let extractedText = '';

  try {
    extractedText = await extractTextFromStoredFile({
      absolutePath: persisted.absolutePath,
      mimeType: persisted.mimeType,
      originalFileName: persisted.fileName,
    });

    await recordAuditEvent({
      organizationId: organization.id,
      actorUserId: user.id,
      actor: 'system',
      action: 'text_extraction.succeeded',
      entityType: 'DocumentUpload',
      entityId: persisted.storagePath,
      metadata: {
        fileName: persisted.fileName,
        mimeType: persisted.mimeType,
        sizeBytes: persisted.sizeBytes,
      },
    });
  } catch (error) {
    console.error('Document upload extraction failed', {
      organizationId: organization.id,
      actorUserId: user.id,
      fileName: persisted.fileName,
      mimeType: persisted.mimeType,
      storagePath: persisted.storagePath,
      error: error instanceof Error ? error.message : 'Extraction error details unavailable',
    });

    await recordAuditEvent({
      organizationId: organization.id,
      actorUserId: user.id,
      actor: 'system',
      action: 'text_extraction.failed',
      entityType: 'DocumentUpload',
      entityId: persisted.storagePath,
      metadata: {
        fileName: persisted.fileName,
        mimeType: persisted.mimeType,
        error: error instanceof Error ? error.message : 'Extraction error details unavailable',
      },
    });

    if (!input.rawText.trim()) {
      throw error;
    }
  }

  const finalRawText = extractedText || input.rawText.trim();
  if (!finalRawText) {
    console.error('Document upload produced no usable text', {
      organizationId: organization.id,
      actorUserId: user.id,
      fileName: persisted.fileName,
      mimeType: persisted.mimeType,
      storagePath: persisted.storagePath,
    });
    throw new HttpError(
      422,
      'No usable text could be extracted from the uploaded file. Paste raw text to continue.',
    );
  }

  const document = await createDocument(organization.id, {
    title: input.title || deriveTitleFromFileName(persisted.fileName) || 'Untitled document',
    fileName: persisted.fileName,
    mimeType: persisted.mimeType,
    sizeBytes: persisted.sizeBytes,
    storagePath: persisted.storagePath,
    sha256: persisted.sha256,
    pageCount: persisted.mimeType === 'text/plain' ? 1 : undefined,
    extractionStatus: 'completed',
    origin: 'customer_provided',
    visibility: 'private',
    rawText: finalRawText,
    sourceType: 'upload',
  });

  await recordAuditEvent({
    organizationId: organization.id,
    actorUserId: user.id,
    actor: 'user',
    action: 'document.uploaded',
    entityType: 'Document',
    entityId: document.id,
    metadata: {
      fileName: document.fileName,
      mimeType: document.mimeType,
      sizeBytes: document.sizeBytes,
      storagePath: document.storagePath,
    },
  });

  await recordAuditEvent({
    organizationId: organization.id,
    actorUserId: user.id,
    actor: 'user',
    action: 'document.created',
    entityType: 'Document',
    entityId: document.id,
    metadata: {
      sourceType: document.sourceType,
      hasPastedFallback: Boolean(input.rawText.trim()),
    },
  });

  res.status(201).json(presentDocument(document));
});

documentsRouter.post('/sample', requireCsrf, async (req, res) => {
  const { organization, user, membership } = req.authContext!;
  if (!canCreateClassification(membership.role)) {
    throw new HttpError(403, 'You do not have access to create documents.');
  }
  const sample = await loadBundledSampleDatasheet();

  const document = await createDocument(organization.id, sample);

  await recordAuditEvent({
    organizationId: organization.id,
    actorUserId: user.id,
    actor: 'user',
    action: 'document.created',
    entityType: 'Document',
    entityId: document.id,
    metadata: {
      sourceType: 'seed',
      demoMode: true,
      fileName: document.fileName,
    },
  });

  res.status(201).json({
    ...presentDocument(document),
    demoNote:
      'This document comes from a bundled public/sample datasheet text file for demonstration purposes.',
  });
});

documentsRouter.get('/', async (req, res) => {
  const { organization } = req.authContext!;
  const documents = await listDocuments(organization.id, req.query.archived === 'true');
  res.json(documents.map((document) => presentDocument(document)));
});

documentsRouter.get('/:id', async (req, res) => {
  const { organization } = req.authContext!;
  const document = await getDocument(organization.id, req.params.id);

  if (!document) {
    return res.status(404).json({ error: 'Document not found' });
  }

  return res.json(presentDocument(document));
});

documentsRouter.post('/:id/archive', requireCsrf, async (req, res) => {
  const { organization, user, membership } = req.authContext!;
  if (!canCreateClassification(membership.role)) throw new HttpError(403, 'You do not have access to archive documents.');
  res.json(await archiveDocument({ organizationId: organization.id, documentId: String(req.params.id), actorUserId: user.id }));
});

documentsRouter.post('/:id/restore', requireCsrf, async (req, res) => {
  const { organization, user, membership } = req.authContext!;
  if (!canCreateClassification(membership.role)) throw new HttpError(403, 'You do not have access to restore documents.');
  res.json(await restoreDocument({ organizationId: organization.id, documentId: String(req.params.id), actorUserId: user.id }));
});

documentsRouter.delete('/:id/permanent', requireCsrf, async (req, res) => {
  const { organization, user, membership } = req.authContext!;
  if (!canManageWorkspace(membership.role)) throw new HttpError(403, 'Only organization administrators may permanently delete documents.');
  const input = z.object({ confirmation: z.string().trim().min(1) }).parse(req.body);
  res.json(await permanentlyDeleteDocument({ organizationId: organization.id, documentId: String(req.params.id), actorUserId: user.id, confirmation: input.confirmation, storage }));
});

documentsRouter.post('/:id/classification-runs', requireCsrf, async (req, res) => {
  const input = parseBody(classificationRunCreateSchema, req);
  const { organization, user, membership } = req.authContext!;

  if (!canCreateClassification(membership.role)) {
    throw new HttpError(403, 'You do not have access to create classification reviews.');
  }

  const document = await getDocument(organization.id, String(req.params.id));
  if (!document) throw new HttpError(404, 'Document not found');
  if (document.archivedAt) throw new HttpError(409, 'Restore the archived document before creating a classification run.');

  const run = await workerClient.createRun({
    documentId: String(req.params.id),
    organizationId: organization.id,
    actorUserId: user.id,
    trigger: input.trigger ?? 'manual',
    executionMode: input.executionMode ??
      (organization.defaultExecutionPreference === 'local' ? 'local' : 'remote'),
    selectedProvider: selectExecutionProvider(
      input.executionMode ??
        (organization.defaultExecutionPreference === 'local' ? 'local' : 'remote'),
    ).selectedProvider,
  });

  return res.status(202).json(presentRun(run));
});
