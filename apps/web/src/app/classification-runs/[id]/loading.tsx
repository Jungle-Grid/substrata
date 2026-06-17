import { Panel, Shell } from '../../../components/ui';

export default function LoadingClassificationRun() {
  return (
    <Shell eyebrow="Classification Run" title="Loading classification run...">
      <Panel>
        <p className="text-sm text-slate-600">
          Loading extracted specs, ECCN review cards, citations, reviewer state,
          and memo content.
        </p>
      </Panel>
    </Shell>
  );
}
