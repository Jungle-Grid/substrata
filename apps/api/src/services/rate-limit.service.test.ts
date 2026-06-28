import assert from 'node:assert/strict';
import test from 'node:test';
import { assertRateLimit } from './rate-limit.service';

test('rate limiter rejects after the configured limit', () => {
  const key = `test-limit-${Date.now()}`;
  assert.doesNotThrow(() =>
    assertRateLimit({
      key,
      limit: 1,
      windowMs: 60_000,
    }),
  );

  assert.throws(
    () =>
      assertRateLimit({
        key,
        limit: 1,
        windowMs: 60_000,
      }),
    /Too many requests/,
  );
});
