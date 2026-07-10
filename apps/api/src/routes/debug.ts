import { Router } from 'express';
import { canManageWorkspace } from '../lib/authz';
import { HttpError } from '../lib/errors';
import { getWorkspaceHistoryStatus } from '../services/workspace-history-debug.service';

export const debugRouter = Router();

debugRouter.get('/workspace-history-status', async (req, res) => {
  const { organization, membership, user } = req.authContext!;
  if (!canManageWorkspace(membership.role)) {
    throw new HttpError(403, 'Only workspace owners and admins can inspect workspace history diagnostics.');
  }

  const status = await getWorkspaceHistoryStatus({
    organizationId: organization.id,
    currentUserId: user.id,
  });
  console.info('Workspace Company History diagnostics requested', {
    currentUserId: user.id,
    organizationId: organization.id,
    workspaceId: organization.id,
    referenceFileCount: status.counts.reference_files,
    indexedChunkCount: status.counts.indexed_chunks,
    latestReviewOrgMatchesReferenceOrg: status.latest_review_org_matches_reference_org,
  });
  return res.json(status);
});
