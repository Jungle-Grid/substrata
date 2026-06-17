import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(currentDir, '../../../..');

dotenv.config({ path: path.join(repoRoot, '.env') });
dotenv.config();

export const env = {
  apiPort: Number(process.env.API_PORT ?? 4000),
  apiCorsOrigin: process.env.API_CORS_ORIGIN ?? 'http://localhost:3000',
  mockOrganizationId: process.env.MOCK_ORGANIZATION_ID,
  mockUserId: process.env.MOCK_USER_ID,
  mockUserEmail: process.env.MOCK_USER_EMAIL ?? 'reviewer@substrata.local',
};
