export class ValidationError extends Error {}

export const LIMITS = {
  brand: 40,
  model: 40,
  question: 500,
  documentName: 120,
  manualText: 500_000,
  note: 500,
  chunkIds: 50,
  chunks: 20,
  procedureSteps: 20,
  stepText: 2_000,
} as const;

/** Rejects non-string values instead of letting `.trim()` throw a 500 later. */
export function requireString(value: unknown, label: string, maxLength: number): string {
  if (typeof value !== 'string') {
    throw new ValidationError(`${label} must be text.`);
  }
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    throw new ValidationError(`${label} is required.`);
  }
  if (trimmed.length > maxLength) {
    throw new ValidationError(`${label} must be ${maxLength} characters or fewer.`);
  }
  return trimmed;
}

export function optionalString(value: unknown, label: string, maxLength: number, fallback = ''): string {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value !== 'string') {
    throw new ValidationError(`${label} must be text.`);
  }
  const trimmed = value.trim();
  if (trimmed.length > maxLength) {
    throw new ValidationError(`${label} must be ${maxLength} characters or fewer.`);
  }
  return trimmed || fallback;
}

export function requireArray(value: unknown, label: string, maxLength: number): unknown[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) {
    throw new ValidationError(`${label} must be a list.`);
  }
  if (value.length > maxLength) {
    throw new ValidationError(`${label} cannot contain more than ${maxLength} entries.`);
  }
  return value;
}

export function requireObjectBody(body: unknown): Record<string, unknown> {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new ValidationError('Request body must be a JSON object.');
  }
  return body as Record<string, unknown>;
}

const EMAIL = /[\w.+-]+@[\w-]+\.[\w.]+/g;
const PHONE = /\+?\d[\d\s().-]{7,}\d/g;
const SSN = /\b\d{3}-\d{2}-\d{4}\b/g;

/**
 * Free-text feedback reaches the evaluation corpus, so contact details are stripped
 * before the note is stored.
 */
export function redactPii(text: string): string {
  return text
    .replace(EMAIL, '[redacted-email]')
    .replace(SSN, '[redacted-id]')
    .replace(PHONE, '[redacted-phone]');
}
