import bcrypt from 'bcrypt';
import crypto from 'node:crypto';
import { env } from '../config/env';

const DEFAULT_SESSION_SECRET = 'substrata-local-session-secret';
const PASSWORD_COST = 12;

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function hashOpaqueToken(token: string) {
  return crypto
    .createHmac('sha256', env.sessionSecret || DEFAULT_SESSION_SECRET)
    .update(token)
    .digest('hex');
}

export function generateOpaqueToken(byteLength = 32) {
  return crypto.randomBytes(byteLength).toString('base64url');
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, PASSWORD_COST);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export function slugifyOrganizationName(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

export function defaultWorkspaceName(name: string) {
  const trimmed = name.trim();
  if (!trimmed) {
    return 'Substrata Workspace';
  }

  return `${trimmed}'s Workspace`;
}

export function addHours(date: Date, hours: number) {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

export function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}
