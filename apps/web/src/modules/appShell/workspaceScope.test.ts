import { describe, expect, it } from 'vitest';
import { isWorkspaceScopeCurrent, resolveScopedWorkspaceRows, workspaceScopeKeyForGeneration, writeIfWorkspaceScopeCurrent } from './workspaceScope';

describe('workspace scope writes', () => {
  it('accepts a response only for the current scope', () => {
    expect(isWorkspaceScopeCurrent('scope-a', 'scope-a')).toBe(true);
    expect(isWorkspaceScopeCurrent('scope-b', 'scope-a')).toBe(false);
  });

  it('keeps repeated authorization scopes on separate request generations', () => {
    const firstGeneration = workspaceScopeKeyForGeneration('scope-a', 1);
    const secondGeneration = workspaceScopeKeyForGeneration('scope-a', 2);
    expect(firstGeneration).not.toBe(secondGeneration);
    expect(secondGeneration).toBe('scope-a|generation:2');
    const writes: string[] = [];
    expect(writeIfWorkspaceScopeCurrent(secondGeneration, firstGeneration, () => writes.push('stale'))).toBe(false);
    expect(writes).toEqual([]);
  });

  it('fails closed while rows are loaded for another scope', () => {
    const rows = [{ id: 'shipment-1' }];
    expect(resolveScopedWorkspaceRows(rows, 'scope-a', 'scope-b')).toEqual([]);
    expect(resolveScopedWorkspaceRows(rows, null, 'scope-a')).toEqual([]);
    expect(resolveScopedWorkspaceRows(rows, 'scope-a', 'scope-a')).toBe(rows);
  });

  it('does not execute a late writer from another scope', () => {
    const writes: string[] = [];
    expect(writeIfWorkspaceScopeCurrent('scope-b', 'scope-a', () => writes.push('stale'))).toBe(false);
    expect(writeIfWorkspaceScopeCurrent('scope-a', 'scope-a', () => writes.push('current'))).toBe(true);
    expect(writes).toEqual(['current']);
  });
});
