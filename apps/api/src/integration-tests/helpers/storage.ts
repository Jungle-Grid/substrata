import type { StorageDriver } from '../../services/storage';

export type StorageOutcome = 'deleted'|'missing'|'permission_denied'|'timeout'|'temporary_failure'|'unknown';
export class ControlledStorageDriver implements StorageDriver {
  readonly attempts: string[] = [];
  private outcomes: StorageOutcome[];
  constructor(...outcomes: StorageOutcome[]) { this.outcomes = outcomes.length ? outcomes : ['deleted']; }
  resolve(key: string) { return `/controlled/${key}`; }
  enqueue(outcome: StorageOutcome) { this.outcomes.push(outcome); }
  async delete(key: string): Promise<'deleted'|'missing'> {
    this.attempts.push(key);
    const outcome = this.outcomes.shift() ?? 'deleted';
    if (outcome === 'deleted' || outcome === 'missing') return outcome;
    const errors = { permission_denied: 'storage permission denied', timeout: 'storage timeout', temporary_failure: 'temporary storage failure', unknown: 'unknown storage outcome' };
    throw new Error(errors[outcome]);
  }
}
