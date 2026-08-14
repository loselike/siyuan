/**
 * Keeps asynchronous workspace writers tied to the authorization scope that
 * started the request. A changed scope must fail closed instead of accepting
 * a late response from the previous user/team/site boundary.
 */
export function isWorkspaceScopeCurrent(currentScopeKey: string, expectedScopeKey: string): boolean {
  return currentScopeKey === expectedScopeKey;
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

export function resolveScopedWorkspaceRows<T>(rows: T[], loadedScopeKey: string | null, currentScopeKey: string): T[] {
  return loadedScopeKey && isWorkspaceScopeCurrent(loadedScopeKey, currentScopeKey) ? rows : [];
}
