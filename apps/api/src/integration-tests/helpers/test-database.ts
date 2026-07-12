import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { activateTestEnvironment, administrativeDatabaseUrl, temporaryDatabaseName, temporaryDatabaseUrl } from './environment';

const execFileAsync = promisify(execFile);
export type TestPrisma = typeof import('@substrata/db').prisma;

async function command(name: string, args: string[]) {
  return execFileAsync(name, args, { cwd: process.cwd(), env: { ...process.env, DATABASE_URL: temporaryDatabaseUrl } });
}

export async function createTestDatabase() {
  await command('psql', [administrativeDatabaseUrl!, '-v', 'ON_ERROR_STOP=1', '-c', `CREATE DATABASE ${temporaryDatabaseName}`]);
  activateTestEnvironment();
  await command('corepack', ['pnpm', '--filter', '@substrata/db', 'exec', 'prisma', 'migrate', 'deploy', '--schema', 'prisma/schema.prisma']);
  return (await import('@substrata/db')).prisma;
}

export async function dropTestDatabase(prisma?: TestPrisma) {
  if (prisma) await prisma.$disconnect();
  await execFileAsync('psql', [administrativeDatabaseUrl!, '-v', 'ON_ERROR_STOP=1', '-c', `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${temporaryDatabaseName}' AND pid <> pg_backend_pid();`, '-c', `DROP DATABASE ${temporaryDatabaseName}`]);
}
