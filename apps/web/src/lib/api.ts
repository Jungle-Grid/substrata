import type {
  ApiResult,
  ClassificationRunRecord,
  DocumentRecord,
} from './types';
import { mockDashboard, mockRun } from './mock-data';

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000';

async function safeFetch<T>(path: string, fallback: T): Promise<ApiResult<T>> {
  try {
    const response = await fetch(`${API_BASE}${path}`, {
      cache: 'no-store',
    });

    if (!response.ok) {
      return {
        data: null,
        fallback: false,
        error: `Request did not complete. Status ${response.status}.`,
      };
    }

    return {
      data: (await response.json()) as T,
      fallback: false,
    };
  } catch (error) {
    return {
      data: fallback,
      fallback: true,
      error:
        error instanceof Error ? error.message : 'The API is currently unreachable.',
    };
  }
}

async function readJsonError(response: Response) {
  const payload = await response.json().catch(() => null);
  return payload?.message ?? payload?.error ?? 'Request did not complete.';
}

export async function fetchDocuments() {
  return safeFetch<DocumentRecord[]>('/documents', mockDashboard.documents);
}

export async function fetchDocument(id: string) {
  return safeFetch<DocumentRecord>(`/documents/${id}`, {
    ...mockDashboard.documents[0],
    title: 'Sample Datasheet',
  });
}

export async function fetchRun(id: string) {
  return safeFetch<ClassificationRunRecord>(`/classification-runs/${id}`, mockRun);
}

export async function createDocumentFromText(payload: {
  title: string;
  fileName: string;
  rawText: string;
}) {
  const response = await fetch(`${API_BASE}/documents`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title: payload.title,
      fileName: payload.fileName,
      mimeType: 'text/plain',
      sizeBytes: new TextEncoder().encode(payload.rawText).length,
      storagePath: `manual/${payload.fileName}`,
      rawText: payload.rawText,
      sourceType: 'manual',
    }),
  });

  if (!response.ok) {
    throw new Error(await readJsonError(response));
  }

  return (await response.json()) as DocumentRecord;
}

export async function uploadDocument(payload: {
  title: string;
  rawText?: string;
  file: File;
}) {
  const form = new FormData();
  form.set('title', payload.title);
  if (payload.rawText) {
    form.set('rawText', payload.rawText);
  }
  form.set('file', payload.file);

  const response = await fetch(`${API_BASE}/documents/upload`, {
    method: 'POST',
    body: form,
  });

  if (!response.ok) {
    throw new Error(await readJsonError(response));
  }

  return (await response.json()) as DocumentRecord;
}

export async function createSampleDocument() {
  const response = await fetch(`${API_BASE}/documents/sample`, {
    method: 'POST',
  });

  if (!response.ok) {
    throw new Error(await readJsonError(response));
  }

  return (await response.json()) as DocumentRecord;
}

export async function startClassificationRun(documentId: string) {
  const response = await fetch(`${API_BASE}/documents/${documentId}/classification-runs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ trigger: 'manual' }),
  });

  if (!response.ok) {
    throw new Error(await readJsonError(response));
  }

  return (await response.json()) as ClassificationRunRecord;
}

export async function submitReview(payload: {
  runId: string;
  status: 'pending_review' | 'reviewed' | 'needs_more_information' | 'rejected';
  note: string;
}) {
  const response = await fetch(`${API_BASE}/classification-runs/${payload.runId}/review`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      status: payload.status,
      note: payload.note,
    }),
  });

  if (!response.ok) {
    throw new Error(await readJsonError(response));
  }

  return response.json();
}
