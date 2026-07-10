'use client';

export default function CompanyHistoryError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="rounded-lg border border-rose-200 bg-rose-50 p-5">
        <h2 className="text-lg font-semibold text-rose-950">Company History could not be loaded</h2>
        <p className="mt-2 text-sm leading-6 text-rose-900">
          The internal reference-material request did not complete. Your existing history records were not changed.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-4 inline-flex min-h-10 items-center rounded-lg border border-rose-300 bg-white px-4 text-sm font-medium text-rose-950 transition hover:bg-rose-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
