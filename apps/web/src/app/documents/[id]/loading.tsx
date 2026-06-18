import { Panel, Shell } from '../../../components/ui';

export default function LoadingDocumentDetail() {
  return (
    <Shell eyebrow="Document workspace" title="Loading document record...">
      <Panel>
        <p className="text-sm text-slate-600">
          Fetching document metadata, review runs, and memo draft status.
        </p>
      </Panel>
    </Shell>
  );
}
