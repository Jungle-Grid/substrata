import { AppShell } from '../../../../components/app-shell';
import { DocumentCreateForm } from '../../../../components/document-create-form';
import { EmptyState, Panel } from '../../../../components/ui';
import { requireCompletedOnboarding } from '../../../../lib/server-auth';

export default async function NewDocumentPage() {
  const session = await requireCompletedOnboarding('/app/documents/new');

  return (
    <AppShell
      session={session}
      currentPath="/app/documents"
      title="New classification"
      description="Upload a public or sanitized technical document, or paste source text to start a review-ready ECCN analysis workflow."
    >
      {session.membership?.role === 'VIEWER' ? (
        <EmptyState
          title="Upload access required"
          body="View-only members can inspect existing documents and reviews, but they cannot create new classification work."
        />
      ) : (
        <Panel>
          <DocumentCreateForm />
        </Panel>
      )}
    </AppShell>
  );
}
