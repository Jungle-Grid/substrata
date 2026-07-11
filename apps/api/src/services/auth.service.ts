import crypto from 'node:crypto';
import {
  MembershipRole,
  OAuthProvider,
  prisma,
  type Membership,
  type Organization,
  type Session,
  type User,
} from '@substrata/db';
import { env } from '../config/env';
import { HttpError } from '../lib/errors';
import {
  addDays,
  addHours,
  defaultWorkspaceName,
  generateOpaqueToken,
  hashOpaqueToken,
  hashPassword,
  normalizeEmail,
  slugifyOrganizationName,
  verifyPassword,
} from '../lib/security';
import { recordAuditEvent } from './audit.service';
import { getTransactionalEmailService } from './email';
import { EmailDeliveryError } from './email/types';
const SESSION_TTL_DAYS = 14;
const EMAIL_VERIFICATION_TTL_HOURS = 24;
const PASSWORD_RESET_TTL_HOURS = 1;

type SessionActorInput = {
  ipAddress?: string;
  userAgent?: string;
};

type AuthenticatedSession = Session & {
  user: User & {
    memberships: Array<Membership & { organization: Organization }>;
    passwordCredential: { passwordHash: string } | null;
    oauthIdentities: Array<{ provider: OAuthProvider }>;
  };
  organization: Organization;
};

export function buildVerificationUrl(rawToken: string) {
  return `${env.appUrl}/verify-email?token=${encodeURIComponent(rawToken)}`;
}

export function buildResetUrl(rawToken: string) {
  return `${env.appUrl}/reset-password?token=${encodeURIComponent(rawToken)}`;
}

function buildInviteUrl(rawToken: string) {
  return `${env.appUrl}/sign-in?invite=${encodeURIComponent(rawToken)}`;
}

async function generateUniqueSlug(baseName: string) {
  const baseSlug = slugifyOrganizationName(baseName) || 'workspace';

  for (let index = 0; index < 20; index += 1) {
    const candidate =
      index === 0 ? baseSlug : `${baseSlug}-${crypto.randomInt(1000, 9999)}`;
    const existing = await prisma.organization.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });
    if (!existing) {
      return candidate;
    }
  }

  return `${baseSlug}-${generateOpaqueToken(6).toLowerCase()}`;
}

async function issueEmailVerificationToken(user: User) {
  await prisma.emailVerificationToken.deleteMany({
    where: {
      userId: user.id,
      consumedAt: null,
    },
  });

  const rawToken = generateOpaqueToken();
  await prisma.emailVerificationToken.create({
    data: {
      userId: user.id,
      tokenHash: hashOpaqueToken(rawToken),
      expiresAt: addHours(new Date(), EMAIL_VERIFICATION_TTL_HOURS),
    },
  });

  return rawToken;
}

async function issuePasswordResetToken(user: User) {
  await prisma.passwordResetToken.deleteMany({
    where: {
      userId: user.id,
      consumedAt: null,
    },
  });

  const rawToken = generateOpaqueToken();
  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash: hashOpaqueToken(rawToken),
      expiresAt: addHours(new Date(), PASSWORD_RESET_TTL_HOURS),
    },
  });

  return rawToken;
}

function getPrimaryMembership(
  memberships: Array<Membership & { organization: Organization }>,
  organizationId?: string,
) {
  return (
    memberships.find((membership) => membership.organizationId === organizationId) ??
    memberships[0] ??
    null
  );
}

export async function createSessionForUser(input: {
  userId: string;
  organizationId: string;
  actor: SessionActorInput;
  rotatedFromId?: string;
}) {
  const rawSessionToken = generateOpaqueToken();
  const rawCsrfToken = generateOpaqueToken();

  const session = await prisma.session.create({
    data: {
      userId: input.userId,
      organizationId: input.organizationId,
      tokenHash: hashOpaqueToken(rawSessionToken),
      csrfTokenHash: hashOpaqueToken(rawCsrfToken),
      expiresAt: addDays(new Date(), SESSION_TTL_DAYS),
      ipAddress: input.actor.ipAddress,
      userAgent: input.actor.userAgent,
      rotatedFromId: input.rotatedFromId,
    },
  });

  return {
    session,
    rawSessionToken,
    rawCsrfToken,
  };
}

