import type { AwaitedReturn } from '../types/helpers';
import { enqueueClassificationRun } from './classification.service';

type ClassificationRunRecord = AwaitedReturn<typeof enqueueClassificationRun>;

export interface WorkerClient {
  createRun(input: {
    documentId: string;
    organizationId: string;
    actorUserId: string;
    trigger: string;
    executionPreference: 'local' | 'fireworks' | 'jungle_grid' | 'auto';
  }): Promise<ClassificationRunRecord>;
}

export class LocalWorkerClient implements WorkerClient {
  async createRun(input: {
    documentId: string;
    organizationId: string;
    actorUserId: string;
    trigger: string;
    executionPreference: 'local' | 'fireworks' | 'jungle_grid' | 'auto';
  }) {
    return enqueueClassificationRun(input);
  }
}

export function createWorkerClient(): WorkerClient {
  return new LocalWorkerClient();
}
