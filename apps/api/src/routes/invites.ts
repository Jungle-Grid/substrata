import { Router } from 'express';
import { requireAuth, requireCsrf } from '../middleware/auth';
import { acceptWorkspaceInvite } from '../services/auth.service';

export const invitesRouter = Router();

invitesRouter.post(
  '/:token/accept',
  requireCsrf,
  requireAuth,
    async (req, res) => {
    const invite = await acceptWorkspaceInvite({
      token: String(req.params.token),
      userId: req.authContext!.user.id,
      sessionId: req.authContext!.session.id,
    });

    res.json({
      ok: true,
      organizationId: invite.organizationId,
    });
  },
);
