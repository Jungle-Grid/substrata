import { Router } from 'express';
import {
  inviteCreateSchema,
  onboardingSchema,
  organizationUpdateSchema,
} from '@substrata/shared';
import { canManageTeam, canManageWorkspace } from '../lib/authz';
import { HttpError } from '../lib/errors';
import { parseBody } from '../lib/http';
import { requireAuth, requireCsrf, requireVerifiedEmail } from '../middleware/auth';
import {
  completeOnboarding,
  createWorkspaceInvite,
  listCurrentOrganizationInvites,
  listCurrentOrganizationMembers,
  updateCurrentOrganization,
} from '../services/auth.service';
import { assertRateLimit } from '../services/rate-limit.service';

export const organizationsRouter = Router();

organizationsRouter.get('/current', requireAuth, requireVerifiedEmail, async (req, res) => {
  res.json({
    organization: req.authContext!.organization,
    membership: req.authContext!.membership,
  });
});

organizationsRouter.patch(
  '/current',
  requireCsrf,
  requireAuth,
  requireVerifiedEmail,
  async (req, res) => {
    if (!canManageWorkspace(req.authContext!.membership.role)) {
      throw new HttpError(403, 'You do not have access to workspace settings.');
    }

    const input = parseBody(organizationUpdateSchema, req);
    const organization = await updateCurrentOrganization({
      organizationId: req.authContext!.organization.id,
      actorUserId: req.authContext!.user.id,
      name: input.name,
      industry: input.industry,
    });
    res.json({ organization });
  },
);

organizationsRouter.post(
  '/current/onboarding',
  requireCsrf,
  requireAuth,
  requireVerifiedEmail,
  async (req, res) => {
    const input = parseBody(onboardingSchema, req);
    const result = await completeOnboarding({
      userId: req.authContext!.user.id,
      organizationId: req.authContext!.organization.id,
      organizationName: input.organizationName,
      industry: input.industry,
    });

    res.json({ ok: true, organization: result.organization });
  },
);

organizationsRouter.get(
  '/current/members',
  requireAuth,
  requireVerifiedEmail,
  async (req, res) => {
    const [members, invites] = await Promise.all([
      listCurrentOrganizationMembers(req.authContext!.organization.id),
      listCurrentOrganizationInvites(req.authContext!.organization.id),
    ]);

    res.json({
      members: members.map((membership) => ({
        id: membership.id,
        role: membership.role,
        createdAt: membership.createdAt,
        user: {
          id: membership.user.id,
          name: membership.user.name,
          email: membership.user.email,
          emailVerifiedAt: membership.user.emailVerifiedAt,
        },
      })),
      invites: invites.map((invite) => ({
        id: invite.id,
        email: invite.email,
        role: invite.role,
        createdAt: invite.createdAt,
        expiresAt: invite.expiresAt,
        acceptedAt: invite.acceptedAt,
        revokedAt: invite.revokedAt,
        invitedBy: {
          id: invite.invitedByUser.id,
          name: invite.invitedByUser.name,
        },
        acceptedBy: invite.acceptedByUser
          ? {
              id: invite.acceptedByUser.id,
              name: invite.acceptedByUser.name,
            }
          : null,
      })),
    });
  },
);

organizationsRouter.post(
  '/current/invites',
  requireCsrf,
  requireAuth,
  requireVerifiedEmail,
  async (req, res) => {
    if (!canManageTeam(req.authContext!.membership.role)) {
      throw new HttpError(403, 'You do not have access to invite teammates.');
    }

    const input = parseBody(inviteCreateSchema, req);
    assertRateLimit({
      key: `workspace-invite:${req.authContext!.organization.id}:${req.authContext!.user.id}`,
      limit: 25,
      windowMs: 60 * 60 * 1000,
    });

    const invite = await createWorkspaceInvite({
      organizationId: req.authContext!.organization.id,
      invitedByUserId: req.authContext!.user.id,
      inviterName: req.authContext!.user.name,
      organizationName: req.authContext!.organization.name,
      email: input.email,
      role: input.role ?? 'REVIEWER',
    });

    res.status(201).json({
      invite: {
        id: invite.id,
        email: invite.email,
        role: invite.role,
        createdAt: invite.createdAt,
        expiresAt: invite.expiresAt,
      },
    });
  },
);
