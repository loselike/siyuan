import { beforeEach, describe, expect, it } from 'vitest';
import type { Session } from '../../apiClient';
import {
  clearPersistedSession,
  loadPersistedSession,
  persistSession,
  sessionStorageKey
} from './sessionStore';

const session = {
  accessToken: 'token-1',
  user: { id: 'user-1', username: 'admin', role: 'ADMIN' },
  permissions: ['business:shipment:list']
} as Session;

describe('sessionStore', () => {
  beforeEach(() => localStorage.clear());

  it('preserves the existing storage key and JSON representation', () => {
    persistSession(session);

    expect(localStorage.getItem(sessionStorageKey)).toBe(JSON.stringify(session));
    expect(loadPersistedSession()).toEqual(session);

    clearPersistedSession();
    expect(localStorage.getItem(sessionStorageKey)).toBeNull();
    expect(loadPersistedSession()).toBeNull();
  });

  it('preserves the existing malformed JSON failure instead of silently changing startup behavior', () => {
    localStorage.setItem(sessionStorageKey, '{invalid');

    expect(() => loadPersistedSession()).toThrow(SyntaxError);
  });
});
