import { Panel, Shell } from '../../components/ui';

export default function LoadingDashboard() {
  return (
    <Shell eyebrow="Operations Console" title="Loading dashboard...">
      <Panel>
        <p className="text-sm text-slate-600">
          Fetching documents, runs, and review status from the local API.
        </p>
      </Panel>
    </Shell>
  );
}

