const apiBase = process.env.API_BASE_URL ?? 'http://localhost:4000/v1';
const email = process.env.FIXTURE_EMAIL ?? 'owner@substrata.local';
const password = process.env.FIXTURE_PASSWORD ?? 'SubstrataDemoPass123!';
const cookies = new Map();

function updateCookies(response) {
  const values = response.headers.getSetCookie?.() ?? [];
  for (const value of values) {
    const [pair] = value.split(';');
    const separator = pair.indexOf('=');
    if (separator > 0) cookies.set(pair.slice(0, separator), pair.slice(separator + 1));
  }
}

function cookieHeader() {
  return [...cookies].map(([key, value]) => `${key}=${value}`).join('; ');
}

async function request(path, init = {}) {
  const headers = new Headers(init.headers ?? {});
  if (cookies.size) headers.set('cookie', cookieHeader());
  const csrf = cookies.get('substrata_session_csrf');
  if (csrf && init.method && init.method !== 'GET') headers.set('x-csrf-token', csrf);
  const response = await fetch(`${apiBase}${path}`, { ...init, headers });
  updateCookies(response);
  const body = response.status === 204 ? null : await response.json();
  if (!response.ok) throw new Error(`${init.method ?? 'GET'} ${path}: ${response.status} ${JSON.stringify(body)}`);
  return body;
}

await request('/auth/csrf');
await request('/auth/sign-in', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ email, password }),
});

const fixtures = [
  {
    key: 'ax920',
    title: 'AX920 NextGen AI Accelerator Card',
    fileName: 'AX920-datasheet.txt',
    rawText: `AX920 NextGen AI Accelerator Card
The AX920 is a PCIe Gen5 x16 AI accelerator card for server inference, training, and fine-tuning workloads. It includes 128 GB HBM3E high-bandwidth memory and delivers up to 310 TOPS INT8 and 155 TFLOPS FP16 performance. The exported card supports firmware signing and optional remote attestation. Exact memory bandwidth, interconnect bandwidth, security algorithms, key-management behavior, and shipping configuration depend on the selected SKU.`,
  },
  {
    key: 'secure-network-card',
    title: 'SecureLink 400G Network Interface Card',
    fileName: 'securelink-400g.txt',
    rawText: `SecureLink 400G Network Interface Card
PCIe network interface card with 400GbE Ethernet, MACsec, TLS offload, IPsec acceleration, secure boot, signed firmware, protected key storage, and HSM cryptographic acceleration. Algorithm, key length, key management, user-accessible cryptography, and export configuration details are supplied in the security guide.`,
  },
  {
    key: 'rf-transceiver',
    title: 'WaveCore mmWave RF Transceiver',
    fileName: 'wavecore-mmwave.txt',
    rawText: `WaveCore mmWave RF Transceiver
Radio transceiver and RF front-end operating from 24 GHz to 44 GHz with phased-array antenna support, integrated low noise amplifier and power amplifier. Output power, instantaneous bandwidth, modulation, radar use, operating temperature, and aerospace qualification vary by configuration.`,
  },
];

const results = [];
for (const fixture of fixtures) {
  const document = await request('/documents', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      title: fixture.title,
      fileName: fixture.fileName,
      mimeType: 'text/plain',
      rawText: fixture.rawText,
      origin: 'customer_provided',
      visibility: 'private',
    }),
  });
  const run = await request(`/documents/${document.id}/classification-runs`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ trigger: 'manual', executionPreference: 'local' }),
  });
  let completed = run;
  for (let attempt = 0; attempt < 90 && !['completed', 'needs_attention', 'failed', 'blocked'].includes(completed.status); attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    completed = await request(`/classification-runs/${run.id}`);
  }
  if (!['completed', 'needs_attention'].includes(completed.status)) {
    throw new Error(`${fixture.key} fixture did not complete: ${completed.status}`);
  }
  results.push({ key: fixture.key, runId: run.id, status: completed.status });
}

console.log(JSON.stringify(results, null, 2));
