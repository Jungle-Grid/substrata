import { parse } from 'cookie';
import type { NextFunction, Request, Response } from 'express';
import type { MembershipRole } from '@substrata/db';
import { HttpError } from '../lib/errors';
import { canReadWorkspace, hasRole } from '../lib/authz';
import { hashOpaqueToken } from '../lib/security';
import { recordAuditEvent } from '../services/audit.service';
import {
  loadAuthenticatedSession,
  rotateSessionCsrf,
  type AuthenticatedSession,
} from '../services/auth.service';

function readCookies(req: Request) {
  return parse(req.headers.cookie ?? '');
}

function getMembership(session: AuthenticatedSession) {
  return (
    session.user.memberships.find(
      (membership) => membership.organizationId === session.organizationId,
    ) ?? null
  );
}

export async function sessionMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  const cookies = readCookies(req);
  const rawSessionToken = cookies[process.env.SESSION_COOKIE_NAME ?? 'substrata_session'];

  if (!rawSessionToken) {
    return next();
  }

  const session = await loadAuthenticatedSession(rawSessionToken);
  if (!session) {
    return next();
  }

  const membership = getMembership(session);
  if (!membership || !canReadWorkspace(membership.role)) {
    return next(new HttpError(403, 'Workspace access is not available for this account.'));
  }

  req.authContext = {
    session,
    organization: session.organization,
    membership,
    user: session.user,
  };

  return next();
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  if (!req.authContext) {
    return next(new HttpError(401, 'Authentication is required.'));
  }

  return next();
}

// export function requireVerifiedEmail(
//   req: Request,
//   _res: Response,
//   next: NextFunction,
// ) {
//   // if (!req.authContext?.user.emailVerifiedAt) {
//   //   return next(new HttpError(403, 'Verify your email before accessing workspace data.'));
//   // }

//   return next();
// }

export function requireRole(roles: MembershipRole[]) {
  return async function roleMiddleware(
    req: Request,
    _res: Response,
    next: NextFunction,
  ) {
    if (!req.authContext) {
      return next(new HttpError(401, 'Authentication is required.'));
    }

    if (!hasRole(req.authContext.membership.role, roles)) {
      await recordAuditEvent({
        organizationId: req.authContext.organization.id,
        actorUserId: req.authContext.user.id,
        actor: 'user',
        action: 'access.denied',
        entityType: 'Organization',
        entityId: req.authContext.organization.id,
        metadata: {
          requiredRoles: roles,
          actualRole: req.authContext.membership.role,
          path: req.originalUrl,
          method: req.method,
        },
      });
      return next(new HttpError(403, 'You do not have access to this action.'));
    }

    return next();
  };
}

export async function requireCsrf(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  const cookies = readCookies(req);
  const csrfCookie = cookies[`${process.env.SESSION_COOKIE_NAME ?? 'substrata_session'}_csrf`];
  const csrfHeader = req.headers['x-csrf-token'];

  if (
    !csrfCookie ||
    typeof csrfHeader !== 'string' ||
    csrfHeader.length < 20 ||
    csrfHeader !== csrfCookie
  ) {
    return next(new HttpError(403, 'CSRF validation failed.'));
  }

  if (req.authContext?.session) {
    if (req.authContext.session.csrfTokenHash !== hashOpaqueToken(csrfHeader)) {
      const rotatedCsrf = await rotateSessionCsrf(req.authContext.session.id);
      req.res?.setHeader('x-substrata-csrf-refresh', rotatedCsrf);
      return next(new HttpError(403, 'CSRF validation failed.'));
    }
  }

  return next();
}
