import assert from 'node:assert/strict';
import test from 'node:test';

import { prisma } from '@substrata/db';

import {
  buildResetUrl,
  buildVerificationUrl,
  requestPasswordReset,
  resendVerificationEmail,
} from './auth.service';
import { setTransactionalEmailServiceForTests } from './email';

test('verification and reset links use the existing web app routes', () => {
  assert.equal(
    buildVerificationUrl('opaque token'),
    'http://localhost:3000/verify-email?token=opaque%20token',
  );
  assert.equal(
    buildResetUrl('opaque token'),
    'http://localhost:3000/reset-password?token=opaque%20token',
  );
});

test('forgot-password keeps anti-enumeration behavior when no password user exists', async () => {
  const originalFindUnique = prisma.user.findUnique;
  prisma.user.findUnique = (async () => null) as unknown as typeof prisma.user.findUnique;

  let mailAttempted = false;
  setTransactionalEmailServiceForTests({
    async sendVerificationEmail() {
      mailAttempted = true;
    },
    async sendPasswordResetEmail() {
      mailAttempted = true;
    },
    async sendWorkspaceInviteEmail() {
      mailAttempted = true;
    },
  });

  try {
    await assert.doesNotReject(() => requestPasswordReset('missing@example.com'));
    assert.equal(mailAttempted, false);
  } finally {
    prisma.user.findUnique = originalFindUnique;
    setTransactionalEmailServiceForTests(null);
  }
});

test('resend verification keeps anti-enumeration behavior when the account is missing', async () => {
  const originalFindUnique = prisma.user.findUnique;
  prisma.user.findUnique = (async () => null) as unknown as typeof prisma.user.findUnique;

  let mailAttempted = false;
  setTransactionalEmailServiceForTests({
    async sendVerificationEmail() {
      mailAttempted = true;
    },
    async sendPasswordResetEmail() {
      mailAttempted = true;
    },
    async sendWorkspaceInviteEmail() {
      mailAttempted = true;
    },
  });

  try {
    await assert.doesNotReject(() => resendVerificationEmail('missing@example.com'));
    assert.equal(mailAttempted, false);
  } finally {
    prisma.user.findUnique = originalFindUnique;
    setTransactionalEmailServiceForTests(null);
  }
});
