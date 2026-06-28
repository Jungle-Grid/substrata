import assert from 'node:assert/strict';
import test from 'node:test';
import {
  canCreateClassification,
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
