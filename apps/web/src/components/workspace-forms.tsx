'use client';

import { membershipRoleSchema } from '@substrata/shared';
import { useRouter } from 'next/navigation';
import { useMemo, useState, useTransition } from 'react';
import {
  changePassword,
  createInvite,
  fetchCsrfToken,
  revokeAllSessions,
  updateOnboarding,
  updateProfile,
  updateWorkspaceSettings,
} from '../lib/api';
import type { MembershipRecord } from '../lib/types';
import { formatRole } from '../lib/workspace';
import { ConfirmationDialog } from './confirmation-dialog';
import { InlineNotice } from './ui';

function textError(value: string, label: string, min = 1, max = 120) {
  const trimmed = value.trim();
  if (trimmed.length < min) return `${label} is required.`;
  if (trimmed.length > max) return `${label} must be ${max} characters or fewer.`;
  return '';
}

function emailError(email: string) {
  if (!email.trim()) return 'Email is required.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Enter a valid email address.';
  return '';
}

function passwordError(password: string, label: string) {
  if (!password) return `${label} is required.`;
  if (password.length < 12) return 'Use at least 12 characters.';
  return '';
}

function Input({
  label,
  value,
  onChange,
  type = 'text',
  error,
  helper,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  error?: string;
  helper?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-slate-700">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={Boolean(error)}
        className={`w-full rounded-lg border bg-white px-3 py-2.5 text-sm text-slate-950 outline-none transition focus:ring-2 ${
          error
            ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-100'
            : 'border-slate-300 focus:border-slate-950 focus:ring-slate-200'
        }`}
      />
      {helper && !error ? <span className="mt-2 block text-xs text-slate-500">{helper}</span> : null}
      {error ? <span className="mt-2 block text-xs text-rose-700">{error}</span> : null}
    </label>
  );
}

function Textarea({
  label,
  value,
  onChange,
  helper,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  helper?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-slate-700">{label}</span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-28 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-950 outline-none transition focus:border-slate-950 focus:ring-2 focus:ring-slate-200"
      />
      {helper ? <span className="mt-2 block text-xs text-slate-500">{helper}</span> : null}
    </label>
  );
}

export function OnboardingForm({
  defaultOrganizationName,
  defaultIndustry,
}: {
  defaultOrganizationName: string;
  defaultIndustry?: string | null;
}) {
  const router = useRouter();
  const [organizationName, setOrganizationName] = useState(defaultOrganizationName);
  const [industry, setIndustry] = useState(defaultIndustry ?? '');
  const [error, setError] = useState('');
  const [pending, startTransition] = useTransition();
  const organizationNameError = textError(organizationName, 'Workspace name');

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (organizationNameError) {
          setError(organizationNameError);
          return;
        }
        setError('');
        startTransition(async () => {
          try {
            await updateOnboarding({
              organizationName,
              industry,
              csrfToken: await fetchCsrfToken(),
            });
            router.replace('/app');
            router.refresh();
          } catch (submissionError) {
            setError(
              submissionError instanceof Error
                ? submissionError.message
                : 'Onboarding could not be completed.',
            );
          }
        });
      }}
    >
      <Input
        label="Workspace name"
        value={organizationName}
        onChange={setOrganizationName}
        error={organizationName ? organizationNameError : ''}
      />
      <Textarea
        label="Primary product category or industry"
        value={industry}
        onChange={setIndustry}
        helper="Optional context for the review workspace."
      />
      {error ? <InlineNotice tone="error">{error}</InlineNotice> : null}
      <button
        type="submit"
        disabled={pending}
        className="inline-flex rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? 'Saving...' : 'Continue to workspace'}
      </button>
    </form>
  );
}

