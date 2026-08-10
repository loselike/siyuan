import { useSyncExternalStore } from 'react';
import type { UserTablePreferenceSummary, UserTablePreferenceValue } from '../../apiClient';

type TablePreferenceClient = {
  userTablePreferences(): Promise<UserTablePreferenceSummary[]>;
  updateUserTablePreference(key: string, value: UserTablePreferenceValue): Promise<UserTablePreferenceSummary>;
  deleteUserTablePreference(key: string): Promise<{ ok: true }>;
};

type TablePreferenceSnapshot = {
  accountId?: string;
  loaded: boolean;
  values: Readonly<Record<string, UserTablePreferenceValue>>;
};

const listeners = new Set<() => void>();
const pendingValues = new Map<string, UserTablePreferenceValue>();
const saveTimers = new Map<string, ReturnType<typeof setTimeout>>();
let activeClient: TablePreferenceClient | undefined;
let loadSequence = 0;
let snapshot: TablePreferenceSnapshot = { loaded: false, values: {} };

function emit(next: TablePreferenceSnapshot) {
  snapshot = next;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return snapshot;
}

function cloneValue(value: UserTablePreferenceValue) {
  return JSON.parse(JSON.stringify(value)) as UserTablePreferenceValue;
}

function stablePreferenceHash(value: string) {
  let first = 0x811c9dc5;
  let second = 0x9e3779b9;
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    first = Math.imul(first ^ code, 0x01000193);
    second = Math.imul(second ^ code, 0x85ebca6b);
  }
  return `${(first >>> 0).toString(16).padStart(8, '0')}${(second >>> 0).toString(16).padStart(8, '0')}`;
}

export function getAccountTablePreferenceKey(namespace: 'columns' | 'widths' | 'view' | 'legacy', localKey: string) {
  return `table.${namespace}.${stablePreferenceHash(localKey)}`;
}

export function configureAccountTablePreferences(accountId: string | undefined, client: TablePreferenceClient | undefined) {
  if (!accountId || !client) {
    loadSequence += 1;
    activeClient = undefined;
    pendingValues.clear();
    saveTimers.forEach((timer) => clearTimeout(timer));
    saveTimers.clear();
    emit({ loaded: false, values: {} });
    return;
  }
  if (snapshot.accountId === accountId && activeClient) {
    activeClient = client;
    return;
  }
  loadSequence += 1;
  const sequence = loadSequence;
  activeClient = client;
  pendingValues.clear();
  saveTimers.forEach((timer) => clearTimeout(timer));
  saveTimers.clear();
  emit({ accountId, loaded: false, values: {} });
  void client.userTablePreferences().then((items) => {
    if (sequence !== loadSequence || snapshot.accountId !== accountId) return;
    const remoteValues = Object.fromEntries(items.map((item) => [item.key, cloneValue(item.value)]));
    pendingValues.forEach((value, key) => {
      remoteValues[key] = cloneValue(value);
    });
    emit({ accountId, loaded: true, values: remoteValues });
  }).catch(() => {
    if (sequence !== loadSequence || snapshot.accountId !== accountId) return;
    emit({ accountId, loaded: true, values: Object.fromEntries(pendingValues) });
  });
}

export function saveAccountTablePreference(key: string, value: UserTablePreferenceValue) {
  if (!snapshot.accountId || !activeClient) return;
  const nextValue = cloneValue(value);
  if (JSON.stringify(snapshot.values[key]) === JSON.stringify(nextValue)) return;
  pendingValues.set(key, nextValue);
  emit({ ...snapshot, values: { ...snapshot.values, [key]: nextValue } });
  const previousTimer = saveTimers.get(key);
  if (previousTimer) clearTimeout(previousTimer);
  const accountId = snapshot.accountId;
  const client = activeClient;
  saveTimers.set(key, setTimeout(() => {
    saveTimers.delete(key);
    const pending = pendingValues.get(key);
    if (!pending || snapshot.accountId !== accountId || activeClient !== client) return;
    void client.updateUserTablePreference(key, pending).then((saved) => {
      if (snapshot.accountId !== accountId || activeClient !== client) return;
      if (pendingValues.get(key) === pending) pendingValues.delete(key);
      emit({ ...snapshot, values: { ...snapshot.values, [key]: cloneValue(saved.value) } });
    }).catch(() => {
      // Local storage remains the offline fallback. A later user adjustment retries the server save.
    });
  }, 350));
}

export function deleteAccountTablePreference(key: string) {
  if (!snapshot.accountId || !activeClient) return;
  pendingValues.delete(key);
  const timer = saveTimers.get(key);
  if (timer) clearTimeout(timer);
  saveTimers.delete(key);
  const { [key]: _removed, ...remaining } = snapshot.values;
  emit({ ...snapshot, values: remaining });
  void activeClient.deleteUserTablePreference(key).catch(() => {
    // Resetting locally should still work when the preference service is temporarily unavailable.
  });
}

export function useAccountTablePreferences() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function resetAccountTablePreferencesForTest() {
  configureAccountTablePreferences(undefined, undefined);
}
