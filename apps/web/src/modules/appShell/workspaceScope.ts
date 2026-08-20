import { useCallback, type Dispatch, type SetStateAction } from 'react';

/**
 * Keeps asynchronous workspace writers tied to the authorization scope that
 * started the request. A changed scope must fail closed instead of accepting
 * a late response from the previous user/team/site boundary.
 */
export function isWorkspaceScopeCurrent(currentScopeKey: string, expectedScopeKey: string): boolean {
  return currentScopeKey === expectedScopeKey;
}

export function workspaceScopeKeyForGeneration(authorizationScopeKey: string, generation: number): string {
  return `${authorizationScopeKey}|generation:${generation}`;
}

export function writeIfWorkspaceScopeCurrent(
  currentScopeKey: string,
  expectedScopeKey: string,
  writer: () => void
): boolean {
  if (!isWorkspaceScopeCurrent(currentScopeKey, expectedScopeKey)) return false;
  writer();
  return true;
}

/**
 * Creates the only state-writer shape allowed for scope-sensitive async work.
 * The ref is intentionally read at write time so a promise that outlives a
 * route/session transition fails closed instead of updating the next scope.
 */
export function useWorkspaceScopeWriter<T>(
  currentScopeRef: { current: string },
  expectedScopeKey: string,
  setter: Dispatch<SetStateAction<T>>
): (updater: SetStateAction<T>) => void {
  return useCallback((updater: SetStateAction<T>) => {
    writeIfWorkspaceScopeCurrent(
      currentScopeRef.current,
      expectedScopeKey,
      () => setter(updater)
    );
  }, [currentScopeRef, expectedScopeKey, setter]);
}

export function resolveScopedWorkspaceRows<T>(rows: T[], loadedScopeKey: string | null, currentScopeKey: string): T[] {
  return loadedScopeKey && isWorkspaceScopeCurrent(loadedScopeKey, currentScopeKey) ? rows : [];
}
