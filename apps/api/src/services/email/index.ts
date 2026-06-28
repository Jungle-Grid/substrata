import { env } from '../../config/env';
import { FakeTransactionalEmailService } from './fake-mailer';
import { ZeptoMailTransactionalEmailService } from './zeptomail';

export function createTransactionalEmailService() {
  if (env.zeptoMailApiToken) {
    return new ZeptoMailTransactionalEmailService();
  }

  return new FakeTransactionalEmailService();
}
