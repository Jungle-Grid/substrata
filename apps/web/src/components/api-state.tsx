import { Panel } from './ui';

export function ApiNotice({
  fallback,
  error,
}: {
  fallback: boolean;
  error?: string;
}) {
  if (!fallback) {
    return null;
  }

  return (
    <Panel className="mb-6 border-slate-200 bg-slate-50">
      <p className="text-sm font-medium text-ink">Workspace data unavailable</p>
      <p className="mt-2 text-sm text-slate-600">
        The workspace API is unavailable. Refresh after the connection is restored to view current records.
      </p>
      {error ? (
        <p className="mt-2 text-xs uppercase tracking-[0.14em] text-slate-500">
          Connection issue reported
        </p>
      ) : null}
    </Panel>
  );
}

export function EmptyState({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  return (
    <Panel className="border-dashed border-slate-300 bg-slate-50">
      <h2 className="text-xl font-semibold text-ink">{title}</h2>
      <p className="mt-2 text-sm text-slate-600">{body}</p>
    </Panel>
  );
}
