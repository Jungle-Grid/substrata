import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import {
  classificationRunCreateSchema,
  documentCreateSchema,
} from '@substrata/shared';
import { parseBody } from '../lib/http';
import { HttpError } from '../lib/errors';
import {
  createDocument,
  getDocument,
  listDocuments,
} from '../services/document.service';
import { recordAuditEvent } from '../services/audit.service';
import { createWorkerClient } from '../services/worker-client';
import {
  loadBundledSampleDatasheet,
  persistUploadedDocument,
} from '../services/document-upload.service';
import { extractTextFromStoredFile } from '../services/text-extraction.service';
import { presentDocument } from '../services/presenters';

export const documentsRouter = Router();
const workerClient = createWorkerClient();
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

documentsRouter.post('/', async (req, res) => {
  const input = parseBody(documentCreateSchema, req);
  const { organization, user } = req.authContext;

  const document = await createDocument(organization.id, {
    ...input,
    sourceType: input.sourceType ?? 'upload',
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

documentsRouter.post('/upload', upload.single('file'), async (req, res) => {
  const { organization, user } = req.authContext;
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

  const persisted = await persistUploadedDocument({ file: req.file });
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
      error: error instanceof Error ? error.message : 'Unknown extraction error',
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
        error: error instanceof Error ? error.message : 'Unknown extraction error',
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

documentsRouter.post('/sample', async (req, res) => {
  const { organization, user } = req.authContext;
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
  const { organization } = req.authContext;
  const documents = await listDocuments(organization.id);
  res.json(documents.map((document) => presentDocument(document)));
});

documentsRouter.get('/:id', async (req, res) => {
  const { organization } = req.authContext;
  const document = await getDocument(organization.id, req.params.id);

  if (!document) {
    return res.status(404).json({ error: 'Document not found' });
  }

  return res.json(presentDocument(document));
});

documentsRouter.post('/:id/classification-runs', async (req, res) => {
  const input = parseBody(classificationRunCreateSchema, req);
  const { organization, user } = req.authContext;

  const run = await workerClient.createRun({
    documentId: req.params.id,
    organizationId: organization.id,
    actorUserId: user.id,
    trigger: input.trigger ?? 'manual',
  });

  return res.status(201).json(run);
});
