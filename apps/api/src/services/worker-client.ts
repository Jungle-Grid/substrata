import type { AwaitedReturn } from '../types/helpers';
import { enqueueClassificationRun } from './classification.service';

type ClassificationRunRecord = AwaitedReturn<typeof enqueueClassificationRun>;

export interface WorkerClient {
  createRun(input: {
    documentId: string;
    organizationId: string;
    actorUserId: string;
    trigger: string;
    executionMode: 'local' | 'remote';
    selectedProvider: 'gemma_local' | 'fireworks' | 'junglegrid' | 'amd_notebook_manual';
  }): Promise<ClassificationRunRecord>;
}

export class LocalWorkerClient implements WorkerClient {
  async createRun(input: {
    documentId: string;
    organizationId: string;
    actorUserId: string;
    trigger: string;
    executionMode: 'local' | 'remote';
    selectedProvider: 'gemma_local' | 'fireworks' | 'junglegrid' | 'amd_notebook_manual';
  }) {
    return enqueueClassificationRun(input);
  }
}

export function createWorkerClient(): WorkerClient {
  return new LocalWorkerClient();
}
