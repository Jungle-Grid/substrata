import fs from 'node:fs/promises';
import { Router } from 'express';
import { publicDemoPublishSchema, reviewSubmissionSchema } from '@substrata/shared';
import { canManagePublicDemo, canSubmitReview } from '../lib/authz';
import { parseBody } from '../lib/http';
import {
  getClassificationRun,
  getClassificationRunDemoPublicationStatus,
  listClassificationRuns,
  listReviewMemos,
  listReviewQueue,
  publishClassificationRunAsPublicDemo,
  submitClassificationReview,
  unpublishClassificationRunAsPublicDemo,
} from '../services/classification.service';
import { presentRun } from '../services/presenters';

type ClassificationRunsRouterDeps = {
  loadClassificationRun?: typeof getClassificationRun;
  listRuns?: typeof listClassificationRuns;
  listQueue?: typeof listReviewQueue;
  listMemosForOrg?: typeof listReviewMemos;
  submitReviewRecord?: typeof submitClassificationReview;
  publishDemo?: typeof publishClassificationRunAsPublicDemo;
  unpublishDemo?: typeof unpublishClassificationRunAsPublicDemo;
  getDemoStatus?: typeof getClassificationRunDemoPublicationStatus;
};

export function createClassificationRunsRouter(
  deps: ClassificationRunsRouterDeps = {},
) {
  const classificationRunsRouter = Router();
  const loadClassificationRun = deps.loadClassificationRun ?? getClassificationRun;
  const listRuns = deps.listRuns ?? listClassificationRuns;
  const listQueue = deps.listQueue ?? listReviewQueue;
  const listMemosForOrg = deps.listMemosForOrg ?? listReviewMemos;
  const submitReviewRecord = deps.submitReviewRecord ?? submitClassificationReview;
  const publishDemo = deps.publishDemo ?? publishClassificationRunAsPublicDemo;
  const unpublishDemo = deps.unpublishDemo ?? unpublishClassificationRunAsPublicDemo;
  const getDemoStatus = deps.getDemoStatus ?? getClassificationRunDemoPublicationStatus;

  classificationRunsRouter.get('/', async (req, res) => {
    const runs = await listRuns(req.authContext!.organization.id);
    res.json(runs.map((run) => presentRun(run)));
  });

  classificationRunsRouter.get('/review-queue', async (req, res) => {
    if (!canSubmitReview(req.authContext!.membership.role)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have access to the review queue.',
      });
    }

    const runs = await listQueue(req.authContext!.organization.id);
    res.json(runs.map((run) => presentRun(run)));
  });

  classificationRunsRouter.get('/memos', async (req, res) => {
    const memos = await listMemosForOrg(req.authContext!.organization.id);
    res.json(
      memos.map((memo) => ({
        id: memo.id,
        classificationRunId: memo.classificationRunId,
        documentId: memo.classificationRun.document.id,
        documentTitle: memo.classificationRun.document.title,
        documentFileName: memo.classificationRun.document.fileName,
        generatedBy: memo.generatedBy,
        updatedAt: memo.updatedAt,
        humanReviewStatus:
          memo.classificationRun.humanReviews[0]?.status ?? 'pending_review',
      })),
    );
  });

  classificationRunsRouter.get('/:id', async (req, res) => {
    const { organization } = req.authContext!;
    const run = await loadClassificationRun(organization.id, req.params.id);

    if (!run) {
      return res.status(404).json({ error: 'Classification run not found' });
    }

    return res.json(presentRun(run));
  });

  classificationRunsRouter.get('/:id/demo-publication-status', async (req, res) => {
    const { organization, membership, user } = req.authContext!;

    if (!canManagePublicDemo(membership.role, user.email)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have access to manage the public demo.',
      });
    }

    const status = await getDemoStatus(organization.id, req.params.id);

    if (!status) {
      return res.status(404).json({ error: 'Classification run not found' });
    }

    return res.json(status);
  });

  classificationRunsRouter.post('/:id/publish-demo', async (req, res) => {
    const { organization, membership, user } = req.authContext!;

    if (!canManagePublicDemo(membership.role, user.email)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have access to manage the public demo.',
      });
    }

    const input = parseBody(publicDemoPublishSchema, req);
    const publication = await publishDemo({
      classificationRunId: req.params.id,
      organizationId: organization.id,
      actorUserId: user.id,
      confirmation: input.confirmation,
      publicTitle: input.publicTitle,
      publicSummary: input.publicSummary,
      sourceDocumentDisplayName: input.sourceDocumentDisplayName,
    });

    return res.status(200).json({
      isPublished: true,
      activeDemoRunId: publication.activeClassificationRunId,
      canonicalUrl: `/classification-runs/${publication.activeClassificationRunId}`,
      publishedAt: publication.publishedAt,
      publicTitle: publication.publicTitle,
      publicSummary: publication.publicSummary,
      sourceDocumentDisplayName: publication.sourceDocumentDisplayName,
    });
  });

  classificationRunsRouter.post('/:id/unpublish-demo', async (req, res) => {
    const { organization, membership, user } = req.authContext!;

    if (!canManagePublicDemo(membership.role, user.email)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have access to manage the public demo.',
      });
    }

    await unpublishDemo({
      classificationRunId: req.params.id,
      organizationId: organization.id,
      actorUserId: user.id,
    });

    return res.status(200).json({
      isPublished: false,
      activeDemoRunId: null,
      canonicalUrl: `/classification-runs/${req.params.id}`,
    });
  });

  classificationRunsRouter.get('/:id/memo', async (req, res) => {
    const { organization } = req.authContext!;
    const run = await loadClassificationRun(organization.id, req.params.id);

    if (!run || !run.reviewMemo) {
      return res.status(404).json({ error: 'Classification memo not found' });
    }

    const presentedRun = presentRun(run);

    return res.json({
      classificationRunId: run.id,
      documentId: run.documentId,
      status: run.status,
      requiresHumanReview: run.requiresHumanReview,
      humanReviewStatus: run.humanReviews[0]?.status ?? 'pending_review',
      contentMarkdown: run.reviewMemo.contentMarkdown,
      reviewerNote: run.humanReviews[0]?.notes ?? null,
      disclaimer: 'Draft for expert review only.',
      summary: presentedRun.document.summary,
    });
  });

  classificationRunsRouter.get('/:id/memo/download', async (req, res) => {
    const { organization } = req.authContext!;
    const run = await loadClassificationRun(organization.id, req.params.id);

    if (!run || !run.reviewMemo) {
      return res.status(404).json({ error: 'Classification memo not found' });
    }

    const markdown = run.reviewMemo.contentMarkdown;
    const baseName = run.document.fileName
      .replace(/\.[^.]+$/, '')
      .replace(/[^a-zA-Z0-9._-]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .toLowerCase();
    const safeTitle = baseName || run.document.title.replace(/[^a-zA-Z0-9._-]+/g, '-');

    res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="substrata-eccn-review-${safeTitle}.md"`,
    );

    return res.send(markdown);
  });

  classificationRunsRouter.post('/:id/review', async (req, res) => {
    const input = parseBody(reviewSubmissionSchema, req);
    const { organization, user, membership } = req.authContext!;

    if (!canSubmitReview(membership.role)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have access to record a human review decision.',
      });
    }

    const review = await submitReviewRecord({
      classificationRunId: req.params.id,
      organizationId: organization.id,
      reviewerId: user.id,
      status: input.status,
      note: input.note ?? '',
    });

    return res.status(201).json(review);
  });

  classificationRunsRouter.get('/:id/artifacts', async (req, res) => {
    const { organization } = req.authContext!;
    const run = await loadClassificationRun(organization.id, req.params.id);

    if (!run) {
      return res.status(404).json({ error: 'Classification run not found' });
    }

    const [memoPreview, extractedTextPreview] = await Promise.all([
      run.memoArtifactPath
        ? fs.readFile(run.memoArtifactPath, 'utf8').catch(() => null)
        : Promise.resolve(null),
      run.extractedTextPath
        ? fs.readFile(run.extractedTextPath, 'utf8').catch(() => null)
        : Promise.resolve(null),
    ]);

    return res.json({
      classificationRunId: run.id,
      artifacts: {
        extractedTextPath: run.extractedTextPath,
        structuredOutputPath: run.structuredOutputPath,
        memoArtifactPath: run.memoArtifactPath,
      },
      previews: {
        memoPreview,
        extractedTextPreview,
      },
    });
  });

  return classificationRunsRouter;
}

export const classificationRunsRouter = createClassificationRunsRouter();