export async function revokeSessionById(sessionId: string) {
  await prisma.session.updateMany({
    where: {
      id: sessionId,
      revokedAt: null,
    },
    data: {
      revokedAt: new Date(),
    },
  });
}

export async function revokeAllUserSessions(userId: string) {
  await prisma.session.updateMany({
    where: {
      userId,
      revokedAt: null,
    },
    data: {
      revokedAt: new Date(),
    },
  });
}

export async function loadAuthenticatedSession(rawToken: string) {
  const tokenHash = hashOpaqueToken(rawToken);
  const session = await prisma.session.findFirst({
    where: {
      tokenHash,
      revokedAt: null,
      expiresAt: {
        gt: new Date(),
      },
    },
    include: {
      organization: true,
      user: {
        include: {
          passwordCredential: {
            select: { passwordHash: true },
          },
          oauthIdentities: {
            select: { provider: true },
          },
          memberships: {
            include: {
              organization: true,
            },
            orderBy: {
              createdAt: 'asc',
            },
          },
        },
      },
    },
  });

  if (!session) {
    return null;
  }

  await prisma.session.update({
    where: { id: session.id },
    data: { lastAccessedAt: new Date() },
  });

  return session as AuthenticatedSession;
}

export async function rotateSessionOrganization(input: {
  sessionId: string;
  organizationId: string;
}) {
  await prisma.session.update({
    where: { id: input.sessionId },
    data: {
      organizationId: input.organizationId,
    },
  });
}

export async function rotateSessionCsrf(sessionId: string) {
  const rawCsrfToken = generateOpaqueToken();
  await prisma.session.update({
    where: { id: sessionId },
    data: {
      csrfTokenHash: hashOpaqueToken(rawCsrfToken),
    },
  });

  return rawCsrfToken;
}

export async function signUpWithPassword(input: {
  name: string;
  email: string;
  password: string;
}) {
  const email = normalizeEmail(input.email);
  const existing = await prisma.user.findUnique({
    where: { email },
    include: {
      passwordCredential: true,
      oauthIdentities: true,
    },
  });

  if (existing?.passwordCredential) {
    throw new HttpError(409, 'An account already exists for that email.');
  }

  if (existing?.oauthIdentities.length) {
    throw new HttpError(
      409,
      'That email is already registered with another sign-in method.',
    );
  }

  const passwordHash = await hashPassword(input.password);
  const organizationName = defaultWorkspaceName(input.name);
  const organizationSlug = await generateUniqueSlug(organizationName);

  const { user, organization } = await prisma.$transaction(async (tx) => {
    const organization = await tx.organization.create({
      data: {
        name: organizationName,
        slug: organizationSlug,
      },
    });

    const user = await tx.user.create({
      data: {
        email,
        name: input.name.trim(),
      },
    });
    await tx.passwordCredential.create({
      data: {
        userId: user.id,
        passwordHash,
      },
    });

    await tx.membership.create({
      data: {
        organizationId: organization.id,
        userId: user.id,
        role: MembershipRole.OWNER,
      },
    });

    return { user, organization };
  });

  const verificationToken = await issueEmailVerificationToken(user);

  try {
    await getTransactionalEmailService().sendVerificationEmail({
      to: user.email,
      name: user.name,
      verificationUrl: buildVerificationUrl(verificationToken),
      expiresInText: 'in 24 hours',
      clientReference: `auth.verify_email:${user.id}`,
    });
  } catch (error) {
    await recordAuditEvent({
      organizationId: organization.id,
      actorUserId: user.id,
      actor: 'system',
      action: 'auth.verification_email.failed',
      entityType: 'User',
      entityId: user.id,
      metadata: {
        reason:
          error instanceof EmailDeliveryError
            ? error.code ?? error.message
            : 'mail delivery failed',
      },
    });

    throw new HttpError(
      503,
      'Verification email could not be sent. Try again shortly.',
    );
  }

  await recordAuditEvent({
    organizationId: organization.id,
    actorUserId: user.id,
    actor: 'user',
    action: 'auth.sign_up.completed',
    entityType: 'User',
    entityId: user.id,
    metadata: {
      email: user.email,
      method: 'password',
    },
  });

  await recordAuditEvent({
    organizationId: organization.id,
    actorUserId: user.id,
    actor: 'system',
    action: 'organization.created',
    entityType: 'Organization',
    entityId: organization.id,
    metadata: {
      name: organization.name,
    },
  });

  return {
    user,
    organization,
  };
}

