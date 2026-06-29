import { escapeAttribute, escapeHtml } from './helpers';

const brandName = 'Substrata';
const frameStyle =
  'margin:0;background-color:#f3f5f7;padding:24px 12px;color:#0f1720;font-family:Arial,Helvetica,sans-serif;';
const cardStyle =
  'margin:0 auto;max-width:620px;background-color:#ffffff;border:1px solid #d7dee7;border-radius:12px;overflow:hidden;';
const contentStyle = 'padding:24px;font-size:14px;line-height:1.6;color:#22303c;';
const buttonStyle =
  'display:inline-block;border-radius:8px;background-color:#18324a;padding:12px 18px;color:#ffffff;text-decoration:none;font-weight:600;';
const mutedStyle = 'color:#52606d;font-size:13px;';

type EmailContent = {
  subject: string;
  htmlbody: string;
  textbody: string;
};

function renderLayout(input: {
  subject: string;
  preview: string;
  introHtml: string;
  actionLabel: string;
  actionUrl: string;
  bodyHtml: string;
  footerHtml: string;
  textLines: string[];
}) {
  const htmlbody = [
    '<!doctype html>',
    `<html><body style="${frameStyle}">`,
    `<div style="${cardStyle}">`,
    `<div style="padding:24px 24px 12px;border-bottom:1px solid #e5e9ef;">`,
    `<div style="font-size:12px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#52606d;">${brandName}</div>`,
    `<h1 style="margin:12px 0 8px;font-size:24px;line-height:1.3;color:#0f1720;">${escapeHtml(input.subject)}</h1>`,
    `<p style="margin:0;${mutedStyle}">${escapeHtml(input.preview)}</p>`,
    '</div>',
    `<div style="${contentStyle}">`,
    input.introHtml,
    `<p style="margin:24px 0;"><a href="${escapeAttribute(input.actionUrl)}" style="${buttonStyle}">${escapeHtml(input.actionLabel)}</a></p>`,
    input.bodyHtml,
    `<p style="margin:20px 0 0;word-break:break-word;${mutedStyle}">If the button does not work, paste this link into your browser:<br><a href="${escapeAttribute(input.actionUrl)}" style="color:#18324a;">${escapeHtml(input.actionUrl)}</a></p>`,
    `<div style="margin-top:24px;padding-top:16px;border-top:1px solid #e5e9ef;${mutedStyle}">${input.footerHtml}</div>`,
    '</div>',
    '</div>',
    '</body></html>',
  ].join('');

  return {
    subject: input.subject,
    htmlbody,
    textbody: input.textLines.join('\n'),
  };
}

export function renderVerificationEmail(input: {
  name?: string | null;
  verificationUrl: string;
  expiresInText: string;
}): EmailContent {
  const greeting = input.name ? `Hi ${escapeHtml(input.name)},` : 'Hello,';
  return renderLayout({
    subject: 'Verify your Substrata email',
    preview: `Verify your email to continue. This link expires ${input.expiresInText}.`,
    introHtml: `<p style="margin:0 0 16px;">${greeting}</p><p style="margin:0 0 16px;">Verify your email to continue into your Substrata compliance workspace.</p>`,
    actionLabel: 'Verify email',
    actionUrl: input.verificationUrl,
    bodyHtml: `<p style="margin:0 0 16px;">This link expires ${escapeHtml(input.expiresInText)}.</p>`,
    footerHtml:
      '<p style="margin:0;">If you did not create a Substrata account, you can ignore this email.</p>',
    textLines: [
      input.name ? `Hi ${input.name},` : 'Hello,',
      '',
      'Verify your email to continue into your Substrata compliance workspace.',
      '',
      `Verify email: ${input.verificationUrl}`,
      '',
      `This link expires ${input.expiresInText}.`,
      '',
      'If you did not create a Substrata account, you can ignore this email.',
    ],
  });
}

export function renderPasswordResetEmail(input: {
  name?: string | null;
  resetUrl: string;
  expiresInText: string;
}): EmailContent {
  const greeting = input.name ? `Hi ${escapeHtml(input.name)},` : 'Hello,';
  return renderLayout({
    subject: 'Reset your Substrata password',
    preview: `Choose a new password. This link expires ${input.expiresInText}.`,
    introHtml: `<p style="margin:0 0 16px;">${greeting}</p><p style="margin:0 0 16px;">We received a request to reset your Substrata password.</p>`,
    actionLabel: 'Reset password',
    actionUrl: input.resetUrl,
    bodyHtml: `<p style="margin:0 0 16px;">This link expires ${escapeHtml(input.expiresInText)}.</p>`,
    footerHtml:
      '<p style="margin:0;">If you did not request a password reset, you can ignore this email.</p>',
    textLines: [
      input.name ? `Hi ${input.name},` : 'Hello,',
      '',
      'We received a request to reset your Substrata password.',
      '',
      `Reset password: ${input.resetUrl}`,
      '',
      `This link expires ${input.expiresInText}.`,
      '',
      'If you did not request a password reset, you can ignore this email.',
    ],
  });
}

export function renderWorkspaceInviteEmail(input: {
  inviterName: string;
  organizationName: string;
  inviteUrl: string;
}): EmailContent {
  return renderLayout({
    subject: 'You were invited to a Substrata workspace',
    preview: 'Review the invite and join the compliance workspace. This link expires in 7 days.',
    introHtml: `<p style="margin:0 0 16px;">Hello,</p><p style="margin:0 0 16px;">${escapeHtml(input.inviterName)} invited you to join the ${escapeHtml(input.organizationName)} workspace in Substrata.</p>`,
    actionLabel: 'Review invite',
    actionUrl: input.inviteUrl,
    bodyHtml: '<p style="margin:0 0 16px;">This link expires in 7 days.</p>',
    footerHtml:
      '<p style="margin:0;">This invite opens the existing workspace sign-in flow so you can review the compliance workspace access request.</p>',
    textLines: [
      'Hello,',
      '',
      `${input.inviterName} invited you to join the ${input.organizationName} workspace in Substrata.`,
      '',
      `Review invite: ${input.inviteUrl}`,
      '',
      'This link expires in 7 days.',
    ],
  });
}
