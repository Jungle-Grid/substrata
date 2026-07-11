export type ExecutionMode = 'local' | 'remote';
export type ExecutionProvider =
  | 'gemma_local'
  | 'fireworks'
  | 'junglegrid'
  | 'amd_notebook_manual';

export interface RemoteExecutionProvider {
  name: Exclude<ExecutionProvider, 'gemma_local'>;
  isEnabled(): boolean;
  healthCheck(): Promise<boolean>;
  submitClassificationJob(payload: unknown): Promise<{ jobId: string }>;
  getResult(handle: { jobId: string }): Promise<unknown>;
}

export class NoRemoteProviderAvailable extends Error {
  constructor() {
    super('No remote execution provider is currently available. Configure Fireworks, Jungle Grid, or AMD Notebook manual mode.');
  }
}

function enabled(key: string) {
  return ['1', 'true', 'yes', 'on'].includes((process.env[key] ?? '').trim().toLowerCase());
}

function remotePriority() {
  return (process.env.REMOTE_PROVIDER_PRIORITY ?? 'junglegrid,fireworks,amd_notebook_manual')
    .split(',')
    .map((value) => value.trim())
    .filter((value): value is ExecutionProvider =>
      ['junglegrid', 'fireworks', 'amd_notebook_manual'].includes(value),
    );
}

export function providerLabel(provider: ExecutionProvider) {
  return {
    gemma_local: 'Gemma Local',
    fireworks: 'Fireworks',
    junglegrid: 'Jungle Grid',
    amd_notebook_manual: 'AMD Notebook',
  }[provider];
}

export function selectExecutionProvider(executionMode: ExecutionMode): {
  executionMode: ExecutionMode;
  selectedProvider: ExecutionProvider;
  providerSelectionReason: string;
  providerPriority: ExecutionProvider[];
} {
  if (executionMode === 'local') {
    if (!enabled('LOCAL_GEMMA_ENABLED') && process.env.LOCAL_GEMMA_ENABLED !== undefined) {
      throw new Error('Local execution requires the Gemma model to be running. Start the configured Gemma service or choose Remote.');
    }
    return {
      executionMode,
      selectedProvider: 'gemma_local',
      providerSelectionReason: 'Local execution selected; Gemma Local is required.',
      providerPriority: ['gemma_local'],
    };
  }

  const priority = remotePriority();
  for (const provider of priority) {
    if (provider === 'junglegrid' && enabled('JUNGLEGRID_ENABLED') && Boolean(process.env.JUNGLE_GRID_API_KEY)) {
      return { executionMode, selectedProvider: provider, providerSelectionReason: 'Selected the first enabled remote provider in priority order.', providerPriority: priority };
    }
    if (provider === 'fireworks' && (process.env.FIREWORKS_ENABLED === undefined || enabled('FIREWORKS_ENABLED')) && Boolean(process.env.FIREWORKS_API_KEY)) {
      return { executionMode, selectedProvider: provider, providerSelectionReason: 'Selected the first enabled remote provider in priority order.', providerPriority: priority };
    }
    if (provider === 'amd_notebook_manual' && enabled('AMD_NOTEBOOK_MANUAL_ENABLED')) {
      return { executionMode, selectedProvider: provider, providerSelectionReason: 'Selected explicitly enabled AMD Notebook manual provider.', providerPriority: priority };
    }
  }
  throw new NoRemoteProviderAvailable();
}