export async function resendVerificationEmail(emailInput: string) {
  const email = normalizeEmail(emailInput);
  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      memberships: {
        include: {
          organization: true,
        },
        orderBy: {
          createdAt: 'asc',
        },
      },
    },
  });

  if (!user || user.emailVerifiedAt) {
    return;
  }

  const primaryMembership = getPrimaryMembership(user.memberships);
  if (!primaryMembership) {
    return;
  }

  const verificationToken = await issueEmailVerificationToken(user);

  try {
    await getTransactionalEmailService().sendVerificationEmail({
      to: user.email,
      name: user.name,
      verificationUrl: buildVerificationUrl(verificationToken),
      expiresInText: 'in 24 hours',
      clientReference: `auth.verify_email_resend:${user.id}`,
    });
  } catch (error) {
    await recordAuditEvent({
      organizationId: primaryMembership.organizationId,
      actorUserId: user.id,
      actor: 'system',
      action: 'auth.verification_email.failed',
      entityType: 'User',
      entityId: user.id,
      metadata: {
        reason:
          error instanceof EmailDeliveryError
            ? error.code ?? error.message
            : 'mail delivery failed',
      },
    });

    if (env.isProduction) {
      throw new HttpError(
        503,
        'Verification email could not be sent. Try again shortly.',
      );
    }
  }
}

export async function verifyEmailToken(input: {
  token: string;
  actor: SessionActorInput;
}) {
  const token = await prisma.emailVerificationToken.findFirst({
    where: {
      tokenHash: hashOpaqueToken(input.token),
      consumedAt: null,
      expiresAt: {
        gt: new Date(),
      },
    },
    include: {
      user: {
        include: {
          memberships: {
            include: {
              organization: true,
            },
            orderBy: {
              createdAt: 'asc',
            },
          },
        },
      },
    },
  });

  if (!token) {
    throw new HttpError(400, 'That verification link is invalid or expired.');
  }

  const membership = getPrimaryMembership(token.user.memberships);
  if (!membership) {
    throw new HttpError(400, 'No workspace membership is available for this user.');
  }

  await prisma.$transaction(async (tx) => {
    await tx.emailVerificationToken.update({
      where: { id: token.id },
      data: {
        consumedAt: new Date(),
      },
    });

    await tx.emailVerificationToken.updateMany({
      where: {
        userId: token.userId,
        consumedAt: null,
      },
      data: {
        consumedAt: new Date(),
      },
    });

    await tx.user.update({
      where: { id: token.userId },
      data: {
        emailVerifiedAt: new Date(),
      },
    });
  });

  const createdSession = await createSessionForUser({
    userId: token.userId,
    organizationId: membership.organizationId,
    actor: input.actor,
  });

  await recordAuditEvent({
    organizationId: membership.organizationId,
    actorUserId: token.userId,
    actor: 'user',
    action: 'auth.email_verified',
    entityType: 'User',
    entityId: token.userId,
    metadata: {
      email: token.user.email,
    },
  });

  return {
    session: createdSession,
    organization: membership.organization,
    user: token.user,
  };
}

