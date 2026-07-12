import assert from 'node:assert/strict';
import type { TestPrisma } from './test-database';

export async function assertAuditCount(prisma: TestPrisma, entityId: string, action: string, expected: number) {
  assert.equal(await prisma.auditEvent.count({ where: { entityId, action } }), expected);
}
export function assertErrorBody(body: unknown) {
  assert.equal(typeof body, 'object');
  assert.ok(body && typeof body === 'object' && ('error' in body || 'message' in body));
}
