import type { MembershipRole } from '@substrata/db';

const roleRank: Record<MembershipRole, number> = {
  OWNER: 5,
  ADMIN: 4,
  REVIEWER: 3,
  ANALYST: 2,
  VIEWER: 1,
};

export function hasRole(
  currentRole: MembershipRole,
  allowedRoles: MembershipRole[],
) {
  return allowedRoles.includes(currentRole);
}

export function canManageTeam(role: MembershipRole) {
  return hasRole(role, ['OWNER', 'ADMIN']);
}

export function canManageWorkspace(role: MembershipRole) {
  return hasRole(role, ['OWNER', 'ADMIN']);
}

export function canCreateClassification(role: MembershipRole) {
  return hasRole(role, ['OWNER', 'ADMIN', 'REVIEWER', 'ANALYST']);
}

export function canSubmitReview(role: MembershipRole) {
  return hasRole(role, ['OWNER', 'ADMIN', 'REVIEWER']);
}

export function canReadWorkspace(role: MembershipRole) {
  return roleRank[role] >= roleRank.VIEWER;
}
