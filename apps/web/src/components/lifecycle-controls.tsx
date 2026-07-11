'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ConfirmationDialog } from './confirmation-dialog';
import {
  archiveDocument, archiveRun, cancelRun, deleteArtifact, permanentlyDeleteDocument,
  permanentlyDeleteRun, restoreDocument, restoreRun, retryArtifactDeletion,
} from '../lib/api';

type Target = 'document' | 'run';

export function LifecycleControls({ target, id, archived, status, csrfToken, canDelete }: {
  target: Target; id: string; archived: boolean; status?: string; csrfToken: string; canDelete: boolean;
}) {
  const router = useRouter();
  const [action, setAction] = useState<'archive' | 'restore' | 'delete' | 'cancel' | null>(null);
  const [confirmation, setConfirmation] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const active = ['pending', 'queued', 'running', 'unknown'].includes(status ?? '');
  const execute = async () => {
    if (!action) return;
    setPending(true); setError('');
    try {
      if (target === 'document') {
        if (action === 'archive') await archiveDocument(id, csrfToken);
        if (action === 'restore') await restoreDocument(id, csrfToken);
        if (action === 'delete') await permanentlyDeleteDocument(id, confirmation, csrfToken);
      } else {
        if (action === 'archive') await archiveRun(id, csrfToken);
        if (action === 'restore') await restoreRun(id, csrfToken);
        if (action === 'cancel') await cancelRun(id, csrfToken);
        if (action === 'delete') await permanentlyDeleteRun(id, confirmation, csrfToken);
      }
      setAction(null); setConfirmation('');
      if (action === 'delete') router.push(target === 'document' ? '/app/documents' : `/app/documents`);
      router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Request did not complete.'); }
    finally { setPending(false); }
  };
  const description = action === 'delete'
    ? `This permanently removes eligible content and stored artifacts. It cannot be undone; a minimal audit tombstone may remain. Type this ${target} ID to confirm.`
    : action === 'archive'
      ? 'This item leaves active views. Existing results are retained and it can be restored. Archived documents cannot start new classification runs.'
      : action === 'cancel'
        ? 'Cancellation is confirmed only when the execution provider confirms it. An unresolved remote cancellation remains active.'
        : 'This item returns to active views.';
  return <div className="flex flex-wrap gap-2">
    {!archived && active && target === 'run' ? <button onClick={() => setAction('cancel')} className="rounded-lg border border-amber-300 px-3 py-2 text-sm font-semibold text-amber-800 hover:bg-amber-50">Cancel run</button> : null}
    {!archived && !active ? <button onClick={() => setAction('archive')} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Archive</button> : null}
    {archived ? <button onClick={() => setAction('restore')} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Restore</button> : null}
    {archived && canDelete ? <button onClick={() => setAction('delete')} className="rounded-lg bg-rose-700 px-3 py-2 text-sm font-semibold text-white hover:bg-rose-800">Permanently delete</button> : null}
    {error ? <p role="alert" className="w-full text-sm text-rose-700">{error}</p> : null}
    <ConfirmationDialog open={Boolean(action)} title={action === 'delete' ? `Permanently delete ${target}` : action === 'cancel' ? 'Cancel classification run' : `${action === 'archive' ? 'Archive' : 'Restore'} ${target}`} description={description} confirmLabel={action === 'delete' ? 'Permanently delete' : action === 'cancel' ? 'Request cancellation' : action === 'archive' ? 'Archive' : 'Restore'} tone={action === 'delete' ? 'destructive' : 'default'} pending={pending} onClose={() => !pending && setAction(null)} onConfirm={execute}>
      {action === 'delete' ? <label className="block text-sm font-medium text-slate-700">Confirmation ID<input value={confirmation} onChange={(event) => setConfirmation(event.target.value)} className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-3" aria-label="Confirmation ID" /></label> : null}
    </ConfirmationDialog>
  </div>;
}

export function ArtifactControls({ runId, artifact, csrfToken }: { runId: string; artifact: { id: string; fileName: string; kind: string; deletionRequestedAt?: string | null; deletionFailureReason?: string | null; canDelete?: boolean; canRetryDeletion?: boolean }; csrfToken: string }) {
  const router = useRouter(); const [pending, setPending] = useState(false); const [error, setError] = useState(''); const [confirming, setConfirming] = useState(false);
  const act = async (retry: boolean) => { setPending(true); setError(''); try { if (retry) await retryArtifactDeletion(runId, artifact.id, csrfToken); else await deleteArtifact(runId, artifact.id, csrfToken); setConfirming(false); router.refresh(); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Artifact cleanup did not complete.'); } finally { setPending(false); } };
  return <div className="mt-2 flex flex-wrap items-center gap-2"><button disabled={pending || !artifact.canDelete} onClick={() => setConfirming(true)} className="text-xs font-semibold text-rose-700 underline disabled:opacity-50">Permanently delete artifact</button>{artifact.canRetryDeletion ? <button disabled={pending} onClick={() => act(true)} className="text-xs font-semibold text-amber-800 underline disabled:opacity-50">Retry deletion</button> : null}{artifact.deletionRequestedAt && !artifact.deletionFailureReason ? <span className="text-xs text-slate-500">Cleanup pending</span> : null}{artifact.deletionFailureReason ? <span className="text-xs text-amber-800">Cleanup failed; retry required.</span> : null}{error ? <span role="alert" className="text-xs text-rose-700">{error}</span> : null}<ConfirmationDialog open={confirming} title="Permanently delete artifact" description={`This permanently removes the stored ${artifact.kind.replace(/_/g, ' ')} file “${artifact.fileName}”. The parent run and sibling artifacts are retained.`} confirmLabel="Delete artifact" tone="destructive" pending={pending} onClose={() => !pending && setConfirming(false)} onConfirm={() => act(false)} /></div>;
}
