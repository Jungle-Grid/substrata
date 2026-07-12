import assert from 'node:assert/strict';

export class HttpClient {
  private readonly cookies = new Map<string, string>();
  constructor(private readonly baseUrl: string) {}
  async request(path: string, init: RequestInit & { csrf?: string; json?: unknown } = {}) {
    const headers = new Headers(init.headers);
    if (this.cookies.size) headers.set('cookie', [...this.cookies].map(([key, value]) => `${key}=${value}`).join('; '));
    if (init.csrf) headers.set('x-csrf-token', init.csrf);
    const body = init.json === undefined ? init.body : JSON.stringify(init.json);
    if (body) headers.set('content-type', 'application/json');
    const response = await fetch(`${this.baseUrl}${path}`, { ...init, body, headers, redirect: 'manual' });
    for (const raw of response.headers.getSetCookie?.() ?? []) {
      const [pair] = raw.split(';'); const index = pair.indexOf('=');
      if (index > 0) this.cookies.set(pair.slice(0, index), pair.slice(index + 1));
    }
    return { response, body: await response.json().catch(() => null) };
  }
  async csrf() {
    const result = await this.request('/v1/auth/csrf');
    assert.equal(result.response.status, 200);
    return (result.body as { csrfToken: string }).csrfToken;
  }
}
