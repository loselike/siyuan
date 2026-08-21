import { describe, expect, it, vi } from 'vitest';
import { installStaleChunkRecovery } from './releaseRecovery';

class MemoryStorage {
  private readonly values = new Map<string, string>();

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
}

function preloadError(message = 'Failed to fetch dynamically imported module: /assets/FinancePage-old.js') {
  return {
    defaultPrevented: false,
    payload: new Error(message),
    preventDefault() {
      this.defaultPrevented = true;
    }
  };
}

class FakeEventTarget {
  private readonly listeners = new Map<string, Set<(event: { payload?: unknown; preventDefault(): void }) => void>>();

  addEventListener(type: string, listener: (event: { payload?: unknown; preventDefault(): void }) => void) {
    const listeners = this.listeners.get(type) ?? new Set();
    listeners.add(listener);
    this.listeners.set(type, listeners);
  }

  removeEventListener(type: string, listener: (event: { payload?: unknown; preventDefault(): void }) => void) {
    this.listeners.get(type)?.delete(listener);
  }

  dispatchEvent(type: string, event: ReturnType<typeof preloadError>) {
    this.listeners.get(type)?.forEach((listener) => listener(event));
  }
}

describe('stale chunk recovery', () => {
  it('reloads once for the same release and failed chunk when work is clean', () => {
    const target = new FakeEventTarget();
    const reload = vi.fn();
    installStaleChunkRecovery({
      eventTarget: target,
      storage: new MemoryStorage(),
      releaseId: 'release-old',
      currentHref: () => 'http://sunny.local/app/business/finance-entry',
      hasUnsavedWork: () => false,
      reload,
      now: () => 1_000
    });

    const first = preloadError();
    target.dispatchEvent('vite:preloadError', first);
    expect(first.defaultPrevented).toBe(true);
    expect(reload).toHaveBeenCalledOnce();
  });

  it('does not enter an automatic reload loop for a repeated failure', () => {
    const target = new FakeEventTarget();
    const storage = new MemoryStorage();
    const reload = vi.fn();
    const options = {
      eventTarget: target,
      storage,
      releaseId: 'release-old',
      currentHref: () => 'http://sunny.local/app/business/finance-entry',
      hasUnsavedWork: () => false,
      reload,
      now: () => 1_000
    };
    installStaleChunkRecovery(options);

    target.dispatchEvent('vite:preloadError', preloadError());
    const repeated = preloadError();
    target.dispatchEvent('vite:preloadError', repeated);

    expect(reload).toHaveBeenCalledOnce();
    expect(repeated.defaultPrevented).toBe(false);
  });

  it('never reloads automatically while the current page has unsaved work', () => {
    const target = new FakeEventTarget();
    const reload = vi.fn();
    installStaleChunkRecovery({
      eventTarget: target,
      storage: new MemoryStorage(),
      releaseId: 'release-old',
      currentHref: () => 'http://sunny.local/app/business/finance-entry',
      hasUnsavedWork: () => true,
      reload,
      now: () => 1_000
    });

    const event = preloadError();
    target.dispatchEvent('vite:preloadError', event);
    expect(event.defaultPrevented).toBe(false);
    expect(reload).not.toHaveBeenCalled();
  });
});
