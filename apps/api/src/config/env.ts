import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(currentDir, '../../../..');

dotenv.config({ path: path.join(repoRoot, '.env') });
dotenv.config();

function readTrimmed(key: string) {
  return process.env[key]?.trim() ?? '';
}

function assertNonEmpty(value: string, key: string) {
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function hostnameFromUrl(value: string) {
  try {
    return new URL(value).hostname;
  } catch {
    return '';
  }
}

function readRequiredProductionValue(key: string) {
  const value = readTrimmed(key);
  if (process.env.NODE_ENV === 'production' && !value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

const isProduction = process.env.NODE_ENV === 'production';
const configuredAppUrl = readTrimmed('WEB_APP_URL') || readTrimmed('APP_URL');
const appUrl = configuredAppUrl || 'http://localhost:3000';
const configuredApiUrl = readTrimmed('API_URL') || 'http://localhost:4000';
const emailProvider = (readTrimmed('EMAIL_PROVIDER') ||
  (isProduction ? 'zeptomail' : 'console')) as 'console' | 'zeptomail';
const sessionCookieDomain = readTrimmed('SESSION_COOKIE_DOMAIN');
const publicDemoAdminEmails = readTrimmed('PUBLIC_DEMO_ADMIN_EMAILS')
  .split(',')
  .map((value) => value.trim().toLowerCase())
  .filter(Boolean);

if (!['console', 'zeptomail'].includes(emailProvider)) {
  throw new Error('EMAIL_PROVIDER must be either "console" or "zeptomail".');
}

if (isProduction && emailProvider !== 'zeptomail') {
  throw new Error('Production requires EMAIL_PROVIDER=zeptomail.');
}

const zeptomailSendMailToken =
  readTrimmed('ZEPTOMAIL_SEND_MAIL_TOKEN') || readTrimmed('ZEPTO_MAIL_API_TOKEN');
const emailFromAddress = readTrimmed('EMAIL_FROM_ADDRESS');
const emailFromName = readTrimmed('EMAIL_FROM_NAME') || 'Substrata';
const emailReplyTo = readTrimmed('EMAIL_REPLY_TO');

if (emailProvider === 'zeptomail') {
  assertNonEmpty(zeptomailSendMailToken, 'ZEPTOMAIL_SEND_MAIL_TOKEN');
  assertNonEmpty(emailFromAddress, 'EMAIL_FROM_ADDRESS');
  assertNonEmpty(configuredAppUrl, 'WEB_APP_URL');
}

const appHostname = hostnameFromUrl(appUrl);
const apiHostname = hostnameFromUrl(configuredApiUrl);

if (
  isProduction &&
  appHostname &&
  apiHostname &&
  appHostname !== apiHostname &&
  !sessionCookieDomain
) {
  throw new Error(
    'Missing required environment variable: SESSION_COOKIE_DOMAIN',
  );
}

export const env = {
  appUrl,
  apiUrl: configuredApiUrl,
  apiPort: Number(process.env.API_PORT ?? 4000),
  apiCorsOrigin: readTrimmed('API_CORS_ORIGIN') || appUrl,
  googleClientId: readTrimmed('GOOGLE_CLIENT_ID'),
  googleClientSecret: readTrimmed('GOOGLE_CLIENT_SECRET'),
  googleOAuthRedirectUri:
    readTrimmed('GOOGLE_OAUTH_REDIRECT_URI') || 'http://localhost:4000/v1/auth/google/callback',
  sessionSecret: readRequiredProductionValue('SESSION_SECRET'),
  sessionCookieName: readTrimmed('SESSION_COOKIE_NAME') || 'substrata_session',
  sessionCookieDomain,
  publicDemoAdminEmails,
  emailProvider,
  zeptomailSendMailToken,
  emailFromAddress,
  emailFromName,
  emailReplyTo,
  isProduction,
};
