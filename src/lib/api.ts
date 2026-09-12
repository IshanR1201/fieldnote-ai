import type {
  EscalationRecord,
  FeedbackRecord,
  LibraryGap,
  ManualCitation,
  ManualChunk,
  ManualDocument,
  QueryResponse,
  UsageStats,
} from '../types';

const REQUEST_TIMEOUT_MS = 45_000;

export class ApiError extends Error {
  status?: number;
  /** True when the request never reached the server, so a cached answer may still help. */
  isNetworkError: boolean;
  constructor(message: string, status?: number, isNetworkError = false) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.isNetworkError = isNetworkError;
  }
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(url, { ...init, signal: controller.signal });
    const data = (await res.json().catch(() => ({}))) as T & { error?: string };
    if (!res.ok) {
      throw new ApiError(data.error || `Request failed (${res.status})`, res.status);
    }
    return data;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new ApiError('The request timed out. Check your connection and try again.', undefined, true);
    }
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      throw new ApiError('You are offline. Reconnect to retrieve new procedures.', undefined, true);
    }
    throw new ApiError(
      'Cannot reach the Fieldnote server. Check your connection, or confirm npm run dev is still running.',
      undefined,
      true,
    );
  } finally {
    window.clearTimeout(timer);
  }
}

export function fetchHealth() {
  return request<{ status: string; totalChunks: number; geminiKeySet: boolean }>('/api/health');
}

export function fetchManuals() {
  return request<{ manuals: ManualDocument[]; totalChunks: number }>('/api/manuals');
}

export function fetchChunk(id: string) {
  return request<{ chunk: ManualChunk }>(`/api/chunks/${encodeURIComponent(id)}`);
}

export function ingestManual(payload: {
  documentName: string;
  brand: string;
  model: string;
  text: string;
  defaultPage?: number;
}) {
  return request<{ success: boolean; chunksCreated: number; message: string }>('/api/manuals/ingest', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export function runQuery(payload: { brand: string; model: string; question: string }) {
  return request<QueryResponse>('/api/query', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export function createEscalation(payload: {
  brand: string;
  model: string;
  question: string;
  chunks: QueryResponse['topChunks'];
}) {
  return request<{ success: boolean; escalation: EscalationRecord; message: string }>('/api/escalations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export function submitFeedback(payload: {
  queryId: string;
  rating: 'up' | 'down';
  note: string;
  question: string;
  brand: string;
  model: string;
  chunkIds: string[];
  answerStatus: QueryResponse['status'];
  procedureSteps: QueryResponse['procedureSteps'];
}) {
  return request<{ success: boolean; feedback: FeedbackRecord }>('/api/feedback', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export function fetchAdminStats() {
  return request<{
    usage: UsageStats;
    gaps: LibraryGap[];
    manuals: ManualDocument[];
    totalChunks: number;
    recentQuestions: Array<{
      id: string;
      brand: string;
      model: string;
      question: string;
      status: string;
      timestamp: string;
    }>;
    recentFeedback: FeedbackRecord[];
  }>('/api/admin/stats');
}

export function citationFromChunk(chunk: ManualChunk, snippet?: string): ManualCitation {
  return {
    documentName: chunk.documentName,
    pageNumber: chunk.pageNumber,
    passageSnippet: snippet || chunk.text.slice(0, 300),
    chunkId: chunk.id,
  };
}
