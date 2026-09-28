/**
 * Safe local storage wrapper with memory fallback.
 * Prevents DOMException / SecurityError crashes in iframes, private windows,
 * and restricted security contexts.
 */

const memoryStore = new Map<string, string>();

let isStorageAvailable: boolean | null = null;

function checkStorageAvailability(): boolean {
  if (isStorageAvailable !== null) return isStorageAvailable;
  if (typeof window === 'undefined') {
    isStorageAvailable = false;
    return false;
  }
  try {
    const testKey = '__storage_test__';
    window.localStorage.setItem(testKey, '1');
    window.localStorage.removeItem(testKey);
    isStorageAvailable = true;
  } catch (e) {
    isStorageAvailable = false;
  }
  return isStorageAvailable;
}

export const safeStorage = {
  getItem(key: string): string | null {
    if (checkStorageAvailability()) {
      try {
        return window.localStorage.getItem(key);
      } catch {
        // Fall back to memory
      }
    }
    return memoryStore.has(key) ? (memoryStore.get(key) ?? null) : null;
  },

  setItem(key: string, value: string): void {
    if (checkStorageAvailability()) {
      try {
        window.localStorage.setItem(key, value);
        return;
      } catch {
        // Fall back to memory
      }
    }
    memoryStore.set(key, value);
  },

  removeItem(key: string): void {
    if (checkStorageAvailability()) {
      try {
        window.localStorage.removeItem(key);
      } catch {
        // Fall back to memory
      }
    }
    memoryStore.delete(key);
  },

  getJSON<T>(key: string, fallback: T): T {
    try {
      const raw = this.getItem(key);
      if (!raw) return fallback;
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  },

  setJSON(key: string, value: any): void {
    try {
      this.setItem(key, JSON.stringify(value));
    } catch {
      // ignore
    }
  }
};
