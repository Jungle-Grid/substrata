import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(currentDir, '../../../..');

dotenv.config({ path: path.join(repoRoot, '.env') });
dotenv.config();

function readRequiredProductionValue(key: string) {
  const value = process.env[key]?.trim();
  if (process.env.NODE_ENV === 'production' && !value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value ?? '';
}

export const env = {
  appUrl: process.env.APP_URL ?? 'http://localhost:3000',
  apiUrl: process.env.API_URL ?? 'http://localhost:4000',
  apiPort: Number(process.env.API_PORT ?? 4000),
  apiCorsOrigin: process.env.API_CORS_ORIGIN ?? process.env.APP_URL ?? 'http://localhost:3000',
  googleClientId: process.env.GOOGLE_CLIENT_ID ?? '',
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
  googleOAuthRedirectUri:
    process.env.GOOGLE_OAUTH_REDIRECT_URI ?? 'http://localhost:4000/v1/auth/google/callback',
  sessionSecret: readRequiredProductionValue('SESSION_SECRET'),
  sessionCookieName: process.env.SESSION_COOKIE_NAME ?? 'substrata_session',
  zeptoMailApiToken: process.env.ZEPTO_MAIL_API_TOKEN ?? '',
  emailFrom: process.env.EMAIL_FROM ?? 'Substrata <no-reply@example.com>',
  isProduction: process.env.NODE_ENV === 'production',
};
