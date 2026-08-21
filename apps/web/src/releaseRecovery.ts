import { clientReleaseId } from './releaseInfo';

const staleChunkRecoveryStorageKey = 'siyuan-stale-chunk-recovery';
const staleChunkRecoveryWindowMs = 60_000;

type StaleChunkEvent = {
  payload?: unknown;
  preventDefault(): void;
};

type StaleChunkEventListener = (event: StaleChunkEvent) => void;

type StaleChunkEventTarget = {
  addEventListener(type: string, listener: StaleChunkEventListener): void;
  removeEventListener(type: string, listener: StaleChunkEventListener): void;
};

type StaleChunkRecoveryStorage = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
};

export type StaleChunkRecoveryOptions = {
  eventTarget?: StaleChunkEventTarget;
  storage?: StaleChunkRecoveryStorage;
  releaseId?: string;
  currentHref?: () => string;
  hasUnsavedWork: () => boolean;
  reload?: () => void;
  now?: () => number;
};

type StoredRecovery = {
  fingerprint: string;
  attemptedAt: number;
};

function readStoredRecovery(storage: StaleChunkRecoveryStorage): StoredRecovery | undefined {
  try {
    const raw = storage.getItem(staleChunkRecoveryStorageKey);
    if (!raw) return undefined;
    const value = JSON.parse(raw) as Partial<StoredRecovery>;
    if (typeof value.fingerprint !== 'string' || typeof value.attemptedAt !== 'number') return undefined;
    return { fingerprint: value.fingerprint, attemptedAt: value.attemptedAt };
  } catch {
    return undefined;
  }
}

function writeStoredRecovery(storage: StaleChunkRecoveryStorage, value: StoredRecovery) {
  try {
    storage.setItem(staleChunkRecoveryStorageKey, JSON.stringify(value));
  } catch {
    // Storage may be unavailable in privacy mode. Reloading once is still safer
    // than leaving a clean page on a missing deployment chunk.
  }
}

function preloadFailureMessage(event: StaleChunkEvent) {
  const payload = event.payload;
  return payload instanceof Error ? payload.message : String(payload ?? 'unknown-preload-error');
}

/**
 * Vite emits `vite:preloadError` before rethrowing a failed dynamic import.
 * A clean page can safely reload once to obtain the no-store HTML manifest;
 * unsaved work and repeated failures deliberately fall through to the existing
 * render boundary instead of risking data loss or an infinite reload loop.
 */
export function installStaleChunkRecovery(options: StaleChunkRecoveryOptions) {
  const eventTarget = options.eventTarget ?? window;
  const storage = options.storage ?? window.sessionStorage;
  const releaseId = options.releaseId ?? clientReleaseId;
  const currentHref = options.currentHref ?? (() => window.location.href);
  const reload = options.reload ?? (() => window.location.reload());
  const now = options.now ?? Date.now;

  const handlePreloadError: StaleChunkEventListener = (event) => {
    if (options.hasUnsavedWork()) return;

    const attemptedAt = now();
    const fingerprint = JSON.stringify({
      releaseId,
      href: currentHref(),
      message: preloadFailureMessage(event)
    });
    const previous = readStoredRecovery(storage);
    if (previous?.fingerprint === fingerprint
      && attemptedAt - previous.attemptedAt < staleChunkRecoveryWindowMs) {
      return;
    }

    event.preventDefault();
    writeStoredRecovery(storage, { fingerprint, attemptedAt });
    reload();
  };

  eventTarget.addEventListener('vite:preloadError', handlePreloadError);
  return () => eventTarget.removeEventListener('vite:preloadError', handlePreloadError);
}
