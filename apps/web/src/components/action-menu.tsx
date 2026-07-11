'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { Icon } from './icon';

export type ActionMenuItem = {
  label: string;
  href?: string;
  onSelect?: () => void;
  disabled?: boolean;
  icon?: ReactNode;
};

export function ActionMenu({
  label = 'More actions',
  items,
  align = 'right',
}: {
  label?: string;
  items: ActionMenuItem[];
  align?: 'left' | 'right';
}) {
  return (
    <details className="group relative">
      <summary
        aria-label={label}
        className="flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200 [&::-webkit-details-marker]:hidden"
      >
        <Icon name="more-horizontal" size={19} />
      </summary>
      <div className={`absolute z-40 mt-2 w-56 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg ${align === 'right' ? 'right-0' : 'left-0'}`}>
        {items.map((item) => {
          const className = `flex min-h-10 w-full items-center gap-2 rounded-lg px-3 text-left text-sm font-medium transition ${item.disabled ? 'cursor-not-allowed text-slate-400' : 'text-slate-700 hover:bg-slate-50 hover:text-slate-950'}`;
          const content = <>{item.icon ? <span className="text-slate-500">{item.icon}</span> : null}<span>{item.label}</span></>;
          if (item.href && !item.disabled) {
            return <Link key={item.label} href={item.href} className={className}>{content}</Link>;
          }
          return <button key={item.label} type="button" className={className} onClick={item.onSelect} disabled={item.disabled}>{content}</button>;
        })}
      </div>
    </details>
  );
}