export function WorkspaceSettingsForm({
  defaultName,
  defaultIndustry,
}: {
  defaultName: string;
  defaultIndustry?: string | null;
}) {
  const router = useRouter();
  const [name, setName] = useState(defaultName);
  const [industry, setIndustry] = useState(defaultIndustry ?? '');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [pending, startTransition] = useTransition();
  const nameError = textError(name, 'Workspace name');

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (nameError) {
          setError(nameError);
          return;
        }
        setMessage('');
        setError('');
        startTransition(async () => {
          try {
            await updateWorkspaceSettings({
              name,
              industry,
              csrfToken: await fetchCsrfToken(),
            });
            setMessage('Workspace settings updated.');
            router.refresh();
          } catch (submissionError) {
            setError(
              submissionError instanceof Error
                ? submissionError.message
                : 'Workspace settings could not be updated.',
            );
          }
        });
      }}
    >
      <Input label="Workspace name" value={name} onChange={setName} error={name ? nameError : ''} />
      <Textarea
        label="Primary product category or industry"
        value={industry}
        onChange={setIndustry}
        helper="Used only as workspace context. It does not change review logic."
      />
      {message ? <InlineNotice tone="success">{message}</InlineNotice> : null}
      {error ? <InlineNotice tone="error">{error}</InlineNotice> : null}
      <button
        type="submit"
        disabled={pending}
        className="inline-flex rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? 'Saving...' : 'Save workspace settings'}
      </button>
    </form>
  );
}

const roleOptions: MembershipRecord['role'][] = ['REVIEWER', 'ANALYST', 'VIEWER', 'ADMIN'];

export function TeamInviteForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<MembershipRecord['role']>('REVIEWER');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [pending, startTransition] = useTransition();
  const parsedRole = membershipRoleSchema.safeParse(role);
  const formError = email ? emailError(email) : '';

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (formError || !parsedRole.success) {
          setError(formError || 'Select a valid role.');
          return;
        }
        setMessage('');
        setError('');
        startTransition(async () => {
          try {
            await createInvite({
              email,
              role,
              csrfToken: await fetchCsrfToken(),
            });
            setEmail('');
            setRole('REVIEWER');
            setMessage('Invite created and queued for delivery.');
            router.refresh();
          } catch (submissionError) {
            setError(
              submissionError instanceof Error
                ? submissionError.message
                : 'Invite could not be created.',
            );
          }
        });
      }}
    >
      <Input label="Teammate email" value={email} onChange={setEmail} type="email" error={formError} />
      <label className="block">
        <span className="mb-2 block text-sm font-medium text-slate-700">Role</span>
        <select
          value={role}
          onChange={(event) => setRole(event.target.value as MembershipRecord['role'])}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-950 outline-none transition focus:border-slate-950 focus:ring-2 focus:ring-slate-200"
        >
          {roleOptions.map((option) => (
            <option key={option} value={option}>
              {formatRole(option)}
            </option>
          ))}
        </select>
        <span className="mt-2 block text-xs text-slate-500">
          Reviewers can record human decisions. Analysts can create reviews. Viewers can read only.
        </span>
      </label>
      {message ? <InlineNotice tone="success">{message}</InlineNotice> : null}
      {error ? <InlineNotice tone="error">{error}</InlineNotice> : null}
      <button
        type="submit"
        disabled={pending}
        className="inline-flex rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? 'Sending...' : 'Send invite'}
      </button>
    </form>
  );
}

