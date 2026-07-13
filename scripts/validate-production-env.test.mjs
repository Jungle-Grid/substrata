import assert from 'node:assert/strict';
import test from 'node:test';
import {
  resolveEnvFileArgument,
  validateProductionEnv,
} from './validate-production-env.mjs';

function validEnv(overrides = {}) {
  return {
    NODE_ENV: 'production',
    POSTGRES_DB: 'substrata',
    POSTGRES_USER: 'substrata',
    POSTGRES_PASSWORD: 'StrongUrlSafePassword123',
    APP_URL: 'https://substrata.example.com',
    WEB_APP_URL: 'https://substrata.example.com',
    API_URL: 'https://api.substrata.example.com',
    NEXT_PUBLIC_API_BASE_URL: 'https://api.substrata.example.com',
    API_CORS_ORIGIN: 'https://substrata.example.com',
    API_PORT: '4100',
    WEB_PORT: '3100',
    SESSION_SECRET: 'a-secure-production-session-secret-123456',
    EMAIL_PROVIDER: 'zeptomail',
    ZEPTOMAIL_SEND_MAIL_TOKEN: 'configured-token',
    EMAIL_FROM_ADDRESS: 'noreply@example.com',
    STORAGE_DRIVER: 'local',
    GOOGLE_OAUTH_ENABLED: 'false',
    GEMINI_ENABLED: 'false',
    LOCAL_GEMMA_ENABLED: 'false',
    FIREWORKS_ENABLED: 'false',
    JUNGLE_GRID_ENABLED: 'false',
    AMD_NOTEBOOK_MANUAL_ENABLED: 'false',
    AI_FALLBACK_TO_HEURISTIC: 'false',
    ...overrides,
  };
}

function errors(overrides) {
  return validateProductionEnv(validEnv(overrides)).errors;
}

test('valid minimal production configuration succeeds', () => {
  assert.deepEqual(validateProductionEnv(validEnv()).errors, []);
});

test('validator defaults to the untracked production file', () => {
  assert.equal(resolveEnvFileArgument([]), 'infra/.env.production');
  assert.equal(
    resolveEnvFileArgument(['--env-file', '/tmp/safe.env']),
    '/tmp/safe.env',
  );
});

test('missing SESSION_SECRET fails', () => {
  assert.ok(
    errors({ SESSION_SECRET: '' }).some((message) =>
      message.includes('SESSION_SECRET'),
    ),
  );
});

test('insecure SESSION_SECRET fails', () => {
  assert.ok(
    errors({
      SESSION_SECRET: 'local-demo-only-replace-before-any-shared-deployment',
    }).some((message) => message.includes('SESSION_SECRET')),
  );
});

test('ZeptoMail requires a token', () => {
  assert.ok(
    errors({ ZEPTOMAIL_SEND_MAIL_TOKEN: '', ZEPTO_MAIL_API_TOKEN: '' }).some(
      (message) => message.includes('ZEPTOMAIL_SEND_MAIL_TOKEN'),
    ),
  );
});

test('Gemini enabled requires its key', () => {
  assert.ok(
    errors({ GEMINI_ENABLED: 'true', GEMINI_API_KEY: '' }).some((message) =>
      message.includes('GEMINI_API_KEY'),
    ),
  );
});

test('Fireworks enabled requires its key', () => {
  assert.ok(
    errors({ FIREWORKS_ENABLED: 'true', FIREWORKS_API_KEY: '' }).some(
      (message) => message.includes('FIREWORKS_API_KEY'),
    ),
  );
});

test('Jungle Grid enabled requires its key', () => {
  assert.ok(
    errors({ JUNGLE_GRID_ENABLED: 'true', JUNGLE_GRID_API_KEY: '' }).some(
      (message) => message.includes('JUNGLE_GRID_API_KEY'),
    ),
  );
});

test('invalid URLs fail', () => {
  assert.ok(
    errors({ API_URL: 'api:4100' }).some((message) =>
      message.includes('API_URL'),
    ),
  );
});

test('invalid ports fail', () => {
  assert.ok(
    errors({ API_PORT: '70000' }).some((message) =>
      message.includes('API_PORT'),
    ),
  );
});

test('deprecated ZeptoMail alias is accepted with a warning', () => {
  const result = validateProductionEnv(
    validEnv({
      ZEPTOMAIL_SEND_MAIL_TOKEN: '',
      ZEPTO_MAIL_API_TOKEN: 'legacy-token',
    }),
  );
  assert.deepEqual(result.errors, []);
  assert.ok(
    result.warnings.some((message) => message.includes('ZEPTO_MAIL_API_TOKEN')),
  );
});

test('deprecated Jungle Grid alias remains accepted', () => {
  const result = validateProductionEnv(
    validEnv({
      JUNGLE_GRID_ENABLED: '',
      JUNGLEGRID_ENABLED: 'true',
      JUNGLE_GRID_API_KEY: 'configured',
    }),
  );
  assert.deepEqual(result.errors, []);
  assert.ok(
    result.warnings.some((message) => message.includes('JUNGLEGRID_ENABLED')),
  );
});
