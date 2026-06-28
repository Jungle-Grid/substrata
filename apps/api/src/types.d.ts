import type { Membership, Organization, User } from '@substrata/db';
import type { AuthenticatedSession } from './services/auth.service';

declare global {
  namespace Express {
    interface Request {
      authContext?: {
        session: AuthenticatedSession;
        organization: Organization;
        membership: Membership;
        user: User;
      };
    }
  }
}

export {};
