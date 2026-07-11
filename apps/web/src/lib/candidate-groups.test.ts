import assert from 'node:assert/strict';
import test from 'node:test';
import type { ECCNCandidateRecord } from './types';
import { groupCandidates } from './candidate-groups';

function candidate(eccn: string, candidateType?: ECCNCandidateRecord['candidateType']) {
  return { eccn, candidateType } as ECCNCandidateRecord;
}

test('candidate groups keep review, fallback, and blocked semantics separate', () => {
  const grouped = groupCandidates([
    candidate('3A090', 'review_candidate'),
    candidate('4A090', 'review_candidate'),
    candidate('3A991', 'fallback_candidate'),
    candidate('5A002', 'blocked_candidate'),
  ]);

  assert.deepEqual(grouped.reviewCandidates.map((item) => item.eccn), ['3A090', '4A090']);
  assert.deepEqual(grouped.fallbackCandidates.map((item) => item.eccn), ['3A991']);
  assert.deepEqual(grouped.blockedCandidates.map((item) => item.eccn), ['5A002']);
});

test('legacy candidates remain visible as review candidates', () => {
  const grouped = groupCandidates([candidate('3A001')]);
  assert.deepEqual(grouped.reviewCandidates.map((item) => item.eccn), ['3A001']);
});
