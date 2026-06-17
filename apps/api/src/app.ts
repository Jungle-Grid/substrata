import cors from 'cors';
import express from 'express';
import { env } from './config/env';
import { mockAuthMiddleware } from './middleware/mock-auth';
import { errorHandler } from './middleware/error-handler';
import { requestLogger } from './middleware/request-logger';
import { healthRouter } from './routes/health';
import { documentsRouter } from './routes/documents';
import { classificationRunsRouter } from './routes/classification-runs';

export function createApp() {
  const app = express();

  app.use(requestLogger);
  app.use(
    cors({
      origin: env.apiCorsOrigin,
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '2mb' }));

  app.use('/health', healthRouter);
  app.use(mockAuthMiddleware);
  app.use('/documents', documentsRouter);
  app.use('/classification-runs', classificationRunsRouter);
  app.use(errorHandler);

  return app;
}
