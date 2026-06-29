import assert from 'node:assert/strict';
import test from 'node:test';
import { env } from '../config/env';
import {
  canCreateClassification,
  canManagePublicDemo,
  canManageTeam,
  canManageWorkspace,
  canSubmitReview,
} from './authz';

test('owners and admins can manage team settings', () => {
  assert.equal(canManageTeam('OWNER'), true);
  assert.equal(canManageTeam('ADMIN'), true);
  assert.equal(canManageTeam('REVIEWER'), false);
  assert.equal(canManageWorkspace('OWNER'), true);
  assert.equal(canManageWorkspace('ANALYST'), false);
});

test('classification creation and review permissions follow role boundaries', () => {
  assert.equal(canCreateClassification('ANALYST'), true);
  assert.equal(canCreateClassification('VIEWER'), false);
  assert.equal(canSubmitReview('REVIEWER'), true);
  assert.equal(canSubmitReview('ANALYST'), false);
});

test('public demo publishing can require both admin role and internal email allowlist', () => {
  const original = [...env.publicDemoAdminEmails];
  env.publicDemoAdminEmails.splice(0, env.publicDemoAdminEmails.length, 'admin@substrata.dev');

  try {
    assert.equal(canManagePublicDemo('ADMIN', 'admin@substrata.dev'), true);
    assert.equal(canManagePublicDemo('OWNER', 'owner@customer.dev'), false);
    assert.equal(canManagePublicDemo('REVIEWER', 'admin@substrata.dev'), false);
  } finally {
    env.publicDemoAdminEmails.splice(0, env.publicDemoAdminEmails.length, ...original);
  }
});
