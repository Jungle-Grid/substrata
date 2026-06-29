export class EmailDeliveryError extends Error {
  readonly provider: string;
  readonly status?: number;
  readonly code?: string;
  readonly requestId?: string;

  constructor(input: {
    provider: string;
    message: string;
    status?: number;
    code?: string;
    requestId?: string;
  }) {
    super(input.message);
    this.name = 'EmailDeliveryError';
    this.provider = input.provider;
    this.status = input.status;
    this.code = input.code;
    this.requestId = input.requestId;
  }
}

export interface TransactionalEmailService {
  sendVerificationEmail(input: {
    to: string;
    name?: string | null;
    verificationUrl: string;
    expiresInText: string;
    clientReference: string;
  }): Promise<void>;

  sendPasswordResetEmail(input: {
    to: string;
    name?: string | null;
    resetUrl: string;
    expiresInText: string;
    clientReference: string;
  }): Promise<void>;

  sendWorkspaceInviteEmail(input: {
    to: string;
    inviterName: string;
    organizationName: string;
    inviteUrl: string;
    clientReference: string;
  }): Promise<void>;
}
