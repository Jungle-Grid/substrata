import assert from 'node:assert/strict';
import test from 'node:test';
import {
  defaultWorkspaceName,
  hashOpaqueToken,
  hashPassword,
  normalizeEmail,
  verifyPassword,
} from './security';

test('normalizeEmail trims and lowercases', () => {
  assert.equal(normalizeEmail('  Reviewer@Example.COM '), 'reviewer@example.com');
});

test('hashOpaqueToken is deterministic for the same token', () => {
  assert.equal(hashOpaqueToken('abc123'), hashOpaqueToken('abc123'));
});

test('password hashes verify correctly', async () => {
  const password = 'SubstrataPassword123';
  const hash = await hashPassword(password);
  assert.notEqual(hash, password);
  assert.equal(await verifyPassword(password, hash), true);
  assert.equal(await verifyPassword('wrong-password', hash), false);
});

test('defaultWorkspaceName uses the supplied name', () => {
  assert.equal(defaultWorkspaceName('Jane Doe'), "Jane Doe's Workspace");
});
