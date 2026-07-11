import assert from 'node:assert/strict';
import test from 'node:test';
import { env } from '../config/env';
import { createClassificationRunsRouter } from './classification-runs';

type ClassificationRunsRouterDeps = NonNullable<
  Parameters<typeof createClassificationRunsRouter>[0]
>;

type RoutePath =
  | '/:id/demo-publication-status'
  | '/:id/publish-demo'
  | '/:id/unpublish-demo'
  | '/:id/memo/download'
  | '/:id';

type MockResponse = {
  statusCode: number;
  body: unknown;
  headers: Record<string, string>;
  status: (code: number) => MockResponse;
  json: (payload: unknown) => MockResponse;
  setHeader: (name: string, value: string) => MockResponse;
  send: (payload: unknown) => MockResponse;
};

function createMockResponse(): MockResponse {
  return {
    statusCode: 200,
    body: undefined,
    headers: {},
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
    setHeader(name, value) {
      this.headers[name] = value;
      return this;
    },
    send(payload) {
      this.body = payload;
      return this;
    },
  };
}

function createRun(id: string, organizationId = 'org_1', status = 'completed') {
  return {
    id,
    organizationId,
    status,
    workflowState: 'awaiting_reviewer_assignment',
    confidence: 0.64,
    confidenceRationale: 'Sample confidence rationale',
    uncertaintyFlags: [],
    requiresHumanReview: true,
    documentId: 'doc_1',
    reviewerAssignedUserId: null,
    reviewerClaimedAt: null,
    finalInternalRecommendation: null,
    conclusionDisclaimer: 'Classification support, not legal advice.',
    classificationTrace: {
      backendMode: 'backend_assisted',
      extractionSource: 'llm_extracted_facts',
      detectedProfiles: ['ai_accelerator'],
      profileScores: { ai_accelerator: 20 },
      matchedSignals: [{ signal: 'ai_accelerator_identity' }],
      candidatesGenerated: ['3A090', '4A090'],
      candidatesBlocked: ['5A002'],
      candidatesFilteredOut: [],
      filterReasons: [{ candidate: '5A002', reason: 'Affirmative crypto evidence required.' }],
      companyHistoryMatchCount: 1,
      companyHistoryMatches: [{ sourceFileName: 'AX900 memo', score: 0.91 }],
      companyHistorySignals: [{ priorEccns: ['3A090'], influence: 'priority_only' }],
      contradictions: [],
      missingEvidenceChecks: ['Memory bandwidth'],
      finalFrontendCandidateCounts: { review: 2, fallback: 1, blocked: 1, excluded: 0, total: 4, reviewerFinal: 0 },
    },
    lastReviewerActionAt: null,
    createdAt: new Date('2026-06-20T08:00:00.000Z'),
    updatedAt: new Date('2026-06-20T08:00:00.000Z'),
    completedAt: status === 'completed' ? new Date('2026-06-20T08:05:00.000Z') : null,
    document: {
      id: 'doc_1',
      title: 'Public edge accelerator datasheet',
      fileName: 'public-edge-accelerator.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 128000,
      storagePath: 'private/storage/path.pdf',
      sourceType: 'upload',
      displayFileName: 'public-edge-accelerator.pdf',
      documentType: 'Datasheet',
      manufacturer: 'Example Semi',
      sourceUrl: null,
      sourceDate: null,
      versionLabel: 'Rev A',
      sha256: null,
      pageCount: 12,
      extractionStatus: 'completed',
      origin: 'customer_provided',
      visibility: 'private',
      rawText: 'Sample raw text',
    },
    extractedSpecs: [],
    factIssues: [],
    reviewPaths: [],
    eccnCandidates: [],
    reviewMemo:
      status === 'completed'
        ? {
            id: 'memo_1',
            contentMarkdown: '# Memo',
            versionNumber: 1,
            reviewStateSnapshot: 'draft_generated',
            reviewerStatusSnapshot: 'pending_review',
            disclaimer: 'Draft review memo.',
            generatedBy: 'worker',
            createdAt: new Date('2026-06-20T08:05:00.000Z'),
            updatedAt: new Date('2026-06-20T08:05:00.000Z'),
            organizationId,
            classificationRunId: id,
          }
        : null,
    reviewMemoVersions: [],
    humanReviews: [],
    reviewerActions: [],
    executionJob: {
      id: 'execution_1',
      organizationId,
      classificationRunId: id,
      backend: 'fireworks',
      status: 'completed',
      externalJobId: 'job_1',
      provider: 'fireworks',
      gpuVendor: null,
      gpuName: null,
      runtimeVersion: null,
      modelName: null,
      imageName: null,
      imageDigest: null,
      queuedAt: new Date('2026-06-20T08:00:00.000Z'),
      submittedAt: new Date('2026-06-20T08:00:05.000Z'),
      startedAt: new Date('2026-06-20T08:00:10.000Z'),
      completedAt: new Date('2026-06-20T08:05:00.000Z'),
      durationMs: 290000,
      costEstimateUsd: null,
      costActualUsd: null,
      inputTokens: null,
      outputTokens: null,
      logPath: null,
      errorMessage: null,
      metadata: {
        backendSelected: 'fireworks',
        backendCompleted: true,
        backendOutputValidated: true,
        memoValidated: true,
        workerOutputValidated: true,
        fallbackEnabled: true,
        fallbackUsed: false,
        missingFactCount: 5,
        warningCount: 3,
        evidenceChecksUnresolved: true,
        companyHistoryRetrieved: true,
      },
      createdAt: new Date('2026-06-20T08:00:00.000Z'),
      updatedAt: new Date('2026-06-20T08:05:00.000Z'),
    },
  };
}

