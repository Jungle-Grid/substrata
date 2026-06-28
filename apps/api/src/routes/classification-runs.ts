import fs from 'node:fs/promises';
import { Router } from 'express';
import { reviewSubmissionSchema } from '@substrata/shared';
import { canSubmitReview } from '../lib/authz';
import {
  getClassificationRun,
  listClassificationRuns,
  listReviewMemos,
  listReviewQueue,
  submitClassificationReview,
} from '../services/classification.service';
import { parseBody } from '../lib/http';
import { presentRun } from '../services/presenters';

export const classificationRunsRouter = Router();

classificationRunsRouter.get('/', async (req, res) => {
  const runs = await listClassificationRuns(req.authContext!.organization.id);
  res.json(runs.map((run) => presentRun(run)));
});

classificationRunsRouter.get('/review-queue', async (req, res) => {
  if (!canSubmitReview(req.authContext!.membership.role)) {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'You do not have access to the review queue.',
    });
  }
  const runs = await listReviewQueue(req.authContext!.organization.id);
  res.json(runs.map((run) => presentRun(run)));
});

classificationRunsRouter.get('/memos', async (req, res) => {
  const memos = await listReviewMemos(req.authContext!.organization.id);
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
  const run = await getClassificationRun(organization.id, req.params.id);

  if (!run) {
    return res.status(404).json({ error: 'Classification run not found' });
  }

  return res.json(presentRun(run));
});

classificationRunsRouter.get('/:id/memo', async (req, res) => {
  const { organization } = req.authContext!;
  const run = await getClassificationRun(organization.id, req.params.id);

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
  const run = await getClassificationRun(organization.id, req.params.id);

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

  const review = await submitClassificationReview({
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
  const run = await getClassificationRun(organization.id, req.params.id);

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
