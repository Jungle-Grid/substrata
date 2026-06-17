import { prisma, type Prisma } from '@substrata/db';

export async function recordAuditEvent(input: {
  organizationId: string;
  actorUserId?: string;
  actor: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: Prisma.InputJsonValue;
}) {
  return prisma.auditEvent.create({
    data: {
      ...input,
      metadata: input.metadata,
    },
  });
}
