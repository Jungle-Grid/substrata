import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';

const webBase = process.env.WEB_BASE_URL ?? 'http://localhost:3001';
const apiBase = process.env.API_BASE_URL ?? 'http://localhost:4000/v1';
const outputDir = new URL('../artifacts/screenshots/', import.meta.url);
const runs = {
  'ax920-before': 'run_fixture_ax920_before',
  'ax920-after': 'cmrfe6k2m0009ht8xpei0masz',
  'secure-network-card-after': 'cmrfe6lx1007yht8xqkvgainv',
  'rf-transceiver-after': 'cmrfe6ntk00dzht8xpaul3mx6',
};
const selectedNames = new Set(
  (process.env.CAPTURE_NAMES ?? `${Object.keys(runs).join(',')},ax920-after-mobile`)
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean),
);

const cookieJar = new Map();
function absorbCookies(response) {
  for (const header of response.headers.getSetCookie?.() ?? []) {
    const [pair] = header.split(';');
    const index = pair.indexOf('=');
    if (index > 0) cookieJar.set(pair.slice(0, index), pair.slice(index + 1));
  }
}
async function apiRequest(path, init = {}) {
  const headers = new Headers(init.headers ?? {});
  if (cookieJar.size) headers.set('cookie', [...cookieJar].map(([key, value]) => `${key}=${value}`).join('; '));
  const csrf = cookieJar.get('substrata_session_csrf');
  if (csrf && init.method === 'POST') headers.set('x-csrf-token', csrf);
  const response = await fetch(`${apiBase}${path}`, { ...init, headers });
  absorbCookies(response);
  if (!response.ok) throw new Error(`API request failed: ${response.status} ${path}`);
  return response;
}

await apiRequest('/auth/csrf');
await apiRequest('/auth/sign-in', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ email: 'owner@substrata.local', password: 'SubstrataDemoPass123!' }),
});

await fs.mkdir(outputDir, { recursive: true });
const chrome = spawn('/usr/bin/google-chrome', [
  '--headless=new',
  '--no-sandbox',
  '--disable-dev-shm-usage',
  '--hide-scrollbars',
  '--remote-debugging-port=9222',
  '--user-data-dir=/tmp/substrata-hybrid-screenshot-chrome',
  'about:blank',
], { stdio: 'ignore' });

async function waitForDebugger() {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      const response = await fetch('http://localhost:9222/json/list');
      if (response.ok) {
        const targets = await response.json();
        const page = targets.find((target) => target.type === 'page');
        if (page) return page;
      }
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error('Chrome debugging endpoint did not become ready.');
}

const debuggerTarget = await waitForDebugger();
const socket = new WebSocket(debuggerTarget.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  socket.addEventListener('open', resolve, { once: true });
  socket.addEventListener('error', reject, { once: true });
});

let sequence = 0;
const pending = new Map();
socket.addEventListener('message', (event) => {
  const message = JSON.parse(event.data);
  if (!message.id) return;
  const handler = pending.get(message.id);
  if (!handler) return;
  pending.delete(message.id);
  if (message.error) handler.reject(new Error(message.error.message));
  else handler.resolve(message.result);
});
function send(method, params = {}) {
  const id = ++sequence;
  socket.send(JSON.stringify({ id, method, params }));
  return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
}

await send('Page.enable');
await send('Runtime.enable');
await send('Network.enable');
for (const [name, value] of cookieJar) {
  await send('Network.setCookie', { name, value, domain: 'localhost', path: '/', secure: false });
}

async function capture(name, runId, width, height) {
  await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 600 });
  await send('Page.navigate', { url: `${webBase}/app/reviews/${runId}?tab=review-paths` });
  let targetFound = false;
  for (let attempt = 0; attempt < 90 && !targetFound; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const evaluation = await send('Runtime.evaluate', {
      expression: `(() => {
        const headings = [...document.querySelectorAll('h2')];
        const target = headings.find((node) => node.textContent?.includes('ECCN review candidates'));
        if (target) {
          target.scrollIntoView({ block: 'start' });
          window.scrollBy(0, window.innerWidth < 600 ? -260 : -220);
        }
        return Boolean(target);
      })()`,
      returnByValue: true,
    });
    targetFound = evaluation.result?.value === true;
  }
  if (!targetFound) throw new Error(`Candidate panel did not render for ${name}.`);
  await new Promise((resolve) => setTimeout(resolve, 1500));
  let screenshot;
  if (process.env.CLIP_PANEL === '1') {
    const location = await send('Runtime.evaluate', {
      expression: `(() => {
        const target = [...document.querySelectorAll('h2')].find((node) => node.textContent?.includes('ECCN review candidates'));
        const panel = target?.closest('section');
        const rect = panel?.getBoundingClientRect();
        const top = rect ? rect.top + window.scrollY : 0;
        window.scrollTo(0, 0);
        return rect ? { top, height: rect.height } : null;
      })()`,
      returnByValue: true,
    });
    const bounds = location.result?.value;
    if (!bounds) throw new Error(`Candidate panel bounds unavailable for ${name}.`);
    screenshot = await send('Page.captureScreenshot', {
      format: 'png',
      fromSurface: true,
      captureBeyondViewport: true,
      clip: { x: 280, y: Math.max(0, bounds.top - 24), width: 1144, height: Math.min(1100, bounds.height + 48), scale: 1 },
    });
  } else {
    screenshot = await send('Page.captureScreenshot', { format: 'png', fromSurface: true });
  }
  await fs.writeFile(new URL(`${name}.png`, outputDir), Buffer.from(screenshot.data, 'base64'));
}

try {
  for (const [name, runId] of Object.entries(runs)) {
    if (selectedNames.has(name)) await capture(name, runId, 1440, 1100);
  }
  if (selectedNames.has('ax920-after-mobile')) await capture('ax920-after-mobile', runs['ax920-after'], 390, 844);
  console.log([...selectedNames].map((name) => `artifacts/screenshots/${name}.png`).join('\n'));
} finally {
  socket.close();
  chrome.kill('SIGTERM');
}
