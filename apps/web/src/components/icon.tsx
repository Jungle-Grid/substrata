import type { ReactNode, SVGProps } from 'react';

export type IconName =
  | 'activity'
  | 'archive'
  | 'arrow-up-right'
  | 'check-circle'
  | 'chevron-down'
  | 'clipboard-check'
  | 'clock'
  | 'file-search'
  | 'file-text'
  | 'history'
  | 'inbox'
  | 'layout-dashboard'
  | 'link'
  | 'menu'
  | 'more-horizontal'
  | 'plus'
  | 'settings'
  | 'shield-check'
  | 'sliders'
  | 'sparkles'
  | 'upload'
  | 'user'
  | 'users'
  | 'x'
  | 'x-circle';

type IconProps = SVGProps<SVGSVGElement> & { name: IconName; size?: number };

export function Icon({ name, size = 18, ...props }: IconProps) {
  const common = {
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };

  const paths: Record<IconName, ReactNode> = {
    activity: <><path d="M3 12h3l2-7 4 14 2-7h7" /></>,
    archive: <><path d="M3 7h18v13H3z" /><path d="M2 3h20v4H2zM10 12h4" /></>,
    'arrow-up-right': <><path d="M7 17 17 7M8 7h9v9" /></>,
    'check-circle': <><circle cx="12" cy="12" r="9" /><path d="m8 12 2.5 2.5L16 9" /></>,
    'chevron-down': <path d="m6 9 6 6 6-6" />,
    'clipboard-check': <><path d="M9 4h6l1 2h3v15H5V6h3l1-2Z" /><path d="M9 13l2 2 4-4" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    'file-search': <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" /><path d="M14 2v6h6M11 16a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm2 2 3 3" /></>,
    'file-text': <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" /><path d="M14 2v6h6M8 13h8M8 17h6" /></>,
    history: <><path d="M3 12a9 9 0 1 0 3-6.7" /><path d="M3 4v5h5M12 7v5l3 2" /></>,
    inbox: <><path d="M4 4h16v12l-3 4H7l-3-4Z" /><path d="M4 15h4l2 3h4l2-3h4" /></>,
    'layout-dashboard': <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
    link: <><path d="M10 13a5 5 0 0 0 7.1.1l2-2a5 5 0 0 0-7.1-7.1l-1.1 1.1" /><path d="M14 11a5 5 0 0 0-7.1-.1l-2 2A5 5 0 0 0 12 20l1.1-1.1" /></>,
    menu: <path d="M4 7h16M4 12h16M4 17h16" />,
    'more-horizontal': <><circle cx="5" cy="12" r="1" fill="currentColor" stroke="none" /><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" /><circle cx="19" cy="12" r="1" fill="currentColor" stroke="none" /></>,
    plus: <path d="M12 5v14M5 12h14" />,
    settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.3 2.3-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5v.2h-3.2v-.2a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1L6 17l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H4.7v-3.2h.2a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.9L6 7.7 8.3 5.4l.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.5v-.2h3.2v.2a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1 2.3 2.3-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.5 1h.2V14h-.2a1.7 1.7 0 0 0-1.5 1Z" /></>,
    'shield-check': <><path d="M12 3 20 6v5c0 5-3.4 8.5-8 10-4.6-1.5-8-5-8-10V6l8-3Z" /><path d="m8.5 12 2.2 2.2 4.8-4.8" /></>,
    sliders: <><path d="M4 6h16M4 12h16M4 18h16" /><circle cx="9" cy="6" r="2" fill="white" /><circle cx="15" cy="12" r="2" fill="white" /><circle cx="7" cy="18" r="2" fill="white" /></>,
    sparkles: <><path d="m12 3 1.6 5.4L19 10l-5.4 1.6L12 17l-1.6-5.4L5 10l5.4-1.6L12 3Z" /><path d="m19 16 .7 2.3L22 19l-2.3.7L19 22l-.7-2.3L16 19l2.3-.7L19 16Z" /></>,
    upload: <><path d="M12 16V4M8 8l4-4 4 4M5 15v4h14v-4" /></>,
    user: <><circle cx="12" cy="8" r="3" /><path d="M5 21a7 7 0 0 1 14 0" /></>,
    users: <><circle cx="9" cy="8" r="3" /><path d="M3 21a6 6 0 0 1 12 0M16 5.5a3 3 0 0 1 0 5M17 14.5a5.8 5.8 0 0 1 4 5.5" /></>,
    x: <path d="m6 6 12 12M18 6 6 18" />,
    'x-circle': <><circle cx="12" cy="12" r="9" /><path d="m9 9 6 6m0-6-6 6" /></>,
  };

  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" {...common} {...props}>
      {paths[name]}
    </svg>
  );
}
