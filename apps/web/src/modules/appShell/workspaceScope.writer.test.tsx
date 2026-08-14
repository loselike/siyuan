import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useWorkspaceScopeWriter } from './workspaceScope';

describe('useWorkspaceScopeWriter', () => {
  it('rejects a late updater after the current scope changes', () => {
    const currentScopeRef = { current: 'scope-a' };
    const setter = vi.fn();
    const { result, rerender } = renderHook(
      ({ expectedScopeKey }) => useWorkspaceScopeWriter(currentScopeRef, expectedScopeKey, setter),
      { initialProps: { expectedScopeKey: 'scope-a' } }
    );

    act(() => result.current('scope-a-value'));
    expect(setter).toHaveBeenCalledWith('scope-a-value');

    currentScopeRef.current = 'scope-b';
    act(() => result.current('stale-a-value'));
    expect(setter).toHaveBeenCalledTimes(1);

    const staleFunctionalUpdater = vi.fn((value: unknown) => value);
    act(() => result.current(staleFunctionalUpdater));
    expect(setter).toHaveBeenCalledTimes(1);
    expect(staleFunctionalUpdater).not.toHaveBeenCalled();

    rerender({ expectedScopeKey: 'scope-b' });
    const functionalUpdater = vi.fn((value: unknown) => value);
    act(() => result.current(functionalUpdater));
    expect(setter).toHaveBeenLastCalledWith(functionalUpdater);
    act(() => result.current('scope-b-value'));
    expect(setter).toHaveBeenLastCalledWith('scope-b-value');
    expect(setter).toHaveBeenCalledTimes(3);
  });
});
