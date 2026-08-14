import { act, renderHook, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PermissionKey, Principal, Session } from '../../apiClient';
import { sessionStorageKey } from './sessionStore';
import { useCurrentSessionRefresh } from './useCurrentSessionRefresh';

const initialSession = {
  accessToken: 'token-1',
  user: { id: 'user-1', username: 'admin', role: 'ADMIN' },
  permissions: []
} as Session;

const currentSession = {
  user: {
    ...initialSession.user,
    name: '管理员'
  } as Principal,
  permissions: ['business:shipment:list'] as PermissionKey[]
};

describe('useCurrentSessionRefresh', () => {
  beforeEach(() => localStorage.clear());

  it('preserves immediate refresh, in-flight reuse, one-minute throttling, and forced refresh', async () => {
    let resolveFirst!: (value: typeof currentSession) => void;
    const firstRequest = new Promise<typeof currentSession>((resolve) => {
      resolveFirst = resolve;
    });
    const client = {
      currentSession: vi.fn()
        .mockImplementationOnce(() => firstRequest)
        .mockResolvedValue(currentSession)
    };
    const { result } = renderHook(() => {
      const [session, setSession] = useState<Session | null>(initialSession);
      const refresh = useCurrentSessionRefresh({
        client,
        accessToken: session?.accessToken,
        setSession
      });
      return { refresh, session };
    });

    await waitFor(() => expect(client.currentSession).toHaveBeenCalledOnce());
    const firstConsumer = result.current.refresh();
    const secondConsumer = result.current.refresh();
    expect(firstConsumer).toBe(secondConsumer);
    expect(client.currentSession).toHaveBeenCalledOnce();

    await act(async () => {
      resolveFirst(currentSession);
      await firstConsumer;
    });

    expect(result.current.session).toEqual({ ...initialSession, ...currentSession });
    expect(JSON.parse(localStorage.getItem(sessionStorageKey) ?? 'null')).toEqual(result.current.session);

    await act(async () => result.current.refresh());
    expect(client.currentSession).toHaveBeenCalledOnce();

    await act(async () => result.current.refresh(true));
    expect(client.currentSession).toHaveBeenCalledTimes(2);
  });

  it('does not request or mutate storage without an access token', async () => {
    const client = { currentSession: vi.fn() };
    const { result } = renderHook(() => {
      const [session, setSession] = useState<Session | null>(null);
      const refresh = useCurrentSessionRefresh({ client, setSession });
      return { refresh, session };
    });

    await act(async () => result.current.refresh(true));

    expect(client.currentSession).not.toHaveBeenCalled();
    expect(result.current.session).toBeNull();
    expect(localStorage.getItem(sessionStorageKey)).toBeNull();
  });
});
