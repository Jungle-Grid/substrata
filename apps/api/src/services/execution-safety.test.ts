import assert from 'node:assert/strict';
import test from 'node:test';
import {
  determineExecutionCompletion,
  getPublicDemoEligibility,
} from './classification.service';
import { hasVerifiedSpecificCandidateEvidence } from './presenters';
import { isValidClassificationStatusTransition } from './classification-integrity';

test('heuristic fallback cannot be completed', () => {
  const result = determineExecutionCompletion({
    classificationMode: 'heuristic_fallback',
    backendStatus: 'completed',
    validationIssues: [],
  });
  assert.equal(result.status, 'needs_attention');
  assert.equal(result.fallbackUsed, true);
  assert.equal(result.validationStatus, 'warnings');
});

test('validated backend output is completed only when schema checks pass', () => {
  const result = determineExecutionCompletion({
    classificationMode: 'backend_assisted',
    backendStatus: 'completed',
    validationIssues: [],
  });
  assert.equal(result.status, 'completed');
  assert.equal(result.validationStatus, 'passed');
});

test('unverified ECCN evidence is hidden from specific-candidate presentation', () => {
  assert.equal(
    hasVerifiedSpecificCandidateEvidence({
      eccn: '3A001',
      isSpecificEccn: true,
      paragraphReference: null,
      controlCriteria: [],
      regulationSource: {
        verificationStatus: 'needs_verification',
        regulationVersion: null,
        lastVerifiedAt: null,
      },
      factMappings: [],
      citations: [],
    }),
    false,
  );
});

test('fallback and unverified public runs are not eligible for demo publication', () => {
  const result = getPublicDemoEligibility({
    status: 'needs_attention',
    completedAt: new Date(),
    fallbackUsed: true,
    validationStatus: 'warnings',
    hasMemo: true,
    hasExternalJobId: false,
    documentOrigin: 'public',
    documentVisibility: 'organization',
  });
  assert.equal(result.eligible, false);
  assert.match(result.reason ?? '', /completed|Fallback/);
});

test('queued execution follows an explicit status transition path', () => {
  assert.equal(
    isValidClassificationStatusTransition('queued', 'running'),
    true,
  );
  assert.equal(
    isValidClassificationStatusTransition('running', 'completed'),
    true,
  );
  assert.equal(
    isValidClassificationStatusTransition('completed', 'running'),
    false,
  );
});
