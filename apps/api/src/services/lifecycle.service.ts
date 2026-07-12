import { prisma } from '@substrata/db';
import { HttpError } from '../lib/errors';
import { recordAuditEvent } from './audit.service';
import type { StorageDriver } from './storage';

const ACTIVE_RUN_STATUSES = new Set(['pending', 'queued', 'running', 'unknown']);
export type RemoteCancellationResult = { outcome: 'timeout'|'rejected'|'unknown_job'|'unresolved'; reason?: string };
export interface RemoteCancellationClient { cancel(externalJobId: string): Promise<RemoteCancellationResult>; }
export const unresolvedRemoteCancellationClient: RemoteCancellationClient = { async cancel() { return { outcome: 'unresolved' }; } };

export async function cancelRun(input: { organizationId: string; runId: string; actorUserId: string; remoteCancellation?: RemoteCancellationClient }) {
  const run = await prisma.classificationRun.findFirst({ where: { id: input.runId, organizationId: input.organizationId }, include: { executionJob: true } });
  if (!run) throw new HttpError(404, 'Classification run not found');
  if (run.status === 'cancelled') return run;
  if (run.archivedAt) throw new HttpError(409, 'Restore the archived classification run before cancellation.');
  if (!ACTIVE_RUN_STATUSES.has(run.status)) throw new HttpError(409, 'Only active classification runs can be cancelled.');
  if (run.executionJob?.externalJobId) {
    let result: RemoteCancellationResult;
    try { result = await (input.remoteCancellation ?? unresolvedRemoteCancellationClient).cancel(run.executionJob.externalJobId); }
    catch { result = { outcome: 'unresolved' }; }
    const failureReason = `Remote cancellation was not confirmed (${result.outcome}).`;
    await prisma.classificationRun.update({ where: { id: run.id }, data: { cancellationRequestedAt: new Date(), cancellationFailureReason: failureReason } });
    await recordAuditEvent({ organizationId: input.organizationId, actorUserId: input.actorUserId, actor: 'user', action: 'classification_run.cancellation_failed', entityType: 'ClassificationRun', entityId: run.id, metadata: { result: 'unconfirmed_remote_cancellation', outcome: result.outcome } });
    throw new HttpError(409, 'Remote cancellation could not be confirmed; the run remains active.');
  }
  const cancelled = await prisma.classificationRun.update({ where: { id: run.id }, data: { status: 'cancelled', cancellationRequestedAt: new Date(), cancelledAt: new Date(), errorMessage: 'Cancelled by authorized user.' } });
  await recordAuditEvent({ organizationId: input.organizationId, actorUserId: input.actorUserId, actor: 'user', action: 'classification_run.cancelled', entityType: 'ClassificationRun', entityId: run.id, metadata: { result: 'cancelled_local' } });
  return cancelled;
}

export async function deleteArtifact(input: { organizationId: string; runId: string; artifactId: string; actorUserId: string; storage: StorageDriver; retry?: boolean }) {
  const artifact = await prisma.artifact.findFirst({ where: { id: input.artifactId, organizationId: input.organizationId, classificationRunId: input.runId }, include: { classificationRun: true } });
  if (!artifact) throw new HttpError(404, 'Artifact not found');
  if (artifact.classificationRun && ACTIVE_RUN_STATUSES.has(artifact.classificationRun.status)) throw new HttpError(409, 'Artifacts for active runs cannot be deleted.');
  if (input.retry && !artifact.deletionFailureReason) throw new HttpError(409, 'Artifact deletion is not eligible for retry.');
  await prisma.artifact.update({ where: { id: artifact.id }, data: { deletionRequestedAt: new Date(), deletionAttemptCount: { increment: 1 }, deletionFailureReason: null } });
  try {
    const cleanup = await input.storage.delete(artifact.storagePath);
    await prisma.artifact.delete({ where: { id: artifact.id } });
    await recordAuditEvent({ organizationId: input.organizationId, actorUserId: input.actorUserId, actor: 'user', action: 'artifact.deleted', entityType: 'Artifact', entityId: artifact.id, metadata: { result: cleanup } });
    return { id: artifact.id, cleanup };
  } catch (error) {
    const reason = error instanceof Error ? error.message.slice(0, 200) : 'storage_cleanup_failed';
    await prisma.artifact.update({ where: { id: artifact.id }, data: { deletionFailureReason: reason } });
    await recordAuditEvent({ organizationId: input.organizationId, actorUserId: input.actorUserId, actor: 'user', action: 'artifact.deletion_failed', entityType: 'Artifact', entityId: artifact.id, metadata: { result: 'failed', reason } });
    throw new HttpError(502, 'Artifact storage cleanup failed; retry is required.');
  }
}