export async function signInWithPassword(input: {
  email: string;
  password: string;
  actor: SessionActorInput;
}) {
  const email = normalizeEmail(input.email);
  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      passwordCredential: true,
      memberships: {
        include: {
          organization: true,
        },
        orderBy: {
          createdAt: 'asc',
        },
      },
    },
  });

  if (!user?.passwordCredential) {
    throw new HttpError(401, 'Invalid email or password.');
  }

  const isValid = await verifyPassword(
    input.password,
    user.passwordCredential.passwordHash,
  );
  if (!isValid) {
    throw new HttpError(401, 'Invalid email or password.');
  }

  if (!user.emailVerifiedAt) {
    throw new HttpError(403, 'Verify your email before accessing workspace data.');
  }

  const membership = getPrimaryMembership(user.memberships);
  if (!membership) {
    throw new HttpError(403, 'No workspace membership is available for this user.');
  }

  const createdSession = await createSessionForUser({
    userId: user.id,
    organizationId: membership.organizationId,
    actor: input.actor,
  });

  await recordAuditEvent({
    organizationId: membership.organizationId,
    actorUserId: user.id,
    actor: 'user',
    action: 'auth.sign_in.completed',
    entityType: 'Session',
    entityId: createdSession.session.id,
    metadata: {
      method: 'password',
    },
  });

  return {
    session: createdSession,
    user,
    organization: membership.organization,
  };
}

export async function requestPasswordReset(emailInput: string) {
  const email = normalizeEmail(emailInput);
  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      passwordCredential: true,
      memberships: {
        include: {
          organization: true,
        },
        orderBy: {
          createdAt: 'asc',
        },
      },
    },
  });

  if (!user?.passwordCredential) {
    return;
  }

  const membership = getPrimaryMembership(user.memberships);
  if (!membership) {
    return;
  }

  const resetToken = await issuePasswordResetToken(user);

  try {
    await getTransactionalEmailService().sendPasswordResetEmail({
      to: user.email,
      name: user.name,
      resetUrl: buildResetUrl(resetToken),
      expiresInText: 'in 1 hour',
      clientReference: `auth.password_reset:${user.id}`,
    });
  } catch (error) {
    await recordAuditEvent({
      organizationId: membership.organizationId,
      actorUserId: user.id,
      actor: 'system',
      action: 'auth.password_reset_email.failed',
      entityType: 'User',
      entityId: user.id,
      metadata: {
        reason:
          error instanceof EmailDeliveryError
            ? error.code ?? error.message
            : 'mail delivery failed',
      },
    });

    if (env.isProduction) {
      throw new HttpError(
        503,
        'Password reset email could not be sent. Try again shortly.',
      );
    }
  }
}

export async function resetPassword(input: {
  token: string;
  password: string;
}) {
  const resetToken = await prisma.passwordResetToken.findFirst({
    where: {
      tokenHash: hashOpaqueToken(input.token),
      consumedAt: null,
      expiresAt: {
        gt: new Date(),
      },
    },
    include: {
      user: {
        include: {
          memberships: {
            include: {
              organization: true,
            },
            orderBy: {
              createdAt: 'asc',
            },
          },
        },
      },
    },
  });

  if (!resetToken) {
    throw new HttpError(400, 'That password reset link is invalid or expired.');
  }

  const passwordHash = await hashPassword(input.password);

  await prisma.$transaction(async (tx) => {
    await tx.passwordCredential.upsert({
      where: { userId: resetToken.userId },
      update: { passwordHash },
      create: {
        userId: resetToken.userId,
        passwordHash,
      },
    });

    await tx.passwordResetToken.update({
      where: { id: resetToken.id },
      data: {
        consumedAt: new Date(),
      },
    });

    await tx.passwordResetToken.updateMany({
      where: {
        userId: resetToken.userId,
        consumedAt: null,
      },
      data: {
        consumedAt: new Date(),
      },
    });
  });

  const membership = getPrimaryMembership(resetToken.user.memberships);
  if (membership) {
    await recordAuditEvent({
      organizationId: membership.organizationId,
      actorUserId: resetToken.userId,
      actor: 'user',
      action: 'auth.password_reset.completed',
      entityType: 'User',
      entityId: resetToken.userId,
    });
  }
}

