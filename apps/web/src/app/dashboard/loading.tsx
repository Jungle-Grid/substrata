import { Panel, Shell } from '../../components/ui';

export default function LoadingDashboard() {
  return (
    <Shell eyebrow="Compliance workspace" title="Loading review queue...">
      <Panel>
        <p className="text-sm text-slate-600">
          Fetching documents, review runs, memo status, and human review queue.
        </p>
      </Panel>
    </Shell>
  );
}