async function invokeRoute(options: {
  method: 'get' | 'post';
  path: RoutePath;
  runId: string;
  role?: 'OWNER' | 'ADMIN' | 'REVIEWER' | 'ANALYST' | 'VIEWER';
  email?: string;
  organizationId?: string;
  body?: Record<string, unknown>;
  deps?: ClassificationRunsRouterDeps;
}) {
  const router = createClassificationRunsRouter(options.deps);
  const layer = router.stack.find(
    (entry) =>
      entry.route?.path === options.path &&
      Boolean((entry.route as { methods?: Record<string, boolean> }).methods?.[options.method]),
  );
  const handler = layer?.route?.stack?.[0]?.handle;

  if (!handler) {
    throw new Error(`Could not find ${options.method.toUpperCase()} ${options.path} handler.`);
  }

  const req = {
    params: { id: options.runId },
    body: options.body ?? {},
    authContext: {
      organization: { id: options.organizationId ?? 'org_1' },
      membership: { role: options.role ?? 'OWNER' },
      user: { id: 'user_1', email: options.email ?? 'admin@substrata.dev' },
    },
  };
  const res = createMockResponse();

  await handler(req as never, res as never, () => undefined);
  return res;
}

test('only authorized admins can publish and unpublish demos', async () => {
  const original = [...env.publicDemoAdminEmails];
  env.publicDemoAdminEmails.splice(0, env.publicDemoAdminEmails.length, 'admin@substrata.dev');

  try {
    const forbidden = await invokeRoute({
      method: 'post',
      path: '/:id/publish-demo',
      runId: 'run_1',
      role: 'REVIEWER',
      deps: {
        publishDemo: async () => {
          throw new Error('should not execute');
        },
      },
      body: { confirmation: true },
    });
    assert.equal(forbidden.statusCode, 403);

    const allowed = await invokeRoute({
      method: 'post',
      path: '/:id/unpublish-demo',
      runId: 'run_1',
      role: 'ADMIN',
      email: 'admin@substrata.dev',
      deps: {
        unpublishDemo: async () => undefined as never,
      },
    });
    assert.equal(allowed.statusCode, 200);
  } finally {
    env.publicDemoAdminEmails.splice(0, env.publicDemoAdminEmails.length, ...original);
  }
});

test('publishing requires explicit confirmation at the request boundary', async () => {
  const original = [...env.publicDemoAdminEmails];
  env.publicDemoAdminEmails.splice(0, env.publicDemoAdminEmails.length, 'admin@substrata.dev');

  try {
    await assert.rejects(
      () =>
        invokeRoute({
          method: 'post',
          path: '/:id/publish-demo',
          runId: 'run_1',
          role: 'OWNER',
          email: 'admin@substrata.dev',
          deps: {
            publishDemo: async () => {
              throw new Error('should not execute');
            },
          },
          body: { confirmation: false },
        }),
      /Invalid literal value/,
    );
  } finally {
    env.publicDemoAdminEmails.splice(0, env.publicDemoAdminEmails.length, ...original);
  }
});