export async function changePassword(input: {
  userId: string;
  organizationId: string;
  currentPassword: string;
  newPassword: string;
}) {
  const credential = await prisma.passwordCredential.findUnique({
    where: { userId: input.userId },
  });

  if (!credential) {
    throw new HttpError(
      400,
      'Password changes are available only for password-based accounts.',
    );
  }

  const valid = await verifyPassword(input.currentPassword, credential.passwordHash);
  if (!valid) {
    throw new HttpError(400, 'Current password is incorrect.');
  }

  await prisma.passwordCredential.update({
    where: { userId: input.userId },
    data: {
      passwordHash: await hashPassword(input.newPassword),
    },
  });

  await recordAuditEvent({
    organizationId: input.organizationId,
    actorUserId: input.userId,
    actor: 'user',
    action: 'auth.password_changed',
    entityType: 'User',
    entityId: input.userId,
  });
}

export async function updateProfile(input: {
  userId: string;
  organizationId: string;
  name: string;
}) {
  const user = await prisma.user.update({
    where: { id: input.userId },
    data: {
      name: input.name.trim(),
    },
  });

  await recordAuditEvent({
    organizationId: input.organizationId,
    actorUserId: input.userId,
    actor: 'user',
    action: 'profile.updated',
    entityType: 'User',
    entityId: input.userId,
  });

  return user;
}

export async function completeOnboarding(input: {
  userId: string;
  organizationId: string;
  organizationName: string;
  industry?: string;
}) {
  const slug = await generateUniqueSlug(input.organizationName);
  const [organization, user] = await prisma.$transaction([
    prisma.organization.update({
      where: { id: input.organizationId },
      data: {
        name: input.organizationName.trim(),
        industry: input.industry?.trim() || null,
        slug,
      },
    }),
    prisma.user.update({
      where: { id: input.userId },
      data: {
        onboardingCompletedAt: new Date(),
      },
    }),
  ]);

  await recordAuditEvent({
    organizationId: organization.id,
    actorUserId: user.id,
    actor: 'user',
    action: 'onboarding.completed',
    entityType: 'Organization',
    entityId: organization.id,
    metadata: {
      name: organization.name,
      industry: organization.industry,
    },
  });

  return { organization, user };
}

export async function createWorkspaceInvite(input: {
  organizationId: string;
  invitedByUserId: string;
  inviterName: string;
  organizationName: string;
  email: string;
  role: MembershipRole;
}) {
  const rawToken = generateOpaqueToken();
  const invite = await prisma.workspaceInvite.create({
    data: {
      organizationId: input.organizationId,
      invitedByUserId: input.invitedByUserId,
      email: normalizeEmail(input.email),
      role: input.role,
      tokenHash: hashOpaqueToken(rawToken),
      expiresAt: addDays(new Date(), 7),
    },
  });

  try {
    await getTransactionalEmailService().sendWorkspaceInviteEmail({
      to: invite.email,
      inviterName: input.inviterName,
      organizationName: input.organizationName,
      inviteUrl: buildInviteUrl(rawToken),
      clientReference: `invite.workspace:${invite.id}`,
    });
  } catch (error) {
    await prisma.workspaceInvite.update({
      where: { id: invite.id },
      data: { revokedAt: new Date() },
    });

    await recordAuditEvent({
      organizationId: input.organizationId,
      actorUserId: input.invitedByUserId,
      actor: 'system',
      action: 'invite.email.failed',
      entityType: 'WorkspaceInvite',
      entityId: invite.id,
      metadata: {
        reason:
          error instanceof EmailDeliveryError
            ? error.code ?? error.message
            : 'mail delivery failed',
      },
    });

    if (env.isProduction) {
      throw new HttpError(503, 'Invite email could not be sent. Try again shortly.');
    }
  }

  await recordAuditEvent({
    organizationId: input.organizationId,
    actorUserId: input.invitedByUserId,
    actor: 'user',
    action: 'invite.created',
    entityType: 'WorkspaceInvite',
    entityId: invite.id,
    metadata: {
      email: invite.email,
      role: invite.role,
    },
  });

  return invite;
}

