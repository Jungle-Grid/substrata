import assert from 'node:assert/strict';
import test from 'node:test';
import type { ECCNCandidateRecord, ReviewPathRecord } from './types';
import { eligibleCandidateState, selectOpenReviewPaths } from './review-path-summary';

const path = (title: string): ReviewPathRecord => ({
  id: title,
  title,
  scope: 'Technical comparison',
  type: 'technical_risk',
  status: 'open',
  whyTriggered: 'Relevant technical facts require comparison.',
  missingInformation: ['Configuration details'],
  reviewerQuestions: [],
  supportingFacts: [],
  regulatoryCitations: [],
});

const candidate = (candidateType: ECCNCandidateRecord['candidateType']): ECCNCandidateRecord => ({
  id: `candidate-${candidateType ?? 'eligible'}`,
  eccn: '3A001',
  title: 'Specified electronic items',
  officialTitle: 'Specified electronic items',
  status: 'review_required',
  confidence: 'medium',
  controlCriteria: [],
  factMappings: [],
  matchedTechnicalFacts: [],
  regulatoryCitations: [],
  whyItMayApply: 'Technical facts warrant comparison.',
  whyItMayNotApply: 'Threshold mapping remains open.',
  mayApplyReasons: [],
  mayNotApplyReasons: [],
  missingInformation: [],
  uncertaintyFlags: [],
  reviewerQuestions: [],
  alternativeCandidates: [],
  isSpecificEccn: true,
  candidateType,
});

test('keeps two open review paths visible when no ECCN candidate is eligible', () => {
  const paths = selectOpenReviewPaths([path('Advanced computing review path'), path('Security and cryptography review path')]);

  assert.equal(paths.length, 2);
  assert.equal(eligibleCandidateState([]), 'no_eligible_candidates');
});

test('keeps a path that needs more evidence in the canonical open-path collection', () => {
  const needsEvidence = { ...path('Security and cryptography review path'), status: 'needs_more_evidence' as const };

  assert.equal(selectOpenReviewPaths([needsEvidence]).length, 1);
});

test('reports no open paths and no eligible ECCN candidates separately', () => {
  const paths = selectOpenReviewPaths([]);

  assert.equal(paths.length, 0);
  assert.equal(eligibleCandidateState([]), 'no_eligible_candidates');
});

test('distinguishes blocked hypotheses from eligible ECCN candidates', () => {
  const paths = selectOpenReviewPaths([path('Advanced computing review path'), path('Security and cryptography review path')]);

  assert.equal(paths.length, 2);
  assert.equal(
    eligibleCandidateState([candidate('blocked_candidate')]),
    'blocked_or_unsupported_candidates',
  );
});

test('reports an eligible ECCN candidate independently from two open paths', () => {
  const paths = selectOpenReviewPaths([path('Advanced computing review path'), path('Security and cryptography review path')]);

  assert.equal(paths.length, 2);
  assert.equal(
    eligibleCandidateState([candidate('review_candidate')]),
    'eligible_candidates',
  );
});
