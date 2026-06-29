import { maskEmailAddress, maskSensitiveUrl } from './helpers';
import type { TransactionalEmailService } from './types';

type ConsoleLogger = Pick<typeof console, 'info'>;

function buildPreview(input: {
  type: 'verification' | 'password_reset' | 'workspace_invite';
  to: string;
  subject: string;
  actionUrl: string;
  clientReference: string;
}) {
  return {
    provider: 'console',
    type: input.type,
    to: maskEmailAddress(input.to),
    subject: input.subject,
    actionUrl: maskSensitiveUrl(input.actionUrl),
    clientReference: input.clientReference,
  };
}

export class FakeTransactionalEmailService implements TransactionalEmailService {
  constructor(private readonly logger: ConsoleLogger = console) {}

  async sendVerificationEmail(input: {
    to: string;
    name?: string | null;
    verificationUrl: string;
    expiresInText: string;
    clientReference: string;
  }) {
    this.logger.info(
      'Console email preview',
      buildPreview({
        type: 'verification',
        to: input.to,
        subject: 'Verify your Substrata email',
        actionUrl: input.verificationUrl,
        clientReference: input.clientReference,
      }),
    );
  }

  async sendPasswordResetEmail(input: {
    to: string;
    name?: string | null;
    resetUrl: string;
    expiresInText: string;
    clientReference: string;
  }) {
    this.logger.info(
      'Console email preview',
      buildPreview({
        type: 'password_reset',
        to: input.to,
        subject: 'Reset your Substrata password',
        actionUrl: input.resetUrl,
        clientReference: input.clientReference,
      }),
    );
  }

  async sendWorkspaceInviteEmail(input: {
    to: string;
    inviterName: string;
    organizationName: string;
    inviteUrl: string;
    clientReference: string;
  }) {
    this.logger.info(
      'Console email preview',
      buildPreview({
        type: 'workspace_invite',
        to: input.to,
        subject: 'You were invited to a Substrata workspace',
        actionUrl: input.inviteUrl,
        clientReference: input.clientReference,
      }),
    );
  }
}
