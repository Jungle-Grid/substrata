import 'server-only';

import { cookies } from 'next/headers';
import type {
  AuditEventRecord,
  AuthSessionRecord,
  ClassificationRunRecord,
  CompanyHistoryBatchRecord,
  CompanyHistoryDocumentRecord,
  DemoPublicationStatusRecord,
  DocumentRecord,
  InviteRecord,
  MemoListRecord,
  PublicClassificationRunRecord,
  TeamMemberRecord,
} from './types';

const API_BASE = `${process.env.API_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000'}/v1`;

export class ServerApiUnavailableError extends Error {
  constructor(message = 'Substrata API is unavailable.') {
    super(message);
    this.name = 'ServerApiUnavailableError';
  }
}

async function serverFetch<T>(path: string) {
  const cookieStore = await cookies();
  let response: Response;

  try {
    response = await fetch(`${API_BASE}${path}`, {
      headers: {
        cookie: cookieStore.toString(),
      },
      cache: 'no-store',
    });
  } catch {
    throw new ServerApiUnavailableError();
  }

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    const message = payload?.message ?? payload?.error ?? 'Request failed.';
    throw new Error(message);
  }

  return (await response.json()) as T;
}

async function publicServerFetch<T>(path: string) {
  let response: Response;

  try {
    response = await fetch(`${API_BASE}${path}`, {
      cache: 'no-store',
    });
  } catch {
    throw new ServerApiUnavailableError();
  }

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    const message = payload?.message ?? payload?.error ?? 'Request failed.';
    throw new Error(message);
  }

  return (await response.json()) as T;
}

export function fetchServerAuthSession() {
  return serverFetch<AuthSessionRecord>('/auth/me');
}

export async function fetchServerAuthSessionSafe(): Promise<AuthSessionRecord> {
  try {
    return await fetchServerAuthSession();
  } catch (error) {
    if (error instanceof ServerApiUnavailableError) {
      return {
        authenticated: false,
        csrfToken: '',
      };
    }

    throw error;
  }
}

export function fetchServerDocuments() {
  return serverFetch<DocumentRecord[]>('/documents');
}

export function fetchServerDocument(id: string) {
  return serverFetch<DocumentRecord>(`/documents/${id}`);
}

export function fetchServerRuns() {
  return serverFetch<ClassificationRunRecord[]>('/classification-runs');
}

export function fetchServerRun(id: string) {
  return serverFetch<ClassificationRunRecord>(`/classification-runs/${id}`);
}

export function fetchPublicServerRun(id: string) {
  return publicServerFetch<PublicClassificationRunRecord>(
    `/public/classification-runs/${id}`,
  );
}

export async function fetchPublicServerRunSafe(id: string) {
  try {
    return await fetchPublicServerRun(id);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Request failed.';
    if (message === 'Public classification demo not found.') {
      return null;
    }
    throw error;
  }
}

export function fetchServerDemoPublicationStatus(id: string) {
  return serverFetch<DemoPublicationStatusRecord>(
    `/classification-runs/${id}/demo-publication-status`,
  );
}

export function fetchServerReviewQueue() {
  return serverFetch<ClassificationRunRecord[]>('/classification-runs/review-queue');
}

export function fetchServerMemos() {
  return serverFetch<MemoListRecord[]>('/classification-runs/memos');
}

export function fetchServerTeam() {
  return serverFetch<{ members: TeamMemberRecord[]; invites: InviteRecord[] }>(
    '/organizations/current/members',
  );
}

export function fetchServerAuditLog() {
  return serverFetch<{ events: AuditEventRecord[] }>('/audit-log');
}

export function fetchServerCompanyHistoryBatches() {
  return serverFetch<{ batches: CompanyHistoryBatchRecord[] }>('/history/batches');
}

export function fetchServerCompanyHistoryBatch(id: string) {
  return serverFetch<CompanyHistoryBatchRecord>(`/history/batches/${id}`);
}

export function fetchServerCompanyHistoryDocument(id: string) {
  return serverFetch<CompanyHistoryDocumentRecord>(`/history/documents/${id}`);
}
