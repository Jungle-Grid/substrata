'use client';

import { useEffect, useRef } from 'react';

export function ConfirmationDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = 'Cancel',
  tone = 'default',
  pending = false,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  tone?: 'default' | 'destructive';
  pending?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) {
      return;
    }

    if (open && !dialog.open) {
      dialog.showModal();
    }

    if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog
      ref={ref}
      onCancel={(event) => {
        event.preventDefault();
        if (!pending) {
          onClose();
        }
      }}
      onClose={onClose}
      className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-0 shadow-2xl backdrop:bg-slate-950/40"
    >
      <div className="p-6">
        <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            disabled={pending}
            onClick={onClose}
            className="inline-flex min-h-10 items-center justify-center rounded-lg border border-slate-300 px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={onConfirm}
            className={`inline-flex min-h-10 items-center justify-center rounded-lg px-4 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60 ${
              tone === 'destructive'
                ? 'bg-rose-700 hover:bg-rose-800'
                : 'bg-slate-950 hover:bg-slate-800'
            }`}
          >
            {pending ? 'Working...' : confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  );
}
