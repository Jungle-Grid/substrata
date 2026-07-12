import { randomBytes } from 'node:crypto';

export const administrativeDatabaseUrl = process.env.TEST_DATABASE_URL;
if (!administrativeDatabaseUrl) throw new Error('TEST_DATABASE_URL is required for integration tests.');

export const temporaryDatabaseName = `substrata_test_${Date.now()}_${randomBytes(6).toString('hex')}`;
if (
  !temporaryDatabaseName ||
  ['undefined', 'null'].includes(temporaryDatabaseName) ||
  !/^substrata_test_[a-z0-9_]+$/.test(temporaryDatabaseName)
) throw new Error('Unsafe temporary database name.');

const parsed = new URL(administrativeDatabaseUrl);
if (parsed.pathname.replace(/^\//, '') !== 'substrata') throw new Error('TEST_DATABASE_URL must reference the local administrative database.');
parsed.pathname = `/${temporaryDatabaseName}`;
export const temporaryDatabaseUrl = parsed.toString();
if (new URL(temporaryDatabaseUrl).pathname.replace(/^\//, '') !== temporaryDatabaseName) {
  throw new Error('Temporary database URL does not contain the validated database name.');
}

export function activateTestEnvironment() {
  process.env.DATABASE_URL = temporaryDatabaseUrl;
  process.env.NODE_ENV = 'test';
}
