import assert from 'node:assert/strict';
import test from 'node:test';
import {
  deriveReviewStatus,
  isValidSpecificEccn,
  validateNarrativeConsistency,
} from './classification-integrity';

test('ECCN validation rejects broad review categories', () => {
  assert.equal(isValidSpecificEccn('3A991'), true);
  assert.equal(isValidSpecificEccn('5A992.c'), true);
  assert.equal(isValidSpecificEccn('Category 3'), false);
  assert.equal(isValidSpecificEccn('Category 5 Part 2'), false);
  assert.equal(isValidSpecificEccn('EAR99'), false);
});

test('narrative validation rejects contradictory cryptography absence claims', () => {
  const issues = validateNarrativeConsistency({
    extractedFacts: [
      { id: 'fact_1', classificationRunId: 'run_1', name: 'cryptographic_algorithm' },
      { id: 'fact_2', classificationRunId: 'run_1', name: 'secure_boot' },
    ],
    capabilitySignals: [
      {
        key: 'hasCryptography',
        detected: true,
        confidence: 'high',
        summary: 'Cryptographic functionality was identified.',
        supportingFactIds: ['fact_1'],
        supportingCitationIds: ['cit_1'],
      },
      {
        key: 'hasSecureBoot',
        detected: true,
        confidence: 'high',
        summary: 'Secure boot was identified.',
        supportingFactIds: ['fact_2'],
        supportingCitationIds: ['cit_2'],
      },
    ],
    uncertaintyFlags: ['crypto_relevance_requires_qualified_review'],
    reviewPaths: [],
    eccnCandidates: [],
    memoSections: [
      {
        key: 'memo',
        content: 'No cryptographic features were identified. Security functionality was not found.',
      },
    ],
    citations: [{ id: 'cit_1', sourceTitle: 'Security review path', classificationRunId: 'run_1' }],
  });

  assert.ok(issues.some((issue) => issue.code === 'CRYPTO_NARRATIVE_CONTRADICTION'));
  assert.ok(issues.some((issue) => issue.code === 'SECURE_BOOT_NARRATIVE_CONTRADICTION'));
});

test('narrative validation allows cautious absence language when crypto is not detected', () => {
  const issues = validateNarrativeConsistency({
    extractedFacts: [{ id: 'fact_1', classificationRunId: 'run_1', name: 'product_family' }],
    capabilitySignals: [
      {
        key: 'hasCryptography',
        detected: false,
        confidence: 'low',
        summary: 'Cryptographic functionality was not identified in the reviewed source material.',
        supportingFactIds: [],
        supportingCitationIds: [],
      },
    ],
    uncertaintyFlags: [],
    reviewPaths: [],
    eccnCandidates: [],
    memoSections: [
      {
        key: 'memo',
        content: 'Cryptographic functionality was not identified in the reviewed source material.',
      },
    ],
    citations: [],
  });

  assert.equal(issues.length, 0);
});

test('review status keeps completed analysis separate from expert review state', () => {
  const pending = deriveReviewStatus(null, true);
  assert.equal(pending.code, 'review_required');
  assert.equal(pending.detail, 'Expert review required before classification sign-off');

  const underReview = deriveReviewStatus(
    {
      status: 'pending_review',
      workflowState: 'in_technical_review',
      claimedAt: new Date('2026-06-30T12:00:00.000Z'),
      reviewedAt: null,
    },
    true,
  );
  assert.equal(underReview.code, 'under_review');

  const approved = deriveReviewStatus(
    {
      status: 'approved',
      workflowState: 'approved_for_internal_use',
      claimedAt: new Date('2026-06-30T12:00:00.000Z'),
      reviewedAt: new Date('2026-06-30T14:00:00.000Z'),
    },
    true,
  );
  assert.equal(approved.code, 'approved');
  assert.equal(approved.detail, 'Reviewer sign-off recorded');
});
