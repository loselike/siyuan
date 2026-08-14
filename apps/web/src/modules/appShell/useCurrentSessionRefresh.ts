import { useCallback, useEffect, useRef, type Dispatch, type SetStateAction } from 'react';
import type { ApiClient, Session } from '../../apiClient';
import { persistSession } from './sessionStore';

export interface CurrentSessionRefreshOptions {
  client: Pick<ApiClient, 'currentSession'>;
  accessToken?: string;
  setSession: Dispatch<SetStateAction<Session | null>>;
}

export function useCurrentSessionRefresh(options: CurrentSessionRefreshOptions) {
  const { client, accessToken, setSession } = options;
  const inFlightRef = useRef<Promise<void> | null>(null);
  const lastRefreshAtRef = useRef(0);

  const refreshCurrentSession = useCallback((force = false) => {
    if (!accessToken) return Promise.resolve();
    if (inFlightRef.current) return inFlightRef.current;
    if (!force && Date.now() - lastRefreshAtRef.current < 60_000) return Promise.resolve();
    lastRefreshAtRef.current = Date.now();
    const request = client.currentSession().then((currentSession) => {
      setSession((current) => {
        if (!current || current.accessToken !== accessToken) return current;
        const permissionsUnchanged = current.permissions.length === currentSession.permissions.length
          && current.permissions.every((permission, index) => permission === currentSession.permissions[index]);
        const userUnchanged = JSON.stringify(current.user) === JSON.stringify(currentSession.user);
        if (permissionsUnchanged && userUnchanged) return current;
        const nextSession: Session = {
          ...current,
          user: currentSession.user,
          permissions: currentSession.permissions
        };
        persistSession(nextSession);
        return nextSession;
      });
    }).finally(() => {
      inFlightRef.current = null;
    });
    inFlightRef.current = request;
    return request;
  }, [accessToken, client, setSession]);

  useEffect(() => {
    if (!accessToken) return;
    void refreshCurrentSession(true).catch(() => undefined);
    const refreshIfVisible = () => {
      if (document.visibilityState === 'visible') void refreshCurrentSession().catch(() => undefined);
    };
    const intervalId = window.setInterval(refreshIfVisible, 5 * 60 * 1000);
    window.addEventListener('focus', refreshIfVisible);
    window.addEventListener('online', refreshIfVisible);
    document.addEventListener('visibilitychange', refreshIfVisible);
    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', refreshIfVisible);
      window.removeEventListener('online', refreshIfVisible);
      document.removeEventListener('visibilitychange', refreshIfVisible);
    };
  }, [accessToken, refreshCurrentSession]);

  return refreshCurrentSession;
}
