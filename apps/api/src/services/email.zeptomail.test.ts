import assert from 'node:assert/strict';
import test from 'node:test';

import { FakeTransactionalEmailService } from './email/fake-mailer';
import { ZeptoMailTransactionalEmailService } from './email/zeptomail';

test('ZeptoMail provider sends the expected endpoint, headers, and payload', async () => {
  const fetchCalls: Array<{ url: string; init?: RequestInit }> = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
    fetchCalls.push({ url: String(url), init });
    return new Response('{}', {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }) as typeof fetch;

  try {
    const service = new ZeptoMailTransactionalEmailService({
      apiToken: 'send-mail-token',
      fromAddress: 'no-reply@substrata.test',
      fromName: 'Substrata',
      replyTo: 'support@substrata.test',
    });

    await service.sendVerificationEmail({
      to: 'reviewer@example.com',
      name: 'Reviewer Name',
      verificationUrl: 'https://app.substrata.test/verify-email?token=opaque-token',
      expiresInText: 'in 24 hours',
      clientReference: 'auth.verify_email:user_123',
    });
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.equal(fetchCalls.length, 1);
  assert.equal(fetchCalls[0]?.url, 'https://api.zeptomail.com/v1.1/email');
  assert.equal(fetchCalls[0]?.init?.method, 'POST');

  const headers = new Headers(fetchCalls[0]?.init?.headers);
  assert.equal(headers.get('Accept'), 'application/json');
  assert.equal(headers.get('Content-Type'), 'application/json');
  assert.equal(headers.get('Authorization'), 'Zoho-enczapikey send-mail-token');

  const payload = JSON.parse(String(fetchCalls[0]?.init?.body)) as Record<string, unknown>;
  assert.deepEqual(payload.from, {
    address: 'no-reply@substrata.test',
    name: 'Substrata',
  });
  assert.deepEqual(payload.reply_to, [
    {
      address: 'support@substrata.test',
      name: 'Substrata',
    },
  ]);
  assert.equal(payload.track_clicks, false);
  assert.equal(payload.track_opens, false);
  assert.equal(payload.client_reference, 'auth.verify_email:user_123');
  assert.match(String(payload.htmlbody), /verify-email\?token=opaque-token/);
  assert.match(String(payload.textbody), /verify-email\?token=opaque-token/);
});

test('ZeptoMail provider surfaces safe diagnostics without leaking secrets', async () => {
  const logged: Array<unknown[]> = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () =>
    new Response(
      JSON.stringify({
        error: {
          code: 'invalid_mailbox',
          message: 'Recipient mailbox rejected the request.',
          request_id: 'req_123',
        },
      }),
      {
        status: 422,
        headers: {
          'Content-Type': 'application/json',
        },
      },
    )) as typeof fetch;

  try {
    const service = new ZeptoMailTransactionalEmailService({
      apiToken: 'secret-token',
      fromAddress: 'no-reply@substrata.test',
      fromName: 'Substrata',
      logger: {
        error: (...args: unknown[]) => {
          logged.push(args);
        },
      },
    });

    await assert.rejects(
      () =>
        service.sendPasswordResetEmail({
          to: 'reviewer@example.com',
          name: 'Reviewer Name',
          resetUrl: 'https://app.substrata.test/reset-password?token=secret-reset-token',
          expiresInText: 'in 1 hour',
          clientReference: 'auth.password_reset:user_123',
        }),
      /Recipient mailbox rejected the request/,
    );
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.equal(logged.length, 1);
  const logText = JSON.stringify(logged[0]);
  assert.match(logText, /invalid_mailbox/);
  assert.match(logText, /req_123/);
  assert.doesNotMatch(logText, /secret-token/);
  assert.doesNotMatch(logText, /secret-reset-token/);
  assert.doesNotMatch(logText, /reviewer@example\.com/);
});

test('console provider does not make network requests', async () => {
  let fetchCalled = false;
  const previews: Array<unknown[]> = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () => {
    fetchCalled = true;
    return new Response('{}', { status: 200 });
  }) as typeof fetch;

  try {
    const service = new FakeTransactionalEmailService({
      info: (...args: unknown[]) => {
        previews.push(args);
      },
    });

    await service.sendVerificationEmail({
      to: 'reviewer@example.com',
      name: 'Reviewer Name',
      verificationUrl: 'https://app.substrata.test/verify-email?token=opaque-token',
      expiresInText: 'in 24 hours',
      clientReference: 'auth.verify_email:user_123',
    });
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.equal(fetchCalled, false);
  assert.equal(previews.length, 1);
});
