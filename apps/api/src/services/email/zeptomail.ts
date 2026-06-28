import { env } from '../../config/env';
import type { TransactionalEmailService } from './types';

type EmailTemplateInput = {
  subject: string;
  preview: string;
  bodyHtml: string;
};

function renderLayout(template: EmailTemplateInput) {
  return `
    <div style="font-family: Arial, sans-serif; background: #f5f7fa; padding: 24px; color: #16202a;">
      <div style="max-width: 560px; margin: 0 auto; background: #ffffff; border: 1px solid #d7dce3; border-radius: 12px; overflow: hidden;">
        <div style="padding: 24px 24px 8px;">
          <p style="margin: 0; font-size: 12px; letter-spacing: 0.12em; text-transform: uppercase; color: #52606d;">Substrata</p>
          <h1 style="margin: 12px 0 0; font-size: 22px; line-height: 1.3;">${template.subject}</h1>
          <p style="margin: 12px 0 0; font-size: 14px; color: #52606d;">${template.preview}</p>
        </div>
        <div style="padding: 8px 24px 24px; font-size: 14px; line-height: 1.6;">
          ${template.bodyHtml}
        </div>
      </div>
    </div>
  `.trim();
}

async function sendZeptoMail(input: {
  to: string;
  subject: string;
  htmlBody: string;
}) {
  const response = await fetch('https://api.zeptomail.com/v1.1/email', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Zoho-enczapikey ${env.zeptoMailApiToken}`,
    },
    body: JSON.stringify({
      from: {
        address: env.emailFrom,
      },
      to: [
        {
          email_address: {
            address: input.to,
          },
        },
      ],
      subject: input.subject,
      htmlbody: input.htmlBody,
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`ZeptoMail request failed with status ${response.status}: ${body}`);
  }
}

export class ZeptoMailTransactionalEmailService
  implements TransactionalEmailService
{
  async sendVerificationEmail(input: {
    to: string;
    name?: string;
    verificationUrl: string;
  }) {
    await sendZeptoMail({
      to: input.to,
      subject: 'Verify your Substrata email',
      htmlBody: renderLayout({
        subject: 'Verify your Substrata email',
        preview: 'Complete your Substrata sign-up. This link expires in 24 hours.',
        bodyHtml: `
          <p>${input.name ? `Hi ${input.name},` : 'Hello,'}</p>
          <p>Verify your email to continue into your Substrata compliance workspace.</p>
          <p><a href="${input.verificationUrl}" style="display: inline-block; background: #19324d; color: #ffffff; text-decoration: none; padding: 12px 18px; border-radius: 8px;">Verify email</a></p>
          <p>This link expires in 24 hours.</p>
        `,
      }),
    });
  }

  async sendPasswordResetEmail(input: {
    to: string;
    name?: string;
    resetUrl: string;
  }) {
    await sendZeptoMail({
      to: input.to,
      subject: 'Reset your Substrata password',
      htmlBody: renderLayout({
        subject: 'Reset your Substrata password',
        preview: 'Use the link below to choose a new password. This link expires in 1 hour.',
        bodyHtml: `
          <p>${input.name ? `Hi ${input.name},` : 'Hello,'}</p>
          <p>We received a request to reset your Substrata password.</p>
          <p><a href="${input.resetUrl}" style="display: inline-block; background: #19324d; color: #ffffff; text-decoration: none; padding: 12px 18px; border-radius: 8px;">Reset password</a></p>
          <p>This link expires in 1 hour.</p>
        `,
      }),
    });
  }

  async sendWorkspaceInviteEmail(input: {
    to: string;
    inviterName: string;
    organizationName: string;
    inviteUrl: string;
  }) {
    await sendZeptoMail({
      to: input.to,
      subject: 'You were invited to a Substrata workspace',
      htmlBody: renderLayout({
        subject: 'You were invited to a Substrata workspace',
        preview: 'Join a Substrata compliance workspace. This invite link expires in 7 days.',
        bodyHtml: `
          <p>Hello,</p>
          <p>${input.inviterName} invited you to join the ${input.organizationName} workspace in Substrata.</p>
          <p><a href="${input.inviteUrl}" style="display: inline-block; background: #19324d; color: #ffffff; text-decoration: none; padding: 12px 18px; border-radius: 8px;">Review invite</a></p>
          <p>This link expires in 7 days.</p>
        `,
      }),
    });
  }
}
