import cors from 'cors';
import express from 'express';
import { env } from './config/env';
import { requireAuth, sessionMiddleware } from './middleware/auth';
import { errorHandler } from './middleware/error-handler';
import { requestLogger } from './middleware/request-logger';
import { createHealthRouter } from './routes/health';
import { createDocumentsRouter } from './routes/documents';
import { createClassificationRunsRouter } from './routes/classification-runs';
import type { StorageDriver } from './services/storage';
import type { RemoteCancellationClient } from './services/lifecycle.service';
import { authRouter } from './routes/auth';
import { organizationsRouter } from './routes/organizations';
import { invitesRouter } from './routes/invites';
import { auditLogRouter } from './routes/audit-log';
import { publicRouter } from './routes/public';
import { historyRouter } from './routes/history';
import { debugRouter } from './routes/debug';
import { resumeQueuedCompanyHistoryIngestion } from './services/history-ingestion.service';

export function buildCorsOptions() {
  return {
    origin: env.apiCorsOrigin,
    credentials: true,
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'X-CSRF-Token'],
    exposedHeaders: ['x-substrata-csrf-refresh'],
  };
}

export function createApp(
  deps: {
    storage?: StorageDriver;
    remoteCancellation?: RemoteCancellationClient;
    healthCheck?: () => Promise<void>;
  } = {},
) {
  const app = express();
  const v1 = express.Router();
  const healthRouter = createHealthRouter({
    checkDatabase: deps.healthCheck,
  });

  app.use(requestLogger);
  app.use(cors(buildCorsOptions()));
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: false }));

  app.use('/health', healthRouter);
  app.use('/v1/health', healthRouter);
  app.use(sessionMiddleware);

  v1.use('/auth', authRouter);
  v1.use('/public', publicRouter);
  v1.use('/organizations', organizationsRouter);
  v1.use('/invites', invitesRouter);
  v1.use('/audit-log', auditLogRouter);
  v1.use(requireAuth);
  v1.use('/documents', createDocumentsRouter({ storage: deps.storage }));
  v1.use(
    '/classification-runs',
    createClassificationRunsRouter({
      storage: deps.storage,
      remoteCancellation: deps.remoteCancellation,
    }),
  );
  v1.use('/history', historyRouter);
  v1.use('/debug', debugRouter);

  app.use('/v1', v1);
  app.use(errorHandler);

  queueMicrotask(() => {
    void resumeQueuedCompanyHistoryIngestion().catch(() => undefined);
  });

  return app;
}
