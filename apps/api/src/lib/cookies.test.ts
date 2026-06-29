import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildCookieScope,
  buildHostOnlyCookieScope,
  clearSessionCookies,
  setSessionCookies,
} from './cookies';

function createMockResponse() {
  const values: string[] = [];
  return {
    values,
    res: {
      append(name: string, value: string) {
        if (name === 'Set-Cookie') {
          values.push(value);
        }
      },
    },
  };
}

function normalizeCookieAttributes(serializedCookie: string) {
  return serializedCookie
    .split(';')
    .slice(1)
    .map((part) => part.trim().toLowerCase())
    .filter((part) => !part.startsWith('expires=') && !part.startsWith('max-age='))
    .sort();
}

test('cookie scope uses explicit production domain when provided', () => {
  assert.deepEqual(
    buildCookieScope({
      isProduction: true,
      sessionCookieDomain: '.junglegrid.dev',
    }),
    {
      sameSite: 'lax',
      secure: true,
      domain: '.junglegrid.dev',
      path: '/',
    },
  );
});

test('host-only cookie scope omits domain for legacy cookie cleanup', () => {
  assert.deepEqual(buildHostOnlyCookieScope({ isProduction: true }), {
    sameSite: 'lax',
    secure: true,
    path: '/',
  });
});

test('session cookies and cleared cookies use the same scope attributes', () => {
  const setCookies = createMockResponse();
  setSessionCookies({
    res: setCookies.res as never,
    sessionToken: 'session-token',
    csrfToken: 'csrf-token',
  });

  const clearedCookies = createMockResponse();
  clearSessionCookies(clearedCookies.res as never);

  assert.equal(setCookies.values.length, 2);
  assert.equal(clearedCookies.values.length, 2);

  assert.deepEqual(
    normalizeCookieAttributes(setCookies.values[0] ?? ''),
    normalizeCookieAttributes(clearedCookies.values[0] ?? ''),
  );
  assert.deepEqual(
    normalizeCookieAttributes(setCookies.values[1] ?? ''),
    normalizeCookieAttributes(clearedCookies.values[1] ?? ''),
  );
});
