import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { HttpClient } from './http-client';
import type { TestPrisma } from './test-database';

export async function createSignedInClient(baseUrl: string, prisma: TestPrisma, label: string, role: 'OWNER'|'ADMIN'|'REVIEWER'|'ANALYST'|'VIEWER' = 'OWNER') {
  const safeLabel = label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30) || 'actor';
  const email = `${safeLabel}-${randomBytes(6).toString('hex')}@integration.test`;
  const password = 'Integration-pass-123!';
  const client = new HttpClient(baseUrl);
  let csrf = await client.csrf();
  const signup = await client.request('/v1/auth/sign-up', { method: 'POST', csrf, json: { name: label, email, password, confirmPassword: password } });
  assert.equal(signup.response.status, 201);
  const user = await prisma.user.findUniqueOrThrow({ where: { email } });
  await prisma.user.update({ where: { id: user.id }, data: { emailVerifiedAt: new Date() } });
  const organization = await prisma.organization.findFirstOrThrow({ where: { memberships: { some: { userId: user.id } } } });
  if (role !== 'OWNER') await prisma.membership.update({ where: { organizationId_userId: { organizationId: organization.id, userId: user.id } }, data: { role } });
  csrf = await client.csrf();
  const signin = await client.request('/v1/auth/sign-in', { method: 'POST', csrf, json: { email, password } });
  assert.equal(signin.response.status, 200);
  const me = await client.request('/v1/auth/me');
  assert.equal(me.response.status, 200);
  return { client, csrf: (me.body as { csrfToken: string }).csrfToken, user, organization };
}
