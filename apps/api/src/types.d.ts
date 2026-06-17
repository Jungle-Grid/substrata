import type { Organization, User } from '@substrata/db';

declare global {
  namespace Express {
    interface Request {
      authContext: {
        organization: Organization;
        user: User;
      };
    }
  }
}

export {};

