import cors from 'cors';
import express from 'express';
import { env } from './config/env';
import {
  requireAuth,

  sessionMiddleware,
} from './middleware/auth';
import { errorHandler } from './middleware/error-handler';
import { requestLogger } from './middleware/request-logger';
import { healthRouter } from './routes/health';
import { documentsRouter } from './routes/documents';
import { classificationRunsRouter } from './routes/classification-runs';
import { authRouter } from './routes/auth';
import { organizationsRouter } from './routes/organizations';
import { invitesRouter } from './routes/invites';
import { auditLogRouter } from './routes/audit-log';

export function createApp() {
  const app = express();
  const v1 = express.Router();

  app.use(requestLogger);
  app.use(
    cors({
      origin: env.apiCorsOrigin,
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: false }));

  app.use('/health', healthRouter);
  app.use(sessionMiddleware);

  v1.use('/auth', authRouter);
  v1.use('/organizations', organizationsRouter);
  v1.use('/invites', invitesRouter);
  v1.use('/audit-log', auditLogRouter);
  v1.use(requireAuth);
  v1.use('/documents', documentsRouter);
  v1.use('/classification-runs', classificationRunsRouter);

  app.use('/v1', v1);
  app.use(errorHandler);

  return app;
}
