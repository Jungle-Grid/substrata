import type { TransactionalEmailService } from './types';

export class FakeTransactionalEmailService
  implements TransactionalEmailService
{
  async sendVerificationEmail(input: {
    to: string;
    name?: string;
    verificationUrl: string;
  }) {
    console.log('Fake verification email', {
      to: input.to,
      name: input.name,
      verificationUrl: input.verificationUrl,
    });
  }

  async sendPasswordResetEmail(input: {
    to: string;
    name?: string;
    resetUrl: string;
  }) {
    console.log('Fake password reset email', {
      to: input.to,
      name: input.name,
      resetUrl: input.resetUrl,
    });
  }

  async sendWorkspaceInviteEmail(input: {
    to: string;
    inviterName: string;
    organizationName: string;
    inviteUrl: string;
  }) {
    console.log('Fake workspace invite email', {
      to: input.to,
      inviterName: input.inviterName,
      organizationName: input.organizationName,
      inviteUrl: input.inviteUrl,
    });
  }
}
