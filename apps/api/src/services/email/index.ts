import { env } from '../../config/env';
import { FakeTransactionalEmailService } from './fake-mailer';
import type { TransactionalEmailService } from './types';
import { ZeptoMailTransactionalEmailService } from './zeptomail';

let cachedService: TransactionalEmailService | null = null;
let testOverride: TransactionalEmailService | null = null;

export function createTransactionalEmailService() {
  if (env.emailProvider === 'zeptomail') {
    return new ZeptoMailTransactionalEmailService({
      apiToken: env.zeptomailSendMailToken,
      fromAddress: env.emailFromAddress,
      fromName: env.emailFromName,
      replyTo: env.emailReplyTo || undefined,
    });
  }

  return new FakeTransactionalEmailService();
}

export function getTransactionalEmailService() {
  if (testOverride) {
    return testOverride;
  }

  cachedService ??= createTransactionalEmailService();
  return cachedService;
}

export function setTransactionalEmailServiceForTests(
  service: TransactionalEmailService | null,
) {
  testOverride = service;
  cachedService = null;
}
