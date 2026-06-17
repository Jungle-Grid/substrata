import { Router } from 'express';
import { prisma } from '@substrata/db';

export const healthRouter = Router();

healthRouter.get('/', async (_req, res) => {
  await prisma.$queryRaw`SELECT 1`;

  res.json({
    ok: true,
    service: 'substrata-api',
    database: 'ok',
    time: new Date().toISOString(),
  });
});
