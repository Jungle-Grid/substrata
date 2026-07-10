import assert from 'node:assert/strict';
import test from 'node:test';

import { signOut, SessionExpiredError, uploadCompanyHistoryBatch, uploadDocument } from './api';

test('shared API requests include credentials and CSRF header', async () => {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init });
    return new Response(null, { status: 204 });
  }) as typeof fetch;

  try {
    await signOut('csrf-token');
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.equal(calls.length, 1);
  assert.match(calls[0]?.url ?? '', /\/auth\/sign-out$/);
  assert.equal(calls[0]?.init?.credentials, 'include');
  assert.equal(calls[0]?.init?.method, 'POST');
  const headers = new Headers(calls[0]?.init?.headers);
  assert.equal(headers.get('x-csrf-token'), 'csrf-token');
});

test('authenticated multipart upload preserves credentials and does not force content type', async () => {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init });
    return new Response(
      JSON.stringify({
        id: 'doc_123',
      }),
      {
        status: 201,
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );
  }) as typeof fetch;

  try {
    await uploadDocument({
      title: 'Datasheet',
      rawText: 'fallback text',
      file: new File(['sample'], 'chip.pdf', { type: 'application/pdf' }),
      csrfToken: 'csrf-token',
    });
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.equal(calls.length, 1);
  assert.match(calls[0]?.url ?? '', /\/documents\/upload$/);
  assert.equal(calls[0]?.init?.credentials, 'include');
  const headers = new Headers(calls[0]?.init?.headers);
  assert.equal(headers.get('x-csrf-token'), 'csrf-token');
  assert.equal(headers.has('Content-Type'), false);
  assert.equal(calls[0]?.init?.body instanceof FormData, true);
});

test('Company History batch upload uses the private history endpoint with credentialed multipart form data', async () => {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init });
    return new Response(JSON.stringify({ id: 'batch_123', status: 'queued', totals: null, documents: [] }), {
      status: 202,
      headers: { 'Content-Type': 'application/json' },
    });
  }) as typeof fetch;

  try {
    await uploadCompanyHistoryBatch({
      recordType: 'prior_memo',
      files: [new File(['Prior internal review'], 'prior-review.txt', { type: 'text/plain' })],
      csrfToken: 'csrf-token',
    });
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.match(calls[0]?.url ?? '', /\/history\/batches$/);
  assert.equal(calls[0]?.init?.credentials, 'include');
  assert.equal(calls[0]?.init?.body instanceof FormData, true);
  assert.equal(new Headers(calls[0]?.init?.headers).get('x-csrf-token'), 'csrf-token');
});

test('protected 401 responses redirect to sign-in with a safe return path', async () => {
  const originalFetch = globalThis.fetch;
  const originalWindow = globalThis.window;
  let redirectedTo = '';

  globalThis.fetch = (async () =>
    new Response(
      JSON.stringify({
        message: 'Authentication is required.',
      }),
      {
        status: 401,
        headers: {
          'Content-Type': 'application/json',
        },
      },
    )) as typeof fetch;

  globalThis.window = {
    location: {
      pathname: '/app/documents/new',
      search: '?draft=1',
      assign: (href: string) => {
        redirectedTo = href;
      },
    },
  } as never;

  try {
    await assert.rejects(
      () =>
        uploadDocument({
          title: 'Datasheet',
          file: new File(['sample'], 'chip.pdf', { type: 'application/pdf' }),
          csrfToken: 'csrf-token',
        }),
      SessionExpiredError,
    );
  } finally {
    globalThis.fetch = originalFetch;
    globalThis.window = originalWindow;
  }

  assert.equal(
    redirectedTo,
    '/sign-in?next=%2Fapp%2Fdocuments%2Fnew%3Fdraft%3D1',
  );
});
