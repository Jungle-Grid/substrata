import type { IconName } from '../components/icon';

export type WorkspaceNavGroup = {
  label: string;
  items: Array<{ href: string; label: string; icon: IconName }>;
};

export const workspaceNavGroups: WorkspaceNavGroup[] = [
  {
    label: 'Workspace',
    items: [
      { href: '/app', label: 'Overview', icon: 'layout-dashboard' },
      { href: '/app/documents', label: 'Documents', icon: 'file-text' },
      { href: '/app/company-history', label: 'Company History', icon: 'history' },
      { href: '/app/reviews', label: 'Classification Reviews', icon: 'clipboard-check' },
      { href: '/app/review-queue', label: 'Review Queue', icon: 'inbox' },
      { href: '/app/memos', label: 'Memos', icon: 'file-search' },
    ],
  },
  {
    label: 'Governance',
    items: [
      { href: '/app/evidence', label: 'Evidence', icon: 'link' },
      { href: '/app/audit-log', label: 'Audit Log', icon: 'shield-check' },
      { href: '/app/team', label: 'Team', icon: 'users' },
    ],
  },
  {
    label: 'Account',
    items: [
      { href: '/app/settings', label: 'Settings', icon: 'settings' },
      { href: '/app/profile', label: 'Profile', icon: 'user' },
    ],
  },
];
