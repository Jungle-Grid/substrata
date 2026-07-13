import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import test from 'node:test';

import { createApp } from '../app';

async function startTestServer(input: { healthCheck: () => Promise<void> }) {
  const app = createApp({ healthCheck: input.healthCheck });
  const server = await new Promise<Server>((resolve) => {
    const listening = app.listen(0, '127.0.0.1', () => resolve(listening));
  });
  const address = server.address();
  if (!address || typeof address === 'string') {
    server.close();
    throw new Error('Test server did not bind to an ephemeral port.');
  }

  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      }),
  };
}

test('GET /v1/health is public before the global authentication guard', async (t) => {
  const server = await startTestServer({ healthCheck: async () => undefined });
  t.after(server.close);

  const healthResponse = await fetch(`${server.baseUrl}/v1/health`, {
    headers: { cookie: 'substrata_session=invalid-unauthenticated-token' },
  });
  assert.equal(healthResponse.status, 200);
  assert.deepEqual(
    Object.keys((await healthResponse.clone().json()) as object).sort(),
    ['database', 'ok', 'service', 'time'],
  );
  const health = (await healthResponse.json()) as Record<string, unknown>;
  assert.equal(health.ok, true);
  assert.equal(health.service, 'substrata-api');
  assert.equal(health.database, 'ok');
  assert.match(String(health.time), /^\d{4}-\d{2}-\d{2}T/);

  const protectedResponse = await fetch(`${server.baseUrl}/v1/documents`);
  assert.equal(protectedResponse.status, 401);
  const protectedBody = (await protectedResponse.json()) as Record<
    string,
    unknown
  >;
  assert.equal(protectedBody.message, 'Authentication is required.');
});

test('authentication bootstrap remains public', async (t) => {
  const server = await startTestServer({ healthCheck: async () => undefined });
  t.after(server.close);

  const response = await fetch(`${server.baseUrl}/v1/auth/csrf`);
  assert.equal(response.status, 200);
  const body = (await response.json()) as Record<string, unknown>;
  assert.equal(typeof body.csrfToken, 'string');
});

test('database health failure returns a sanitized 503 response', async (t) => {
  const server = await startTestServer({
    healthCheck: async () => {
      throw new Error('sensitive database connection detail');
    },
  });
  t.after(server.close);

  const response = await fetch(`${server.baseUrl}/v1/health`);
  assert.equal(response.status, 503);
  const body = await response.json();
  assert.deepEqual(body, {
    ok: false,
    service: 'substrata-api',
    database: 'unavailable',
  });
  assert.doesNotMatch(JSON.stringify(body), /sensitive|connection/i);
});
