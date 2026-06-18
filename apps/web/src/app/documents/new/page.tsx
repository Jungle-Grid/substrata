import { DocumentCreateForm } from '../../../components/document-create-form';
import { ActionLink, Badge, Panel, Shell } from '../../../components/ui';

export default function UploadPage() {
  return (
    <Shell
      eyebrow="Upload datasheet"
      title="Create a document record for ECCN review."
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <Panel>
          <div className="space-y-5">
            <div>
              <h2 className="text-xl font-semibold text-ink">Datasheet intake</h2>
              <p className="mt-2 text-sm text-slate-600">
                Upload a semiconductor or advanced-hardware PDF/text file, preserve the source artifact, and prepare extracted text for review-path generation.
              </p>
              <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium leading-6 text-amber-950">
                Early validation workspace: use public datasheets or sanitized technical text.
              </p>
            </div>
            <DocumentCreateForm />
          </div>
        </Panel>
        <Panel>
          <Badge tone="default">Review packet contents</Badge>
          <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
            <li>Source document and extracted text</li>
            <li>Extracted technical facts</li>
            <li>Recommended review paths</li>
            <li>Citations and uncertainty flags</li>
            <li>Classification memo draft</li>
          </ul>
          <div className="mt-5">
            <ActionLink href="/dashboard">Return to dashboard</ActionLink>
          </div>
        </Panel>
      </div>
    </Shell>
  );
}
