import { randomBytes } from 'node:crypto';
import type { TestPrisma } from './test-database';

export async function createDocumentFixture(prisma: TestPrisma, organizationId: string, data: { archived?: boolean; storagePath?: string; title?: string } = {}) {
  const token = randomBytes(5).toString('hex');
  return prisma.document.create({ data: { organizationId, title: data.title ?? `Document ${token}`, fileName: `${token}.txt`, displayFileName: `${token}.txt`, mimeType: 'text/plain', storagePath: data.storagePath ?? `integration/${token}.txt`, sourceType: 'manual', rawText: 'integration fixture', archivedAt: data.archived ? new Date() : null } });
}

export async function createRunFixture(prisma: TestPrisma, organizationId: string, documentId: string, data: { status?: 'pending'|'queued'|'running'|'unknown'|'completed'|'failed'|'needs_attention'|'blocked'|'cancelled'; archived?: boolean; externalJobId?: string } = {}) {
  const run = await prisma.classificationRun.create({ data: { organizationId, documentId, status: data.status ?? 'completed', archivedAt: data.archived ? new Date() : null, completedAt: ['completed','failed','needs_attention','blocked'].includes(data.status ?? 'completed') ? new Date() : null } });
  if (data.externalJobId) await prisma.executionJob.create({ data: { organizationId, classificationRunId: run.id, backend: 'jungle_grid', status: 'running', externalJobId: data.externalJobId } });
  return run;
}

export async function createArtifactFixture(prisma: TestPrisma, organizationId: string, runId: string, storagePath?: string) {
  const token = randomBytes(5).toString('hex');
  return prisma.artifact.create({ data: { organizationId, classificationRunId: runId, kind: 'worker_log', storagePath: storagePath ?? `integration/${token}.log`, fileName: `${token}.log`, mimeType: 'text/plain' } });
}
