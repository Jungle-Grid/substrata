import { groupCandidates } from './candidate-groups';
import type { ECCNCandidateRecord, ReviewPathRecord } from './types';

export function selectOpenReviewPaths(paths: ReviewPathRecord[]) {
  // Canonical decisions keep a path open while it needs evidence or escalation;
  // only a reviewer-resolved or reviewer-excluded path is no longer open.
  return paths.filter(
    (path) =>
      path.status !== 'resolved' && path.status !== 'excluded_by_reviewer',
  );
}

export type EligibleCandidateState =
  | 'eligible_candidates'
  | 'no_eligible_candidates'
  | 'blocked_or_unsupported_candidates';

export function eligibleCandidateState(
  candidates: ECCNCandidateRecord[],
): EligibleCandidateState {
  const { reviewCandidates, blockedCandidates, fallbackCandidates } =
    groupCandidates(candidates);

  if (reviewCandidates.length) return 'eligible_candidates';
  if (blockedCandidates.length || fallbackCandidates.length) {
    return 'blocked_or_unsupported_candidates';
  }

  return 'no_eligible_candidates';
}
