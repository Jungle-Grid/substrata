import assert from 'node:assert/strict';
import test from 'node:test';
import { getExecutionNotice } from './execution-status';
import type { ClassificationRunRecord } from './types';

function run(
  overrides: Partial<ClassificationRunRecord> = {},
): ClassificationRunRecord {
  return {
    id: 'run_1',
    status: 'completed',
    workflowState: 'awaiting_reviewer_assignment',
    workflowLabel: 'Completed analysis',
    uncertaintyFlags: [],
    requiresHumanReview: true,
    extractedSpecs: [],
    factIssues: [],
    reviewPaths: [],
    eccnCandidates: [],
    humanReviews: [],
    reviewerActions: [],
    humanReviewStatus: 'pending_review',
    hasReviewerConclusion: false,
    document: { id: 'doc_1', title: 'AX920', fileName: 'AX920.pdf' },
    ...overrides,
  };
}

const completed = {
  backendCompleted: true,
  backendOutputValidated: true,
  memoValidated: true,
  fallbackEnabled: true,
  fallbackUsed: false,
  missingFactCount: 3,
  warningCount: 1,
  evidenceChecksUnresolved: true,
  companyHistoryRetrieved: true,
  companyHistoryMatchCount: 23,
};

test('backend completed with warnings requires expert review', () => {
  const notice = getExecutionNotice(run({ executionSummary: completed }));
  assert.equal(notice.title, 'Expert review required');
  assert.doesNotMatch(notice.body, /fallback|could not verify/i);
});

test('fallback enabled but not used does not show fallback warning', () => {
  const notice = getExecutionNotice(run({ executionSummary: completed }));
  assert.notEqual(notice.title, 'Fallback analysis used');
});

test('fallback used shows fallback analysis warning', () => {
  const notice = getExecutionNotice(
    run({
      executionSummary: {
        ...completed,
        fallbackUsed: true,
        evidenceChecksUnresolved: false,
      },
    }),
  );
  assert.equal(notice.title, 'Fallback analysis used');
});

test('backend failure shows backend verification warning', () => {
  const notice = getExecutionNotice(
    run({
      status: 'needs_attention',
      executionSummary: {
        ...completed,
        backendCompleted: false,
        backendOutputValidated: false,
        memoValidated: false,
      },
    }),
  );
  assert.equal(notice.title, 'Backend verification incomplete');
});

test('company history retrieval does not change execution status', () => {
  const notice = getExecutionNotice(run({ executionSummary: completed }));
  assert.equal(notice.title, 'Expert review required');
  assert.equal(completed.companyHistoryMatchCount, 23);
});
