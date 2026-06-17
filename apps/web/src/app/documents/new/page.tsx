import { DocumentCreateForm } from '../../../components/document-create-form';
import { ActionLink, Badge, Panel, Shell } from '../../../components/ui';

export default function UploadPage() {
  return (
    <Shell
      eyebrow="Upload Datasheet"
      title="Start a classification run from a semiconductor or advanced hardware document."
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <Panel>
          <div className="space-y-5">
            <div>
              <h2 className="text-xl font-semibold text-ink">Validation-ready upload</h2>
              <p className="mt-2 text-sm text-slate-600">
                Upload a semiconductor or advanced-hardware PDF or text file,
                preserve the original artifact locally, and create a reviewable
                document record with extracted text for the classification run.
              </p>
            </div>
            <DocumentCreateForm />
          </div>
        </Panel>
        <Panel>
          <Badge tone="warning">Current MVP</Badge>
          <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
            <li>PDF or text upload with local extraction</li>
            <li>Optional pasted text fallback</li>
            <li>Evidence-first draft memo for expert review</li>
          </ul>
          <div className="mt-5">
            <ActionLink href="/dashboard">Return to dashboard</ActionLink>
          </div>
        </Panel>
      </div>
    </Shell>
  );
}
