import type { Session } from '../../apiClient';

export const sessionStorageKey = 'siyuan-session';

interface SessionStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

function browserStorage(): SessionStorage {
  return globalThis.localStorage;
}

export function loadPersistedSession(storage: SessionStorage = browserStorage()): Session | null {
  const raw = storage.getItem(sessionStorageKey);
  return raw ? (JSON.parse(raw) as Session) : null;
}

export function persistSession(session: Session, storage: SessionStorage = browserStorage()): void {
  storage.setItem(sessionStorageKey, JSON.stringify(session));
}

export function clearPersistedSession(storage: SessionStorage = browserStorage()): void {
  storage.removeItem(sessionStorageKey);
}
