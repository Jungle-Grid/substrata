import { Router } from 'express';
import { prisma } from '@substrata/db';
import { requireAuth, requireVerifiedEmail } from '../middleware/auth';

export const auditLogRouter = Router();

auditLogRouter.get('/', requireAuth, requireVerifiedEmail, async (req, res) => {
  const events = await prisma.auditEvent.findMany({
    where: {
      organizationId: req.authContext!.organization.id,
    },
    include: {
      user: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: 100,
  });

  res.json({
    events: events.map((event) => ({
      id: event.id,
      actor: event.actor,
      actorUser: event.user
        ? {
            id: event.user.id,
            name: event.user.name,
            email: event.user.email,
          }
        : null,
      action: event.action,
      entityType: event.entityType,
      entityId: event.entityId,
      metadata: event.metadata,
      createdAt: event.createdAt,
    })),
  });
});