export async function acceptWorkspaceInvite(input: {
  token: string;
  userId: string;
  sessionId?: string;
}) {
  const invite = await prisma.workspaceInvite.findFirst({
    where: {
      tokenHash: hashOpaqueToken(input.token),
      revokedAt: null,
      acceptedAt: null,
      expiresAt: {
        gt: new Date(),
      },
    },
    include: {
      organization: true,
      invitedByUser: true,
    },
  });

  if (!invite) {
    throw new HttpError(400, 'That invite is invalid or expired.');
  }

  const user = await prisma.user.findUnique({
    where: { id: input.userId },
  });

  if (!user || normalizeEmail(user.email) !== normalizeEmail(invite.email)) {
    throw new HttpError(
      403,
      'This invite can only be accepted by the invited email address.',
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.membership.upsert({
      where: {
        organizationId_userId: {
          organizationId: invite.organizationId,
          userId: input.userId,
        },
      },
      update: {
        role: invite.role,
      },
      create: {
        organizationId: invite.organizationId,
        userId: input.userId,
        role: invite.role,
        invitedByUserId: invite.invitedByUserId,
      },
    });

    await tx.workspaceInvite.update({
      where: { id: invite.id },
      data: {
        acceptedAt: new Date(),
        acceptedByUserId: input.userId,
      },
    });
  });

  if (input.sessionId) {
    await rotateSessionOrganization({
      sessionId: input.sessionId,
      organizationId: invite.organizationId,
    });
  }

  await recordAuditEvent({
    organizationId: invite.organizationId,
    actorUserId: input.userId,
    actor: 'user',
    action: 'invite.accepted',
    entityType: 'WorkspaceInvite',
    entityId: invite.id,
    metadata: {
      role: invite.role,
      email: invite.email,
    },
  });

  return invite;
}

export async function listCurrentOrganizationMembers(organizationId: string) {
  return prisma.membership.findMany({
    where: {
      organizationId,
    },
    include: {
      user: true,
    },
    orderBy: [
      { role: 'asc' },
      { createdAt: 'asc' },
    ],
  });
}