function assertTerminal(status: string) {
  if (ACTIVE_RUN_STATUSES.has(status)) {
    throw new HttpError(409, 'Active classification runs must be cancelled or reach a terminal state before deletion.');
  }
}

export async function archiveDocument(input: { organizationId: string; documentId: string; actorUserId: string }) {
  const document = await prisma.document.findFirst({ where: { id: input.documentId, organizationId: input.organizationId, companyHistoryDocument: null } });
  if (!document) throw new HttpError(404, 'Document not found');
  if (document.archivedAt) return document;
  const archived = await prisma.document.update({ where: { id: document.id }, data: { archivedAt: new Date(), archivedByUserId: input.actorUserId } });
  await recordAuditEvent({ organizationId: input.organizationId, actorUserId: input.actorUserId, actor: 'user', action: 'document.archived', entityType: 'Document', entityId: document.id, metadata: { result: 'success' } });
  return archived;
}

export async function restoreDocument(input: { organizationId: string; documentId: string; actorUserId: string }) {
  const document = await prisma.document.findFirst({ where: { id: input.documentId, organizationId: input.organizationId, companyHistoryDocument: null } });
  if (!document) throw new HttpError(404, 'Document not found');
  if (!document.archivedAt) return document;
  const restored = await prisma.document.update({ where: { id: document.id }, data: { archivedAt: null, archivedByUserId: null } });
  await recordAuditEvent({ organizationId: input.organizationId, actorUserId: input.actorUserId, actor: 'user', action: 'document.restored', entityType: 'Document', entityId: document.id, metadata: { result: 'success' } });
  return restored;
}

export async function archiveRun(input: { organizationId: string; runId: string; actorUserId: string }) {
  const run = await prisma.classificationRun.findFirst({ where: { id: input.runId, organizationId: input.organizationId } });
  if (!run) throw new HttpError(404, 'Classification run not found');
  assertTerminal(run.status);
  if (run.archivedAt) return run;
  const archived = await prisma.classificationRun.update({ where: { id: run.id }, data: { archivedAt: new Date(), archivedByUserId: input.actorUserId } });
  await recordAuditEvent({ organizationId: input.organizationId, actorUserId: input.actorUserId, actor: 'user', action: 'classification_run.archived', entityType: 'ClassificationRun', entityId: run.id, metadata: { result: 'success' } });
  return archived;
}

export async function restoreRun(input: { organizationId: string; runId: string; actorUserId: string }) {
  const run = await prisma.classificationRun.findFirst({ where: { id: input.runId, organizationId: input.organizationId } });
  if (!run) throw new HttpError(404, 'Classification run not found');
  if (!run.archivedAt) return run;
  const restored = await prisma.classificationRun.update({ where: { id: run.id }, data: { archivedAt: null, archivedByUserId: null } });
  await recordAuditEvent({ organizationId: input.organizationId, actorUserId: input.actorUserId, actor: 'user', action: 'classification_run.restored', entityType: 'ClassificationRun', entityId: run.id, metadata: { result: 'success' } });
  return restored;
}

