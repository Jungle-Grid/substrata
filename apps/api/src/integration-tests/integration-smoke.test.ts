import assert from 'node:assert/strict';
import test, { after, before } from 'node:test';
import { HttpClient } from './helpers/http-client';
import { createSignedInClient } from './helpers/auth';
import { createDocumentFixture } from './helpers/fixtures';
import { startHarness, stopHarness, type IntegrationHarness } from './helpers/test-server';

let harness: IntegrationHarness;
before(async () => { harness = await startHarness(); });
after(async () => { await stopHarness(harness); });

test('integration harness uses a migrated temporary database with the real Express app', async () => {
  const health = await fetch(`${harness.baseUrl}/health`);
  assert.equal(health.status, 200); assert.equal((await health.json() as { ok: boolean }).ok, true);
  assert.equal(await harness.prisma.organization.count(), 0);
});
test('real password session protects workspace routes', async () => {
  assert.equal((await new HttpClient(harness.baseUrl).request('/v1/documents')).response.status, 401);
  const actor = await createSignedInClient(harness.baseUrl, harness.prisma, 'auth');
  assert.equal((await actor.client.request('/v1/documents')).response.status, 200);
});
test('real CSRF archive persists lifecycle fields and audit event', async () => {
  const actor = await createSignedInClient(harness.baseUrl, harness.prisma, 'archive');
  const document = await createDocumentFixture(harness.prisma, actor.organization.id);
  assert.equal((await actor.client.request(`/v1/documents/${document.id}/archive`, { method: 'POST' })).response.status, 403);
  assert.equal((await actor.client.request(`/v1/documents/${document.id}/archive`, { method: 'POST', csrf: 'invalid-token-invalid-token' })).response.status, 403);
  const archived = await actor.client.request(`/v1/documents/${document.id}/archive`, { method: 'POST', csrf: actor.csrf });
  assert.equal(archived.response.status, 200); assert.equal('storagePath' in (archived.body as object), false);
  const persisted = await harness.prisma.document.findUniqueOrThrow({ where: { id: document.id } });
  assert.ok(persisted.archivedAt); assert.equal(persisted.archivedByUserId, actor.user.id);
  assert.equal(await harness.prisma.auditEvent.count({ where: { entityId: document.id, action: 'document.archived' } }), 1);
});
test('cross-organization archive is non-disclosing and leaves the record unchanged', async () => {
  const a = await createSignedInClient(harness.baseUrl, harness.prisma, 'owner-a');
  const b = await createSignedInClient(harness.baseUrl, harness.prisma, 'owner-b');
  const document = await createDocumentFixture(harness.prisma, b.organization.id);
  assert.equal((await a.client.request(`/v1/documents/${document.id}/archive`, { method: 'POST', csrf: a.csrf })).response.status, 404);
  assert.equal((await harness.prisma.document.findUniqueOrThrow({ where: { id: document.id } })).archivedAt, null);
  assert.equal(await harness.prisma.auditEvent.count({ where: { entityId: document.id, action: 'document.archived' } }), 0);
});