test('publishing status stays scoped to the authenticated organization run', async () => {
  const original = [...env.publicDemoAdminEmails];
  env.publicDemoAdminEmails.splice(0, env.publicDemoAdminEmails.length, 'admin@substrata.dev');

  try {
    const response = await invokeRoute({
      method: 'get',
      path: '/:id/demo-publication-status',
      runId: 'run_1',
      role: 'OWNER',
      email: 'admin@substrata.dev',
      deps: {
        getDemoStatus: async (organizationId, runId) =>
          organizationId === 'org_1' && runId === 'run_1'
            ? {
                canPublish: true,
                publishBlockTitle: null,
                publishBlockReason: null,
                isPublished: false,
                publishedAt: null,
                publicTitle: null,
                publicSummary: null,
                sourceDocumentDisplayName: null,
                canonicalUrl: '/classification-runs/run_1',
                activeDemoRunId: 'run_2',
                willReplaceActiveDemo: true,
              }
            : null,
      },
    });

    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.body, {
      canPublish: true,
      publishBlockTitle: null,
      publishBlockReason: null,
      isPublished: false,
      publishedAt: null,
      publicTitle: null,
      publicSummary: null,
      sourceDocumentDisplayName: null,
      canonicalUrl: '/classification-runs/run_1',
      activeDemoRunId: 'run_2',
      willReplaceActiveDemo: true,
    });
  } finally {
    env.publicDemoAdminEmails.splice(0, env.publicDemoAdminEmails.length, ...original);
  }
});

test('authorized members can download a private memo', async () => {
  const response = await invokeRoute({
    method: 'get',
    path: '/:id/memo/download',
    runId: 'run_1',
    deps: {
      getMemoDownload: async () =>
        ({
          content: '# Memo',
          filename: 'substrata-eccn-review-public-edge-accelerator.md',
        }) as never,
    },
  });

  assert.equal(response.statusCode, 200);
  assert.match(
    response.headers['Content-Disposition'] ?? '',
    /attachment; filename="substrata-eccn-review-public-edge-accelerator\.md"/,
  );
});

test('private memo download returns a structured 404 when the memo is missing', async () => {
  const response = await invokeRoute({
    method: 'get',
    path: '/:id/memo/download',
    runId: 'run_1',
    deps: {
      getMemoDownload: async () => {
        throw Object.assign(new Error('A memo has not been generated for this run yet.'), {
          statusCode: 404,
          details: { code: 'MEMO_NOT_FOUND' },
        });
      },
    },
  });

  assert.equal(response.statusCode, 404);
  assert.deepEqual(response.body, {
    error: {
      code: 'MEMO_NOT_FOUND',
      message: 'A memo has not been generated for this run yet.',
    },
  });
});

test('normal authenticated private-run access still works', async () => {
  const response = await invokeRoute({
    method: 'get',
    path: '/:id',
    runId: 'run_1',
    deps: {
      loadClassificationRun: async (organizationId, runId) =>
        organizationId === 'org_1' && runId === 'run_1'
          ? (createRun(runId, organizationId) as never)
          : null,
    },
  });

  assert.equal(response.statusCode, 200);
  assert.equal((response.body as { id: string }).id, 'run_1');
  assert.deepEqual(
    (response.body as { classificationTrace: { candidatesBlocked: string[]; finalFrontendCandidateCounts: { blocked: number } } }).classificationTrace.candidatesBlocked,
    ['5A002'],
  );
  assert.equal(
    (response.body as { classificationTrace: { finalFrontendCandidateCounts: { blocked: number } } }).classificationTrace.finalFrontendCandidateCounts.blocked,
    1,
  );
  assert.deepEqual(
    (response.body as { executionSummary: unknown }).executionSummary,
    {
      backendSelected: 'fireworks',
      backendCompleted: true,
      backendOutputValidated: true,
      memoValidated: true,
      workerOutputValidated: true,
      fallbackEnabled: true,
      fallbackUsed: false,
      missingFactCount: 5,
      warningCount: 3,
      evidenceChecksUnresolved: true,
      companyHistoryRetrieved: true,
      companyHistoryMatchCount: 0,
    },
  );
});
