import { Panel, Shell } from '../../../components/ui';

export default function LoadingDocumentDetail() {
  return (
    <Shell eyebrow="Document Detail" title="Loading document...">
      <Panel>
        <p className="text-sm text-slate-600">
          Fetching document metadata and classification runs.
        </p>
      </Panel>
    </Shell>
  );
}