async function deleteStorageKeys(storage: StorageDriver, keys: string[]) {
  const results = [] as string[];
  for (const key of [...new Set(keys.filter(Boolean))]) results.push(await storage.delete(key));
  return results;
}

export async function permanentlyDeleteRun(input: { organizationId: string; runId: string; actorUserId: string; confirmation: string; storage: StorageDriver }) {
  if (input.confirmation !== input.runId) throw new HttpError(400, 'Confirmation must match the classification run identifier.');
  const run = await prisma.classificationRun.findFirst({ where: { id: input.runId, organizationId: input.organizationId }, include: { artifacts: true } });
  if (!run) throw new HttpError(404, 'Classification run not found');
  assertTerminal(run.status);
  if (!run.archivedAt) throw new HttpError(409, 'Archive the classification run before permanent deletion.');
  try {
    const cleanup = await deleteStorageKeys(input.storage, run.artifacts.map((artifact) => artifact.storagePath));
    await recordAuditEvent({ organizationId: input.organizationId, actorUserId: input.actorUserId, actor: 'user', action: 'classification_run.deletion_requested', entityType: 'ClassificationRun', entityId: run.id, metadata: { artifactCleanup: cleanup } });
    await prisma.classificationRun.delete({ where: { id: run.id } });
    await recordAuditEvent({ organizationId: input.organizationId, actorUserId: input.actorUserId, actor: 'user', action: 'classification_run.permanently_deleted', entityType: 'ClassificationRun', entityId: run.id, metadata: { result: 'success', artifactCleanup: cleanup } });
    return { id: run.id, cleanup };
  } catch (error) {
    await recordAuditEvent({ organizationId: input.organizationId, actorUserId: input.actorUserId, actor: 'user', action: 'classification_run.deletion_failed', entityType: 'ClassificationRun', entityId: run.id, metadata: { result: 'failed', reason: error instanceof Error ? error.message.slice(0, 200) : 'cleanup_failed' } });
    throw new HttpError(502, 'Run artifact storage cleanup failed; deletion was not completed.');
  }
}

export async function permanentlyDeleteDocument(input: { organizationId: string; documentId: string; actorUserId: string; confirmation: string; storage: StorageDriver }) {
  const document = await prisma.document.findFirst({ where: { id: input.documentId, organizationId: input.organizationId, companyHistoryDocument: null }, include: { classificationRuns: { include: { artifacts: true } } } });
  if (!document) throw new HttpError(404, 'Document not found');
  if (input.confirmation !== document.id) throw new HttpError(400, 'Confirmation must match the document identifier.');
  if (!document.archivedAt) throw new HttpError(409, 'Archive the document before permanent deletion.');
  document.classificationRuns.forEach((run) => assertTerminal(run.status));
  const keys = [document.storagePath, ...document.classificationRuns.flatMap((run) => run.artifacts.map((artifact) => artifact.storagePath))];
  try {
    const cleanup = await deleteStorageKeys(input.storage, keys);
    await recordAuditEvent({ organizationId: input.organizationId, actorUserId: input.actorUserId, actor: 'user', action: 'document.deletion_requested', entityType: 'Document', entityId: document.id, metadata: { artifactCleanup: cleanup } });
    await prisma.document.delete({ where: { id: document.id } });
    await recordAuditEvent({ organizationId: input.organizationId, actorUserId: input.actorUserId, actor: 'user', action: 'document.permanently_deleted', entityType: 'Document', entityId: document.id, metadata: { result: 'success', artifactCleanup: cleanup } });
    return { id: document.id, cleanup };
  } catch (error) {
    await recordAuditEvent({ organizationId: input.organizationId, actorUserId: input.actorUserId, actor: 'user', action: 'document.deletion_failed', entityType: 'Document', entityId: document.id, metadata: { result: 'failed', reason: error instanceof Error ? error.message.slice(0, 200) : 'cleanup_failed' } });
    throw new HttpError(502, 'Document storage cleanup failed; deletion was not completed.');
  }
}
