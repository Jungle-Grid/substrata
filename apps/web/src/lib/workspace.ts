import type { MembershipRecord } from './types';

export function formatReviewStatus(status?: string | null) {
  if (status === 'uploaded') return 'Uploaded';
  if (!status || status === 'pending_review' || status === 'review_required') {
    return 'Expert review required before classification sign-off';
  }
  if (status === 'under_review') return 'Under qualified reviewer review';
  if (status === 'approved') return 'Approved for internal use';
  if (status === 'reviewed') return 'Reviewer conclusion recorded';
  if (status === 'needs_more_information') return 'Needs more information';
  if (status === 'rejected') return 'Escalated';
  if (status === 'processing') return 'Review paths generated';
  if (status === 'unknown') return 'Execution status unknown';
  if (status === 'failed') return 'Failed';
  return status.replace(/_/g, ' ');
}

export function reviewStatusTone(status?: string | null) {
  if (
    !status ||
    status === 'pending_review' ||
    status === 'needs_more_information' ||
    status === 'review_required'
  ) {
    return 'warning' as const;
  }
  if (status === 'under_review') return 'info' as const;
  if (status === 'approved' || status === 'reviewed') {
    return 'success' as const;
  }
  if (status === 'uploaded' || status === 'processing') {
    return 'info' as const;
  }
  if (status === 'unknown') return 'warning' as const;
  if (status === 'failed' || status === 'rejected') {
    return 'danger' as const;
  }
  return 'default' as const;
}

export function formatRunLifecycle(status?: string | null) {
  if (!status) return 'Facts extracted';
  if (status === 'needs_attention') return 'Needs attention';
  if (status === 'completed') return 'Memo drafted';
  if (status === 'running') return 'Facts extracted';
  if (status === 'queued') return 'Uploaded';
  if (status === 'unknown') return 'Execution status unknown';
  if (status === 'failed') return 'Failed';
  return status.replace(/_/g, ' ');
}

export function formatRole(role?: MembershipRecord['role'] | null) {
  if (!role) return 'Unknown role';
  return role.charAt(0) + role.slice(1).toLowerCase();
}

export function formatAuthMethod(method: string) {
  if (method === 'password') return 'Password';
  if (method === 'google') return 'Google';
  return method.charAt(0).toUpperCase() + method.slice(1);
}

export function formatDateTime(value?: string | null) {
  if (!value) return 'Not available';
  return new Date(value).toLocaleString();
}

export function formatDate(value?: string | null) {
  if (!value) return 'Not available';
  return new Date(value).toLocaleDateString();
}

export function formatFileSize(value?: number | null) {
  if (!value || value < 1024) {
    return `${value ?? 0} B`;
  }

  const units = ['KB', 'MB', 'GB'];
  let size = value / 1024;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  return `${size.toFixed(size >= 10 ? 0 : 1)} ${units[unitIndex]}`;
}
