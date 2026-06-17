import type { NextFunction, Request, Response } from 'express';
import { prisma } from '@substrata/db';

export async function mockAuthMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  const organization = await prisma.organization.findFirst({
    orderBy: { createdAt: 'asc' },
  });

  if (!organization) {
    throw new Error('No organization found. Run the seed script first.');
  }

  const user = await prisma.user.findFirst({
    where: { organizationId: organization.id },
    orderBy: { createdAt: 'asc' },
  });

  if (!user) {
    throw new Error('No user found. Run the seed script first.');
  }

  req.authContext = { organization, user };
  next();
}