export async function listCurrentOrganizationInvites(organizationId: string) {
  return prisma.workspaceInvite.findMany({
    where: {
      organizationId,
    },
    include: {
      invitedByUser: true,
      acceptedByUser: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
}

export async function updateCurrentOrganization(input: {
  organizationId: string;
  actorUserId: string;
  name: string;
  industry?: string;
  defaultExecutionPreference: 'local' | 'remote';
}) {
  const organization = await prisma.organization.update({
    where: { id: input.organizationId },
    data: {
      name: input.name.trim(),
      industry: input.industry?.trim() || null,
      defaultExecutionPreference: input.defaultExecutionPreference,
    },
  });

  await recordAuditEvent({
    organizationId: organization.id,
    actorUserId: input.actorUserId,
    actor: 'user',
    action: 'organization.updated',
    entityType: 'Organization',
    entityId: organization.id,
    metadata: {
      name: organization.name,
      industry: organization.industry,
      defaultExecutionPreference: organization.defaultExecutionPreference,
    },
  });

  return organization;
}

export async function getAuthMe(session: AuthenticatedSession) {
  const membership = getPrimaryMembership(
    session.user.memberships,
    session.organizationId,
  );

  return {
    user: {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      emailVerifiedAt: session.user.emailVerifiedAt,
      onboardingCompletedAt: session.user.onboardingCompletedAt,
      hasPassword: Boolean(session.user.passwordCredential),
      authMethods: [
        ...(session.user.passwordCredential ? ['password'] : []),
        ...session.user.oauthIdentities.map((identity) =>
          identity.provider.toLowerCase(),
        ),
      ],
    },
    organization: membership?.organization ?? session.organization,
    membership: membership
      ? {
          id: membership.id,
          role: membership.role,
        }
      : null,
    memberships: session.user.memberships.map((membership) => ({
      organizationId: membership.organizationId,
      organizationName: membership.organization.name,
      role: membership.role,
    })),
  };
}

export async function signInWithGoogleProfile(input: {
  email: string;
  emailVerified: boolean;
  name: string;
  providerAccountId: string;
  actor: SessionActorInput;
}) {
  if (!input.emailVerified) {
    throw new HttpError(
      403,
      'Google did not confirm a verified email address for this account.',
    );
  }

  const email = normalizeEmail(input.email);
  const existingIdentity = await prisma.oAuthIdentity.findUnique({
    where: {
      provider_providerAccountId: {
        provider: OAuthProvider.GOOGLE,
        providerAccountId: input.providerAccountId,
      },
    },
    include: {
      user: {
        include: {
          memberships: {
            include: {
              organization: true,
            },
            orderBy: {
              createdAt: 'asc',
            },
          },
        },
      },
    },
  });

  if (existingIdentity) {
    const membership = getPrimaryMembership(existingIdentity.user.memberships);
    if (!membership) {
      throw new HttpError(403, 'No workspace membership is available for this user.');
    }

    const session = await createSessionForUser({
      userId: existingIdentity.userId,
      organizationId: membership.organizationId,
      actor: input.actor,
    });

    await recordAuditEvent({
      organizationId: membership.organizationId,
      actorUserId: existingIdentity.userId,
      actor: 'user',
      action: 'auth.sign_in.completed',
      entityType: 'Session',
      entityId: session.session.id,
      metadata: {
        method: 'google',
      },
    });

    return {
      created: false,
      session,
      user: existingIdentity.user,
      organization: membership.organization,
    };
  }

  const existingUser = await prisma.user.findUnique({
    where: { email },
    include: {
      passwordCredential: true,
      memberships: {
        include: {
          organization: true,
        },
        orderBy: {
          createdAt: 'asc',
        },
      },
    },
  });

  if (existingUser) {
    throw new HttpError(
      409,
      'An account already exists with another sign-in method. Sign in with that method first.',
    );
  }

  const organizationName = defaultWorkspaceName(input.name);
  const organizationSlug = await generateUniqueSlug(organizationName);

  const { user, organization } = await prisma.$transaction(async (tx) => {
    const organization = await tx.organization.create({
      data: {
        name: organizationName,
        slug: organizationSlug,
      },
    });

    const user = await tx.user.create({
      data: {
        email,
        name: input.name.trim(),
        emailVerifiedAt: new Date(),
      },
    });

    await tx.membership.create({
      data: {
        organizationId: organization.id,
        userId: user.id,
        role: MembershipRole.OWNER,
      },
    });

    await tx.oAuthIdentity.create({
      data: {
        userId: user.id,
        provider: OAuthProvider.GOOGLE,
        providerAccountId: input.providerAccountId,
        email,
      },
    });

    return { user, organization };
  });

  const session = await createSessionForUser({
    userId: user.id,
    organizationId: organization.id,
    actor: input.actor,
  });

  await recordAuditEvent({
    organizationId: organization.id,
    actorUserId: user.id,
    actor: 'user',
    action: 'auth.sign_up.completed',
    entityType: 'User',
    entityId: user.id,
    metadata: {
      email: user.email,
      method: 'google',
    },
  });

  return {
    created: true,
    session,
    user,
    organization,
  };
}

export type { AuthenticatedSession };
