import type { CachedAnswer, QueryResponse } from '../types';
import { readItem, writeItem } from './safeStorage';

const CACHE_KEY = 'fieldnote-ai.answer-cache.v1';
const MAX_CACHED = 20;
const MAX_SNIPPET_CHARS = 600;

function readAll(): CachedAnswer[] {
  try {
    const raw = readItem(CACHE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CachedAnswer[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Full passage text stays on the server; the cache only needs enough to show a citation. */
function trimForStorage(response: QueryResponse): QueryResponse {
  return {
    ...response,
    topChunks: (response.topChunks || []).map((tc) => ({
      ...tc,
      chunk: { ...tc.chunk, text: (tc.chunk.text || '').slice(0, MAX_SNIPPET_CHARS) },
    })),
  };
}

export function getCachedAnswers(): CachedAnswer[] {
  return readAll();
}

function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

/** Lets a technician with no signal fall back to an answer they already retrieved. */
export function findCachedAnswer(brand: string, model: string, question: string): CachedAnswer | null {
  const target = normalize(question);
  if (!target) return null;
  return (
    readAll().find(
      (entry) =>
        normalize(entry.question) === target &&
        normalize(entry.brand) === normalize(brand) &&
        normalize(entry.model) === normalize(model),
    ) || null
  );
}

export function saveCachedAnswer(entry: {
  brand: string;
  model: string;
  question: string;
  response: QueryResponse;
}): CachedAnswer[] {
  const next: CachedAnswer[] = [
    {
      savedAt: new Date().toISOString(),
      brand: entry.brand,
      model: entry.model,
      question: entry.question,
      response: trimForStorage(entry.response),
    },
    ...readAll(),
  ].slice(0, MAX_CACHED);

  const stored = writeItem(CACHE_KEY, JSON.stringify(next), () =>
    JSON.stringify(next.slice(0, 3)),
  );
  return stored ? next : readAll();
}
