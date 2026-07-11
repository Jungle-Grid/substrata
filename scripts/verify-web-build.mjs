import fs from 'node:fs';
import path from 'node:path';

const webRoot = path.resolve(import.meta.dirname, '../apps/web');
const buildIdPath = path.join(webRoot, '.next/BUILD_ID');
const standaloneServerPath = path.join(webRoot, '.next/standalone/apps/web/server.js');

if (!fs.existsSync(buildIdPath)) {
  throw new Error('Next production build did not create apps/web/.next/BUILD_ID.');
}

const buildId = fs.readFileSync(buildIdPath, 'utf8').trim();
if (!buildId) {
  throw new Error('Next production BUILD_ID is empty.');
}

if (!fs.existsSync(standaloneServerPath)) {
  throw new Error('Next standalone server artifact is missing.');
}

console.log(`Verified Next production build ${buildId}.`);
