import type { ECCNCandidateRecord } from './types';

export function groupCandidates(candidates: ECCNCandidateRecord[]) {
  return {
    reviewCandidates: candidates.filter(
      (candidate) =>
        !candidate.candidateType || candidate.candidateType === 'review_candidate',
    ),
    fallbackCandidates: candidates.filter(
      (candidate) => candidate.candidateType === 'fallback_candidate',
    ),
    blockedCandidates: candidates.filter(
      (candidate) => candidate.candidateType === 'blocked_candidate',
    ),
    excludedCandidates: candidates.filter(
      (candidate) => candidate.candidateType === 'excluded_candidate',
    ),
  };
}
