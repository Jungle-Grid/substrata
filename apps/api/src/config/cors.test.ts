import assert from 'node:assert/strict';
import test from 'node:test';

import { buildCorsOptions } from '../app';
import { env } from './env';

test('CORS uses the configured web origin with credentials and CSRF header support', () => {
  const corsOptions = buildCorsOptions();

  assert.equal(corsOptions.origin, env.apiCorsOrigin);
  assert.notEqual(corsOptions.origin, '*');
  assert.equal(corsOptions.credentials, true);
  assert.match(
    JSON.stringify(corsOptions.allowedHeaders),
    /X-CSRF-Token/i,
  );
  assert.match(
    JSON.stringify(corsOptions.exposedHeaders),
    /x-substrata-csrf-refresh/i,
  );
});
