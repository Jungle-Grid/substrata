import { Router, type Request } from 'express';
import { HttpError } from '../lib/errors';
import {
  presentPublicDemoMetadata,
  presentPublicDemoRun,
} from '../services/presenters';
import { assertRateLimit } from '../services/rate-limit.service';
import {
  getPublicMemoDownload,
  getActivePublicDemo,
  getPublicDemoClassificationRun,
} from '../services/classification.service';

type PublicRouterDeps = {
  loadPublicDemoRun?: (runId: string) => ReturnType<typeof getPublicDemoClassificationRun>;
  loadActivePublicDemo?: () => ReturnType<typeof getActivePublicDemo>;
  loadPublicMemoDownload?: typeof getPublicMemoDownload;
  rateLimit?: typeof assertRateLimit;
};

function getClientIp(req: Request) {
  return (
    req.headers['x-forwarded-for']?.toString().split(',')[0]?.trim() ??
    req.socket.remoteAddress ??
    'unknown'
  );
}

export function createPublicRouter(deps: PublicRouterDeps = {}) {
  const router = Router();
  const loadPublicDemoRun = deps.loadPublicDemoRun ?? getPublicDemoClassificationRun;
  const loadActivePublicDemo = deps.loadActivePublicDemo ?? getActivePublicDemo;
  const loadPublicMemoDownload = deps.loadPublicMemoDownload ?? getPublicMemoDownload;
  const rateLimit = deps.rateLimit ?? assertRateLimit;

  function setPublicCacheHeaders() {
    return {
      'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
      Vary: 'Accept-Encoding',
    };
  }

  router.get('/demo', async (req, res) => {
    try {
      rateLimit({
        key: `public-demo-meta:${getClientIp(req)}`,
        limit: 60,
        windowMs: 60 * 1000,
      });
    } catch (error) {
      throw new HttpError(
        429,
        error instanceof Error ? error.message : 'Too many requests. Try again later.',
      );
    }

    const publication = await loadActivePublicDemo();

    if (!publication) {
      return res.status(404).json({
        error: 'NotFound',
        message: 'Public classification demo not found.',
      });
    }

    res.set(setPublicCacheHeaders());
    return res.json(presentPublicDemoMetadata(publication));
  });

  router.get('/classification-runs/:runId', async (req, res) => {
    try {
      rateLimit({
        key: `public-demo:${getClientIp(req)}:${String(req.params.runId)}`,
        limit: 60,
        windowMs: 60 * 1000,
      });
    } catch (error) {
      throw new HttpError(
        429,
        error instanceof Error ? error.message : 'Too many requests. Try again later.',
      );
    }

    const run = await loadPublicDemoRun(String(req.params.runId));

    if (!run) {
      return res.status(404).json({
        error: 'NotFound',
        message: 'Public classification demo not found.',
      });
    }

    res.set(setPublicCacheHeaders());
    return res.json(presentPublicDemoRun(run));
  });

  router.get('/classification-runs/:runId/memo/download', async (req, res) => {
    try {
      rateLimit({
        key: `public-demo-memo:${getClientIp(req)}:${String(req.params.runId)}`,
        limit: 60,
        windowMs: 60 * 1000,
      });
    } catch (error) {
      throw new HttpError(
        429,
        error instanceof Error ? error.message : 'Too many requests. Try again later.',
      );
    }

    try {
      const payload = await loadPublicMemoDownload(String(req.params.runId));
      res.set(setPublicCacheHeaders());
      res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${payload.filename}"`,
      );
      return res.send(payload.content);
    } catch (error) {
      if (error instanceof HttpError) {
        return res.status(error.statusCode).json({
          error: {
            code:
              (error.details as { code?: string } | undefined)?.code ?? 'PUBLIC_MEMO_DOWNLOAD_FAILED',
            message: error.message,
          },
        });
      }
      if (error instanceof Error && 'statusCode' in error) {
        const typedError = error as Error & {
          statusCode: number;
          details?: { code?: string };
        };
        return res.status(typedError.statusCode).json({
          error: {
            code: typedError.details?.code ?? 'PUBLIC_MEMO_DOWNLOAD_FAILED',
            message: typedError.message,
          },
        });
      }
      throw error;
    }
  });

  return router;
}

export const publicRouter = createPublicRouter();
