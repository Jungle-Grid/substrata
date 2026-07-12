import type { RemoteCancellationClient, RemoteCancellationResult } from '../../services/lifecycle.service';
export class ControlledRemoteCancellationClient implements RemoteCancellationClient {
  readonly jobIds: string[]=[]; private outcomes: RemoteCancellationResult[]=[];
  enqueue(outcome: RemoteCancellationResult['outcome']) { this.outcomes.push({ outcome }); }
  async cancel(jobId:string) { this.jobIds.push(jobId); return this.outcomes.shift() ?? { outcome:'unresolved' as const }; }
}
