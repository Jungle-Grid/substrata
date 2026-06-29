import type { AwaitedReturn } from '../types/helpers';
import { createClassificationRun } from './classification.service';

type ClassificationRunRecord = AwaitedReturn<typeof createClassificationRun>;

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
    return createClassificationRun(input);
  }
}

export function createWorkerClient(): WorkerClient {
  return new LocalWorkerClient();
}
