import assert from 'node:assert/strict';
import test from 'node:test';
import { NoRemoteProviderAvailable, selectExecutionProvider } from './execution-router.service';

const keys = ['LOCAL_GEMMA_ENABLED', 'FIREWORKS_ENABLED', 'FIREWORKS_API_KEY', 'JUNGLEGRID_ENABLED', 'JUNGLE_GRID_API_KEY', 'AMD_NOTEBOOK_MANUAL_ENABLED', 'REMOTE_PROVIDER_PRIORITY'] as const;

function withEnv(values: Partial<Record<(typeof keys)[number], string>>, run: () => void) {
  const original = new Map(keys.map((key) => [key, process.env[key]]));
  try {
    for (const key of keys) {
      if (values[key] === undefined) delete process.env[key];
      else process.env[key] = values[key];
    }
    run();
  } finally {
    for (const key of keys) {
      const value = original.get(key);
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  }
}

test('local mode always selects Gemma Local', () => {
  withEnv({ LOCAL_GEMMA_ENABLED: 'true', FIREWORKS_ENABLED: 'true', FIREWORKS_API_KEY: 'configured' }, () => {
    assert.equal(selectExecutionProvider('local').selectedProvider, 'gemma_local');
  });
});

test('remote mode follows configured provider priority', () => {
  withEnv({ JUNGLEGRID_ENABLED: 'true', JUNGLE_GRID_API_KEY: 'configured', FIREWORKS_ENABLED: 'true', FIREWORKS_API_KEY: 'configured' }, () => {
    assert.equal(selectExecutionProvider('remote').selectedProvider, 'junglegrid');
  });
});

test('remote mode fails clearly when no provider is configured', () => {
  withEnv({ JUNGLEGRID_ENABLED: 'false', FIREWORKS_ENABLED: 'false', AMD_NOTEBOOK_MANUAL_ENABLED: 'false' }, () => {
    assert.throws(() => selectExecutionProvider('remote'), NoRemoteProviderAvailable);
  });
});
