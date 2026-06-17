import fs from 'node:fs/promises';
import { prisma, type HumanReviewStatus } from '@substrata/db';
import { recordAuditEvent } from './audit.service';
import { HttpError } from '../lib/errors';
import { createStorageDriver } from './storage';
import { runLocalWorker } from './worker-runtime';

const storage = createStorageDriver();

function confidenceLevelToScore(level: string) {
  switch (level) {
    case 'high':
      return 0.82;
    case 'low':
      return 0.42;
    default:
      return 0.63;
  }
}

function isDevelopment() {
  return process.env.NODE_ENV !== 'production';
}

function generatedByForWorker(output: Awaited<ReturnType<typeof runLocalWorker>>) {
  const metadata = output.runMetadata ?? {};
  const mode = metadata.classificationMode;
  const provider = metadata.aiProvider;
  const model = metadata.aiModel;
  if (mode === 'ai_assisted' && provider === 'gemini' && typeof model === 'string') {
    return `python_local_worker:gemini:${model}`;
  }
  if (mode === 'heuristic_fallback') {
    return 'python_local_worker:heuristic_fallback';
  }
  return 'python_local_worker:heuristic';
}

export async function createClassificationRun(input: {
  documentId: string;
  organizationId: string;
  actorUserId: string;
  trigger: string;
}) {
  const document = await prisma.document.findFirstOrThrow({
    where: {
      id: input.documentId,
      organizationId: input.organizationId,
    },
  });

  const run = await prisma.classificationRun.create({
    data: {
      organizationId: input.organizationId,
      documentId: input.documentId,
      trigger: input.trigger,
      status: 'pending',
      uncertaintyFlags: ['limited_regulatory_coverage'],
      requiresHumanReview: true,
    },
  });

  await recordAuditEvent({
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    actor: 'user',
    action: 'classification_run.started',
    entityType: 'ClassificationRun',
    entityId: run.id,
    metadata: {
      documentId: document.id,
      trigger: input.trigger,
    },
  });

  try {
    const sourceText =
      document.rawText ??
      (await fs
        .readFile(storage.resolve(document.storagePath), 'utf8')
        .catch(() => null));

    if (!sourceText) {
      throw new HttpError(
        400,
        'Document content is unavailable for classification.',
        {
          documentId: document.id,
          storagePath: document.storagePath,
        },
      );
    }

    if (isDevelopment()) {
      console.log('Classification worker input summary', {
        documentId: document.id,
        inputTextLength: sourceText.length,
      });
    }

    const workerOutput = await runLocalWorker({
      documentId: document.id,
      organizationId: input.organizationId,
      sourceText,
      documentTitle: document.title,
      documentMetadata: {
        fileName: document.fileName,
        mimeType: document.mimeType,
        sizeBytes: document.sizeBytes,
        sourceType: document.sourceType,
      },
    });

    if (isDevelopment()) {
      console.log('Classification worker output summary', {
        documentId: document.id,
        extractedSpecCount: workerOutput.extractedSpecs.length,
        extractedSpecNames: workerOutput.extractedSpecs.map((spec) => spec.name),
        candidateECCNs: workerOutput.eccnCandidates.map((candidate) => candidate.eccn),
      });
    }

    const updatedRun = await prisma.$transaction(async (tx) => {
      const runRecord = await tx.classificationRun.update({
        where: { id: run.id },
        data: {
          status: 'completed',
          confidence: workerOutput.confidence,
          uncertaintyFlags: workerOutput.uncertaintyFlags,
          workerJobId: `local-worker-${run.id}`,
          workerVersion: 'python-local-v3',
          rulesVersion: 'ear-review-v3',
          extractedTextPath: workerOutput.artifacts.extractedTextPath,
          structuredOutputPath: workerOutput.artifacts.structuredOutputPath,
          memoArtifactPath: workerOutput.artifacts.memoPath,
          completedAt: new Date(),
        },
      });

      await tx.extractedSpec.createMany({
        data: workerOutput.extractedSpecs.map((spec) => ({
          classificationRunId: run.id,
          name: spec.name,
          value: spec.value,
          unit: spec.unit ?? null,
          sourceSnippet: spec.sourceSnippet,
          importance: spec.importance,
          confidence: confidenceLevelToScore(spec.confidence),
          confidenceLevel: spec.confidence,
          category: spec.category,
        })),
      });

      for (const candidate of workerOutput.eccnCandidates) {
        const createdCandidate = await tx.eCCNCandidate.create({
          data: {
            classificationRunId: run.id,
            eccn: candidate.eccn,
            title: candidate.title,
            rationale: candidate.whyItMayApply,
            confidence: confidenceLevelToScore(candidate.confidence),
            confidenceLevel: candidate.confidence,
            matchedTechnicalFacts: candidate.matchedTechnicalFacts,
            whyItMayApply: candidate.whyItMayApply,
            whyItMayNotApply: candidate.whyItMayNotApply,
            missingInformation: candidate.missingInformation,
            reviewerQuestions: candidate.reviewerQuestions,
            uncertaintyFlags: candidate.uncertaintyFlags,
          },
        });

        await tx.citation.createMany({
          data: candidate.regulatoryCitations.map((citation) => ({
            classificationRunId: run.id,
            eccnCandidateId: createdCandidate.id,
            sourceTitle: citation.citationLabel,
            sourceUrl: null,
            sourceSection: citation.source,
            quotedText: citation.citationText,
            relevanceNote: citation.relevance,
          })),
        });
      }

      await tx.reviewMemo.create({
        data: {
          organizationId: input.organizationId,
          classificationRunId: run.id,
          contentMarkdown: workerOutput.memoMarkdown,
          generatedBy: generatedByForWorker(workerOutput),
        },
      });

      await tx.humanReview.create({
        data: {
          organizationId: input.organizationId,
          classificationRunId: run.id,
          reviewerId: input.actorUserId,
          status: 'pending_review',
        },
      });

      return runRecord;
    });

    await recordAuditEvent({
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      actor: 'worker',
      action: 'classification_run.completed',
      entityType: 'ClassificationRun',
      entityId: run.id,
      metadata: {
        workerJobId: `local-worker-${run.id}`,
        confidence: workerOutput.confidence,
      },
    });

    await recordAuditEvent({
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      actor: 'worker',
      action: 'memo.generated',
      entityType: 'ReviewMemo',
      entityId: run.id,
      metadata: {
        generatedBy: generatedByForWorker(workerOutput),
      },
    });

    const hydratedRun = await getClassificationRun(
      input.organizationId,
      updatedRun.id,
    );

    if (!hydratedRun) {
      throw new HttpError(
        500,
        'Completed classification run could not be loaded.',
      );
    }

    return hydratedRun;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Classification run failed.';

    await prisma.classificationRun.update({
      where: { id: run.id },
      data: {
        status: 'failed',
        errorMessage: message,
      },
    });

    await recordAuditEvent({
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      actor: 'worker',
      action: 'classification_run.failed',
      entityType: 'ClassificationRun',
      entityId: run.id,
      metadata: {
        error: message,
      },
    });

    throw error;
  }
}

