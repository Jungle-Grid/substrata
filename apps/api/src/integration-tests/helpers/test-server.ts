import type { Server } from 'node:http';
import type { StorageDriver } from '../../services/storage';
import type { RemoteCancellationClient } from '../../services/lifecycle.service';
import { createTestDatabase, dropTestDatabase, type TestPrisma } from './test-database';

export type IntegrationHarness = { prisma: TestPrisma; server: Server; baseUrl: string };
export async function startHarness(storage?: StorageDriver, remoteCancellation?: RemoteCancellationClient): Promise<IntegrationHarness> {
  const prisma = await createTestDatabase();
  const { createApp } = await import('../../app');
  const server = createApp({ storage, remoteCancellation }).listen(0);
  await new Promise<void>((resolve) => server.once('listening', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Ephemeral listener did not expose a port.');
  return { prisma, server, baseUrl: `http://127.0.0.1:${address.port}` };
}
export async function stopHarness(harness: IntegrationHarness) {
  await new Promise<void>((resolve, reject) => harness.server.close((error) => error ? reject(error) : resolve()));
  await dropTestDatabase(harness.prisma);
}
