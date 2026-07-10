import { AppShell } from '../../../../components/app-shell';
import { DocumentCreateForm } from '../../../../components/document-create-form';
import { Icon } from '../../../../components/icon';
import { EmptyState, InlineNotice, Panel, SectionHeader } from '../../../../components/ui';
import { requireCompletedOnboarding } from '../../../../lib/server-auth';

export default async function NewDocumentPage() {
  const session = await requireCompletedOnboarding('/app/documents/new');

  return (
    <AppShell
      session={session}
      currentPath="/app/documents"
      title="New classification"
      description="Upload a product source package or paste technical text to start a review-ready ECCN analysis workflow."
    >
      {session.membership?.role === 'VIEWER' ? (
        <EmptyState
          title="Upload access required"
          body="View-only members can inspect existing documents and reviews, but they cannot create new classification work."
        />
      ) : (
        <div className="space-y-6">
          <Panel className="p-4">
            <ol className="grid gap-3 sm:grid-cols-4">
              {[
                ['1', 'Source package', 'Upload or paste product evidence'],
                ['2', 'Company context', 'Indexed history is available to compare'],
                ['3', 'Review options', 'Set evidence scope during review'],
                ['4', 'Generate workup', 'Prepare a human-review-ready memo'],
              ].map(([step, label, detail], index) => <li key={label} className={`flex items-center gap-3 rounded-lg px-3 py-2.5 ${index === 0 ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-600'}`}><span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${index === 0 ? 'bg-sky-300 text-slate-950' : 'border border-slate-300 bg-white text-slate-600'}`}>{step}</span><span><span className="block text-xs font-semibold">{label}</span><span className={`mt-0.5 block text-[11px] ${index === 0 ? 'text-slate-300' : 'text-slate-500'}`}>{detail}</span></span></li>)}
            </ol>
          </Panel>
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(20rem,0.75fr)]">
            <Panel>
              <SectionHeader eyebrow="Step 1 of 4" title="Source package" description="Start with the best available datasheet or technical source. Source text remains tied to the resulting evidence package." />
              <div className="mt-6"><DocumentCreateForm /></div>
            </Panel>
            <div className="space-y-6">
              <Panel>
                <SectionHeader eyebrow="Company context" title="Company-aware review" description="Relevant indexed history is retrieved after technical facts are extracted." />
                <div className="mt-5 space-y-3 text-sm"><div className="flex gap-3 rounded-lg border border-sky-100 bg-sky-50/60 p-3"><Icon name="history" size={18} className="mt-0.5 shrink-0 text-sky-700" /><div><p className="font-semibold text-slate-900">Compare prior company history</p><p className="mt-1 leading-5 text-slate-600">Prior memos, datasheets, and reviewer notes are comparison context only—not regulatory authority.</p></div></div><div className="flex gap-3 rounded-lg border border-slate-200 p-3"><Icon name="shield-check" size={18} className="mt-0.5 shrink-0 text-slate-500" /><div><p className="font-semibold text-slate-900">Human reviewer remains central</p><p className="mt-1 leading-5 text-slate-600">Substrata prepares a review package. Final classification requires qualified human approval.</p></div></div></div>
              </Panel>
              <Panel>
                <SectionHeader eyebrow="Review options" title="What happens next" />
                <div className="mt-4"><InlineNotice tone="default">The generated workup identifies recommended review paths, source-grounded facts, uncertainty flags, and reviewer questions. Specific reviewer assignment and disposition are recorded in the case file.</InlineNotice></div>
              </Panel>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