export async function submitClassificationReview(input: {
  classificationRunId: string;
  organizationId: string;
  reviewerId: string;
  status: HumanReviewStatus;
  note: string;
}) {
  const existingRun = await getClassificationRun(
    input.organizationId,
    input.classificationRunId,
  );

  if (!existingRun) {
    throw new HttpError(404, 'Classification run not found.');
  }

  const currentReview = existingRun.humanReviews[0];

  if (!currentReview) {
    throw new HttpError(400, 'No human review record exists for this run.');
  }

  const note = input.note.trim();
  const updatedReview = await prisma.humanReview.update({
    where: { id: currentReview.id },
    data: {
      status: input.status,
      notes: note || null,
      reviewedAt:
        input.status === 'pending_review' ? null : new Date(),
      reviewerId: input.reviewerId,
    },
    include: {
      reviewer: true,
    },
  });

  await recordAuditEvent({
    organizationId: input.organizationId,
    actorUserId: input.reviewerId,
    actor: 'user',
    action: 'review.status_changed',
    entityType: 'HumanReview',
    entityId: updatedReview.id,
    metadata: {
      classificationRunId: input.classificationRunId,
      status: input.status,
    },
  });

  if (note) {
    await recordAuditEvent({
      organizationId: input.organizationId,
      actorUserId: input.reviewerId,
      actor: 'user',
      action: 'review.note_added',
      entityType: 'HumanReview',
      entityId: updatedReview.id,
      metadata: {
        classificationRunId: input.classificationRunId,
        note,
      },
    });
  }

  return updatedReview;
}

export async function getClassificationRun(
  organizationId: string,
  classificationRunId: string,
) {
  return prisma.classificationRun.findFirst({
    where: {
      id: classificationRunId,
      organizationId,
    },
    include: {
      document: true,
      extractedSpecs: true,
      eccnCandidates: {
        include: {
          citations: true,
        },
      },
      reviewMemo: true,
      humanReviews: {
        orderBy: { createdAt: 'desc' },
        include: {
          reviewer: true,
        },
      },
    },
  });
}
