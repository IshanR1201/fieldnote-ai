import type { QueryResponse } from '../types';
import { getCachedAnswers, saveCachedAnswer } from './offlineCache';
import { readItem, writeItem } from './safeStorage';

export type AppView = 'field' | 'admin';
export type AdminTab = 'library' | 'usage' | 'gaps';

export interface IngestDraft {
  documentName: string;
  brand: string;
  model: string;
  manualText: string;
}

export interface FeedbackDraft {
  rating: 'up' | 'down' | null;
  note: string;
}

/** The exact inputs an answer was produced for, used to detect a stale answer. */
export interface AnsweredFor {
  brand: string;
  model: string;
  question: string;
}

export interface SessionState {
  view: AppView;
  brand: string;
  model: string;
  question: string;
  lastResponse: QueryResponse | null;
  answeredFor: AnsweredFor | null;
  adminTab: AdminTab;
  ingestDraft: IngestDraft;
  feedbackByQueryId: Record<string, FeedbackDraft>;
}

// v3 adds answeredFor; older payloads cannot prove which question an answer belongs to.
const SESSION_KEY = 'fieldnote-ai.session.v3';

export const DEFAULT_SESSION: SessionState = {
  view: 'field',
  brand: 'Carrier',
  model: '59MN7A',
  question:
    'Fault code 33 limit switch circuit trip: what is the test procedure, and what are SW1 switch positions for continuous fan airflow?',
  lastResponse: null,
  answeredFor: null,
  adminTab: 'library',
  ingestDraft: { documentName: '', brand: '', model: '', manualText: '' },
  feedbackByQueryId: {},
};

const VALID_VIEWS: AppView[] = ['field', 'admin'];
const VALID_TABS: AdminTab[] = ['library', 'usage', 'gaps'];

function asText(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback;
}

/**
 * localStorage is user-writable, so anything read back is treated as untrusted input
 * and normalised to the expected shape before it reaches component state.
 */
function readSession(): SessionState | null {
  try {
    const raw = readItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SessionState>;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;

    const draft = (parsed.ingestDraft || {}) as Partial<IngestDraft>;
    const feedback = parsed.feedbackByQueryId;
    const safeFeedback: Record<string, FeedbackDraft> = {};
    if (feedback && typeof feedback === 'object' && !Array.isArray(feedback)) {
      for (const [key, value] of Object.entries(feedback)) {
        const rating = (value as FeedbackDraft)?.rating;
        safeFeedback[key.slice(0, 60)] = {
          rating: rating === 'up' || rating === 'down' ? rating : null,
          note: asText((value as FeedbackDraft)?.note, '').slice(0, 500),
        };
      }
    }

    return {
      view: VALID_VIEWS.includes(parsed.view as AppView) ? (parsed.view as AppView) : DEFAULT_SESSION.view,
      brand: asText(parsed.brand, DEFAULT_SESSION.brand).slice(0, 40),
      model: asText(parsed.model, DEFAULT_SESSION.model).slice(0, 40),
      question: asText(parsed.question, DEFAULT_SESSION.question).slice(0, 500),
      lastResponse:
        parsed.lastResponse && typeof parsed.lastResponse === 'object' && !Array.isArray(parsed.lastResponse)
          ? (parsed.lastResponse as QueryResponse)
          : null,
      answeredFor:
        parsed.answeredFor && typeof parsed.answeredFor === 'object' && !Array.isArray(parsed.answeredFor)
          ? {
              brand: asText(parsed.answeredFor.brand, '').slice(0, 40),
              model: asText(parsed.answeredFor.model, '').slice(0, 40),
              question: asText(parsed.answeredFor.question, '').slice(0, 500),
            }
          : null,
      adminTab: VALID_TABS.includes(parsed.adminTab as AdminTab)
        ? (parsed.adminTab as AdminTab)
        : DEFAULT_SESSION.adminTab,
      ingestDraft: {
        documentName: asText(draft.documentName, '').slice(0, 120),
        brand: asText(draft.brand, '').slice(0, 40),
        model: asText(draft.model, '').slice(0, 40),
        manualText: asText(draft.manualText, '').slice(0, 200_000),
      },
      feedbackByQueryId: safeFeedback,
    };
  } catch {
    return null;
  }
}

export function loadSession(): SessionState {
  const stored = readSession();
  if (stored) return stored;
  const cached = getCachedAnswers()[0];
  if (!cached) return DEFAULT_SESSION;
  return {
    ...DEFAULT_SESSION,
    brand: cached.brand,
    model: cached.model,
    question: cached.question,
    lastResponse: cached.response,
    answeredFor: { brand: cached.brand, model: cached.model, question: cached.question },
  };
}

export function persistSession(next: SessionState): void {
  writeItem(SESSION_KEY, JSON.stringify(next), () =>
    JSON.stringify({ ...next, lastResponse: null, ingestDraft: DEFAULT_SESSION.ingestDraft }),
  );
}

export function persistAnswer(entry: {
  brand: string;
  model: string;
  question: string;
  response: QueryResponse;
}): void {
  saveCachedAnswer(entry);
}
