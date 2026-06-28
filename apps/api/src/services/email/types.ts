export interface TransactionalEmailService {
  sendVerificationEmail(input: {
    to: string;
    name?: string;
    verificationUrl: string;
  }): Promise<void>;

  sendPasswordResetEmail(input: {
    to: string;
    name?: string;
    resetUrl: string;
  }): Promise<void>;

  sendWorkspaceInviteEmail(input: {
    to: string;
    inviterName: string;
    organizationName: string;
    inviteUrl: string;
  }): Promise<void>;
}
