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
    <Panel className="mb-6 border-amber-200 bg-amber-50">
      <p className="text-sm font-medium text-amber-950">API fallback mode</p>
      <p className="mt-2 text-sm text-amber-900">
        The page is showing seeded or mock data because the local API could not be
        reached.
      </p>
      {error ? <p className="mt-2 text-sm text-amber-800">{error}</p> : null}
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

