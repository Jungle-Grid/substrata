import { Panel, Shell } from '../../../components/ui';

export default function LoadingClassificationRun() {
  return (
    <Shell eyebrow="Classification run" title="Loading review run...">
      <Panel>
        <p className="text-sm text-slate-600">
          Loading recommended review paths, supporting evidence, and memo draft.
        </p>
      </Panel>
    </Shell>
  );
}
