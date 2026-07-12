import assert from 'node:assert/strict';
import test, { after, before } from 'node:test';
import { createSignedInClient } from './helpers/auth';
import { assertAuditCount, assertErrorBody } from './helpers/assertions';
import { createDocumentFixture, createRunFixture } from './helpers/fixtures';
import { ControlledStorageDriver } from './helpers/storage';
import { startHarness, stopHarness, type IntegrationHarness } from './helpers/test-server';

const storage = new ControlledStorageDriver();
let h: IntegrationHarness;
before(async () => { h = await startHarness(storage); });
after(async () => { await stopHarness(h); });

for (const [name, query, expected] of [['default','',1], ['active','?lifecycle=active',1], ['archived','?lifecycle=archived',1], ['all','?lifecycle=all',2]] as const) {
  test(`document listing ${name} returns the expected lifecycle records`, async () => {
    const actor = await createSignedInClient(h.baseUrl, h.prisma, `list-${name}`);
    await createDocumentFixture(h.prisma, actor.organization.id); await createDocumentFixture(h.prisma, actor.organization.id, { archived: true });
    const result = await actor.client.request(`/v1/documents${query}`);
    assert.equal(result.response.status, 200); assert.equal((result.body as unknown[]).length, expected);
  });
}
test('document listing rejects an invalid lifecycle', async () => {
  const actor = await createSignedInClient(h.baseUrl, h.prisma, 'invalid-list');
  const result = await actor.client.request('/v1/documents?lifecycle=deleted'); assert.equal(result.response.status, 400); assertErrorBody(result.body);
});
test('document archive persists actor, audit, listings, and is idempotent', async () => {
  const actor = await createSignedInClient(h.baseUrl, h.prisma, 'archive-doc'); const document = await createDocumentFixture(h.prisma, actor.organization.id);
  for (const csrf of [undefined, 'invalid-token-invalid-token']) assert.equal((await actor.client.request(`/v1/documents/${document.id}/archive`, { method: 'POST', csrf })).response.status, 403);
  const result = await actor.client.request(`/v1/documents/${document.id}/archive`, { method: 'POST', csrf: actor.csrf }); assert.equal(result.response.status, 200);
  const persisted = await h.prisma.document.findUniqueOrThrow({ where: { id: document.id } }); assert.ok(persisted.archivedAt); assert.equal(persisted.archivedByUserId, actor.user.id);
  const active = await actor.client.request('/v1/documents?lifecycle=active'); const archived = await actor.client.request('/v1/documents?lifecycle=archived');
  assert.ok(!(active.body as {id:string}[]).some((item) => item.id === document.id)); assert.ok((archived.body as {id:string}[]).some((item) => item.id === document.id));
  assert.equal((await actor.client.request(`/v1/documents/${document.id}/archive`, { method: 'POST', csrf: actor.csrf })).response.status, 200);
  await assertAuditCount(h.prisma, document.id, 'document.archived', 1);
});
test('archived document cannot create a classification run and existing run remains', async () => {
  const actor = await createSignedInClient(h.baseUrl, h.prisma, 'archive-run-preserve'); const document = await createDocumentFixture(h.prisma, actor.organization.id, { archived: true }); const run = await createRunFixture(h.prisma, actor.organization.id, document.id);
  const result = await actor.client.request(`/v1/documents/${document.id}/classification-runs`, { method: 'POST', csrf: actor.csrf, json: {} }); assert.equal(result.response.status, 409);
  assert.ok(await h.prisma.classificationRun.findUnique({ where: { id: run.id } }));
});
test('viewer cannot archive or restore a document', async () => {
  const actor = await createSignedInClient(h.baseUrl, h.prisma, 'viewer-doc', 'VIEWER'); const document = await createDocumentFixture(h.prisma, actor.organization.id);
  assert.equal((await actor.client.request(`/v1/documents/${document.id}/archive`, { method: 'POST', csrf: actor.csrf })).response.status, 403);
  await h.prisma.document.update({ where: { id: document.id }, data: { archivedAt: new Date() } });
  assert.equal((await actor.client.request(`/v1/documents/${document.id}/restore`, { method: 'POST', csrf: actor.csrf })).response.status, 403);
});
test('document restore clears lifecycle fields, audits, lists, and is idempotent', async () => {
  const actor = await createSignedInClient(h.baseUrl, h.prisma, 'restore-doc'); const document = await createDocumentFixture(h.prisma, actor.organization.id, { archived: true });
  for (const csrf of [undefined, 'invalid-token-invalid-token']) assert.equal((await actor.client.request(`/v1/documents/${document.id}/restore`, { method: 'POST', csrf })).response.status, 403);
  assert.equal((await actor.client.request(`/v1/documents/${document.id}/restore`, { method: 'POST', csrf: actor.csrf })).response.status, 200);
  const persisted = await h.prisma.document.findUniqueOrThrow({ where: { id: document.id } }); assert.equal(persisted.archivedAt, null); assert.equal(persisted.archivedByUserId, null);
  assert.equal((await actor.client.request(`/v1/documents/${document.id}/restore`, { method: 'POST', csrf: actor.csrf })).response.status, 200); await assertAuditCount(h.prisma, document.id, 'document.restored', 1);
});
for (const [name, archived, activeRun, confirmation, status] of [['active document',false,false,'id',409], ['active related run',true,true,'id',409], ['incorrect confirmation',true,false,'wrong',400]] as const) {
  test(`permanent deletion rejects ${name} without removing records`, async () => {
    const actor = await createSignedInClient(h.baseUrl, h.prisma, `delete-${name}`); const document = await createDocumentFixture(h.prisma, actor.organization.id, { archived });
    if (activeRun) await createRunFixture(h.prisma, actor.organization.id, document.id, { status: 'running' });
    const value = confirmation === 'id' ? document.id : confirmation; const result = await actor.client.request(`/v1/documents/${document.id}/permanent`, { method: 'DELETE', csrf: actor.csrf, json: { confirmation: value } });
    assert.equal(result.response.status, status); assert.ok(await h.prisma.document.findUnique({ where: { id: document.id } })); await assertAuditCount(h.prisma, document.id, 'document.permanently_deleted', 0);
  });
}
test('document permanent deletion requires owner/admin and real CSRF', async () => {
  const owner = await createSignedInClient(h.baseUrl, h.prisma, 'delete-csrf'); const document = await createDocumentFixture(h.prisma, owner.organization.id, { archived: true });
  for (const csrf of [undefined, 'invalid-token-invalid-token']) assert.equal((await owner.client.request(`/v1/documents/${document.id}/permanent`, { method: 'DELETE', csrf, json: { confirmation: document.id } })).response.status, 403);
  const viewer = await createSignedInClient(h.baseUrl, h.prisma, 'delete-viewer', 'VIEWER'); const own = await createDocumentFixture(h.prisma, viewer.organization.id, { archived: true });
  assert.equal((await viewer.client.request(`/v1/documents/${own.id}/permanent`, { method: 'DELETE', csrf: viewer.csrf, json: { confirmation: own.id } })).response.status, 403);
});
test('document permanent deletion cleans persisted keys, cascades run data, preserves unrelated data, and leaves tombstone', async () => {
  const actor = await createSignedInClient(h.baseUrl, h.prisma, 'delete-success'); const document = await createDocumentFixture(h.prisma, actor.organization.id, { archived: true, storagePath: 'persisted/source.txt' }); const run = await createRunFixture(h.prisma, actor.organization.id, document.id); const sibling = await createDocumentFixture(h.prisma, actor.organization.id);
  await h.prisma.extractedSpec.create({ data: { organizationId: actor.organization.id, classificationRunId: run.id, sourceDocumentId: document.id, name: 'interface', value: 'PCIe', sourceSnippet: 'PCIe', importance: 'high', confidence: .9 } });
  const result = await actor.client.request(`/v1/documents/${document.id}/permanent`, { method: 'DELETE', csrf: actor.csrf, json: { confirmation: document.id, storagePath: 'client/evil' } });
  assert.equal(result.response.status, 200); assert.deepEqual(Object.keys(result.body as object).sort(), ['cleanup','id']); assert.equal(await h.prisma.document.findUnique({ where: { id: document.id } }), null); assert.ok(await h.prisma.document.findUnique({ where: { id: sibling.id } })); assert.ok(storage.attempts.includes('persisted/source.txt')); assert.ok(!storage.attempts.includes('client/evil')); await assertAuditCount(h.prisma, document.id, 'document.permanently_deleted', 1);
  assert.equal((await actor.client.request(`/v1/documents/${document.id}/permanent`, { method: 'DELETE', csrf: actor.csrf, json: { confirmation: document.id } })).response.status, 404);
});
for (const outcome of ['timeout','permission_denied','temporary_failure','unknown'] as const) {
  test(`document storage ${outcome} prevents false deletion success and preserves metadata`, async () => {
    storage.enqueue(outcome); const actor = await createSignedInClient(h.baseUrl, h.prisma, `doc-${outcome}`); const document = await createDocumentFixture(h.prisma, actor.organization.id, { archived: true });
    const result = await actor.client.request(`/v1/documents/${document.id}/permanent`, { method: 'DELETE', csrf: actor.csrf, json: { confirmation: document.id } }); assert.notEqual(result.response.status, 200); assert.ok(await h.prisma.document.findUnique({ where: { id: document.id } })); await assertAuditCount(h.prisma, document.id, 'document.deletion_failed', 1);
  });
}
test('confirmed missing document object permits idempotent metadata cleanup', async () => {
  storage.enqueue('missing'); const actor = await createSignedInClient(h.baseUrl, h.prisma, 'doc-missing'); const document = await createDocumentFixture(h.prisma, actor.organization.id, { archived: true });
  const result = await actor.client.request(`/v1/documents/${document.id}/permanent`, { method: 'DELETE', csrf: actor.csrf, json: { confirmation: document.id } }); assert.equal(result.response.status, 200); assert.deepEqual((result.body as {cleanup:string[]}).cleanup, ['missing']);
});
test('cross-organization document list and mutations are non-disclosing and preserve audit state', async () => {
  const a = await createSignedInClient(h.baseUrl, h.prisma, 'doc-org-a'); const b = await createSignedInClient(h.baseUrl, h.prisma, 'doc-org-b'); const document = await createDocumentFixture(h.prisma, b.organization.id, { archived: true });
  const listed = await a.client.request('/v1/documents?lifecycle=all'); assert.ok(!(listed.body as {id:string}[]).some((item) => item.id === document.id));
  for (const [method,path,json] of [['POST','restore',undefined],['POST','archive',undefined],['DELETE','permanent',{confirmation:document.id}]] as const) assert.equal((await a.client.request(`/v1/documents/${document.id}/${path}`, { method, csrf: a.csrf, json })).response.status, 404);
  assert.ok((await h.prisma.document.findUniqueOrThrow({ where: { id: document.id } })).archivedAt); assert.equal(await h.prisma.auditEvent.count({ where: { entityId: document.id } }), 0);
});
