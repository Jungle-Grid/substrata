import { Router } from 'express';
import { prisma } from '@substrata/db';

type HealthRouterDeps = {
  checkDatabase?: () => Promise<void>;
};

async function defaultDatabaseCheck() {
  await prisma.$queryRaw`SELECT 1`;
}

export function createHealthRouter(deps: HealthRouterDeps = {}) {
  const healthRouter = Router();
  const checkDatabase = deps.checkDatabase ?? defaultDatabaseCheck;

  healthRouter.get('/', async (_req, res) => {
    try {
      await checkDatabase();
    } catch {
      return res.status(503).json({
        ok: false,
        service: 'substrata-api',
        database: 'unavailable',
      });
    }

    return res.json({
      ok: true,
      service: 'substrata-api',
      database: 'ok',
      time: new Date().toISOString(),
    });
  });

  return healthRouter;
}
