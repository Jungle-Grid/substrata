import { maskEmailAddress } from './helpers';
import {
  renderPasswordResetEmail,
  renderVerificationEmail,
  renderWorkspaceInviteEmail,
} from './templates';
import { EmailDeliveryError, type TransactionalEmailService } from './types';

export type ZeptoMailConfig = {
  apiToken: string;
  fromAddress: string;
  fromName: string;
  replyTo?: string;
  endpoint?: string;
  logger?: Pick<typeof console, 'error'>;
};

type ZeptoMailErrorResponse = {
  request_id?: string;
  error?: {
    code?: string;
    message?: string;
    request_id?: string;
    details?: Array<{
      code?: string;
      message?: string;
      target?: string;
    }>;
  };
};

function replyToField(input: { replyTo?: string; fromName: string }) {
  if (!input.replyTo) {
    return undefined;
  }

  return [
    {
      address: input.replyTo,
      name: input.fromName,
    },
  ];
}

async function readSafeDiagnostics(response: Response) {
  const fallback = {
    code: undefined as string | undefined,
    message: `ZeptoMail responded with HTTP ${response.status}.`,
    requestId: undefined as string | undefined,
  };

  const payload = (await response.json().catch(() => null)) as ZeptoMailErrorResponse | null;
  if (!payload) {
    return fallback;
  }

  return {
    code: payload.error?.code,
    message: payload.error?.message ?? fallback.message,
    requestId: payload.error?.request_id ?? payload.request_id,
  };
}

export class ZeptoMailTransactionalEmailService
  implements TransactionalEmailService
{
  private readonly endpoint: string;
  private readonly logger: Pick<typeof console, 'error'>;

  constructor(private readonly config: ZeptoMailConfig) {
    this.endpoint = config.endpoint ?? 'https://api.zeptomail.com/v1.1/email';
    this.logger = config.logger ?? console;
  }

  private async send(input: {
    to: string;
    name?: string | null;
    subject: string;
    htmlbody: string;
    textbody: string;
    clientReference: string;
  }) {
    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Zoho-enczapikey ${this.config.apiToken}`,
      },
      body: JSON.stringify({
        from: {
          address: this.config.fromAddress,
          name: this.config.fromName,
        },
        to: [
          {
            email_address: {
              address: input.to,
              ...(input.name ? { name: input.name } : {}),
            },
          },
        ],
        ...(replyToField({
          replyTo: this.config.replyTo,
          fromName: this.config.fromName,
        })
          ? {
              reply_to: replyToField({
                replyTo: this.config.replyTo,
                fromName: this.config.fromName,
              }),
            }
          : {}),
        subject: input.subject,
        htmlbody: input.htmlbody,
        textbody: input.textbody,
        track_clicks: false,
        track_opens: false,
        client_reference: input.clientReference,
      }),
    });

    if (response.ok) {
      return;
    }

    const diagnostics = await readSafeDiagnostics(response);
    this.logger.error('ZeptoMail delivery failed', {
      status: response.status,
      code: diagnostics.code,
      message: diagnostics.message,
      requestId: diagnostics.requestId,
      recipient: maskEmailAddress(input.to),
      clientReference: input.clientReference,
    });

    throw new EmailDeliveryError({
      provider: 'zeptomail',
      status: response.status,
      code: diagnostics.code,
      requestId: diagnostics.requestId,
      message: diagnostics.message,
    });
  }

  async sendVerificationEmail(input: {
    to: string;
    name?: string | null;
    verificationUrl: string;
    expiresInText: string;
    clientReference: string;
  }) {
    const email = renderVerificationEmail(input);
    await this.send({
      to: input.to,
      name: input.name,
      subject: email.subject,
      htmlbody: email.htmlbody,
      textbody: email.textbody,
      clientReference: input.clientReference,
    });
  }

  async sendPasswordResetEmail(input: {
    to: string;
    name?: string | null;
    resetUrl: string;
    expiresInText: string;
    clientReference: string;
  }) {
    const email = renderPasswordResetEmail(input);
    await this.send({
      to: input.to,
      name: input.name,
      subject: email.subject,
      htmlbody: email.htmlbody,
      textbody: email.textbody,
      clientReference: input.clientReference,
    });
  }

  async sendWorkspaceInviteEmail(input: {
    to: string;
    inviterName: string;
    organizationName: string;
    inviteUrl: string;
    clientReference: string;
  }) {
    const email = renderWorkspaceInviteEmail(input);
    await this.send({
      to: input.to,
      subject: email.subject,
      htmlbody: email.htmlbody,
      textbody: email.textbody,
      clientReference: input.clientReference,
    });
  }
}
