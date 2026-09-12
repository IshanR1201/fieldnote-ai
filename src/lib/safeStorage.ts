/**
 * localStorage wrapper. Writes can throw QuotaExceededError once the answer cache
 * grows, and reads throw outright in Safari private mode, so nothing here is allowed
 * to surface an exception into React render or effect code.
 */

function storage(): Storage | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

export function readItem(key: string): string | null {
  try {
    return storage()?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

export function removeItem(key: string): void {
  try {
    storage()?.removeItem(key);
  } catch {
    /* nothing more we can do */
  }
}

/**
 * Attempts a write and, if the browser is out of quota, lets the caller shrink the
 * payload and retry. Returns false when the value could not be stored at all.
 */
export function writeItem(key: string, value: string, onQuotaExceeded?: () => string | null): boolean {
  const store = storage();
  if (!store) return false;
  try {
    store.setItem(key, value);
    return true;
  } catch {
    const smaller = onQuotaExceeded?.();
    if (smaller === null || smaller === undefined) {
      removeItem(key);
      return false;
    }
    try {
      store.setItem(key, smaller);
      return true;
    } catch {
      removeItem(key);
      return false;
    }
  }
}