export function ProfileForm({
  defaultName,
  showPasswordSection,
}: {
  defaultName: string;
  showPasswordSection: boolean;
}) {
  const router = useRouter();
  const [name, setName] = useState(defaultName);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [pending, startTransition] = useTransition();
  const [showRevokeDialog, setShowRevokeDialog] = useState(false);
  const nameError = textError(name, 'Display name');

  const passwordErrors = useMemo(() => {
    if (!showPasswordSection) {
      return {} as Record<string, string>;
    }

    return {
      currentPassword: currentPassword ? '' : 'Current password is required.',
      newPassword: newPassword ? passwordError(newPassword, 'New password') : '',
      confirmPassword:
        confirmPassword && newPassword !== confirmPassword ? 'Passwords do not match.' : '',
    };
  }, [confirmPassword, currentPassword, newPassword, showPasswordSection]);

  return (
    <div className="space-y-8">
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (nameError) {
            setError(nameError);
            return;
          }
          setMessage('');
          setError('');
          startTransition(async () => {
            try {
              await updateProfile({
                name,
                csrfToken: await fetchCsrfToken(),
              });
              setMessage('Profile updated.');
              router.refresh();
            } catch (submissionError) {
              setError(
                submissionError instanceof Error
                  ? submissionError.message
                  : 'Profile could not be updated.',
              );
            }
          });
        }}
      >
        <Input label="Display name" value={name} onChange={setName} error={name ? nameError : ''} />
        {message ? <InlineNotice tone="success">{message}</InlineNotice> : null}
        {error ? <InlineNotice tone="error">{error}</InlineNotice> : null}
        <button
          type="submit"
          disabled={pending}
          className="inline-flex rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? 'Saving...' : 'Save profile'}
        </button>
      </form>

      {showPasswordSection ? (
        <form
          className="space-y-4 border-t border-slate-200 pt-6"
          onSubmit={(event) => {
            event.preventDefault();
            if (passwordErrors.currentPassword || passwordErrors.newPassword || passwordErrors.confirmPassword) {
              setError(
                passwordErrors.currentPassword ||
                  passwordErrors.newPassword ||
                  passwordErrors.confirmPassword,
              );
              return;
            }
            setMessage('');
            setError('');
            startTransition(async () => {
              try {
                await changePassword({
                  currentPassword,
                  newPassword,
                  confirmPassword,
                  csrfToken: await fetchCsrfToken(),
                });
                setCurrentPassword('');
                setNewPassword('');
                setConfirmPassword('');
                setMessage('Password updated.');
              } catch (submissionError) {
                setError(
                  submissionError instanceof Error
                    ? submissionError.message
                    : 'Password could not be updated.',
                );
              }
            });
          }}
        >
          <Input
            label="Current password"
            type="password"
            value={currentPassword}
            onChange={setCurrentPassword}
            error={currentPassword ? passwordErrors.currentPassword : ''}
          />
          <Input
            label="New password"
            type="password"
            value={newPassword}
            onChange={setNewPassword}
            helper="Use at least 12 characters."
            error={newPassword ? passwordErrors.newPassword : ''}
          />
          <Input
            label="Confirm new password"
            type="password"
            value={confirmPassword}
            onChange={setConfirmPassword}
            error={confirmPassword ? passwordErrors.confirmPassword : ''}
          />
          <button
            type="submit"
            disabled={pending}
            className="inline-flex rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? 'Saving...' : 'Change password'}
          </button>
        </form>
      ) : null}

      <div className="border-t border-slate-200 pt-6">
        <p className="text-sm font-medium text-slate-950">Session management</p>
        <p className="mt-2 text-sm text-slate-600">
          This revokes every active Substrata session for your account, including the current browser session.
        </p>
        <button
          type="button"
          className="mt-4 inline-flex rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
          onClick={() => setShowRevokeDialog(true)}
        >
          Sign out of all sessions
        </button>
      </div>

      <ConfirmationDialog
        open={showRevokeDialog}
        title="Sign out of every session?"
        description="This will revoke the current browser session and every other active device session for your account."
        confirmLabel="Revoke all sessions"
        tone="destructive"
        pending={pending}
        onClose={() => setShowRevokeDialog(false)}
        onConfirm={() => {
          startTransition(async () => {
            try {
              await revokeAllSessions(await fetchCsrfToken());
              setShowRevokeDialog(false);
              router.replace('/sign-in');
              router.refresh();
            } catch (submissionError) {
              setShowRevokeDialog(false);
              setError(
                submissionError instanceof Error
                  ? submissionError.message
                  : 'Sessions could not be revoked.',
              );
            }
          });
        }}
      />
    </div>
  );
}
