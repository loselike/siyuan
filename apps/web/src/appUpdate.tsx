import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Button, Modal, Space } from 'antd';
import { clientReleaseId } from './releaseInfo';

const releaseManifestUrl = '/version.json';
const releaseBroadcastChannel = 'siyuan-app-release';
const releaseStorageKey = 'siyuan-app-release-notice';
const periodicCheckIntervalMs = 5 * 60 * 1000;
const requestTimeoutMs = 5_000;

type ReleaseManifest = {
  releaseId: string;
};

type UpdateCoordinatorOptions = {
  hasUnsavedWork: () => boolean;
};

const unsavedWorkSources = new Set<string>();

export function isDeployableReleaseId(value: unknown): value is string {
  return typeof value === 'string'
    && value.trim().length > 0
    && value !== 'unknown'
    && value !== 'local-dev';
}

export function isReleaseUpdateAvailable(currentReleaseId: string, nextReleaseId: unknown) {
  return isDeployableReleaseId(currentReleaseId)
    && isDeployableReleaseId(nextReleaseId)
    && currentReleaseId !== nextReleaseId;
}

export async function fetchReleaseManifest(signal?: AbortSignal): Promise<ReleaseManifest> {
  const response = await fetch(`${releaseManifestUrl}?t=${Date.now()}`, {
    cache: 'no-store',
    credentials: 'same-origin',
    headers: { Accept: 'application/json' },
    signal
  });
  if (!response.ok) {
    throw new Error(`版本检查失败，状态码 ${response.status}`);
  }
  const payload = await response.json() as Partial<ReleaseManifest>;
  if (typeof payload.releaseId !== 'string') {
    throw new Error('版本文件缺少 releaseId');
  }
  return { releaseId: payload.releaseId.trim() };
}

export function setGlobalUnsavedWork(source: string, dirty: boolean) {
  if (dirty) {
    unsavedWorkSources.add(source);
  } else {
    unsavedWorkSources.delete(source);
  }
}

export function hasGlobalUnsavedWork() {
  return unsavedWorkSources.size > 0;
}

export function useGlobalUnsavedWork(source: string, dirty: boolean) {
  useEffect(() => {
    setGlobalUnsavedWork(source, dirty);
    return () => setGlobalUnsavedWork(source, false);
  }, [dirty, source]);
}

export function useAppUpdateCoordinator({ hasUnsavedWork }: UpdateCoordinatorOptions) {
  const [availableReleaseId, setAvailableReleaseId] = useState<string>();
  const availableReleaseIdRef = useRef<string | undefined>(undefined);
  const inFlightCheckRef = useRef<Promise<string | undefined> | undefined>(undefined);

  const rememberAvailableRelease = useCallback((releaseId: unknown) => {
    if (!isReleaseUpdateAvailable(clientReleaseId, releaseId)) return undefined;
    const normalized = String(releaseId).trim();
    availableReleaseIdRef.current = normalized;
    setAvailableReleaseId(normalized);
    return normalized;
  }, []);

  const checkForUpdate = useCallback(async () => {
    if (!isDeployableReleaseId(clientReleaseId)) return undefined;
    if (inFlightCheckRef.current) return inFlightCheckRef.current;

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), requestTimeoutMs);
    const request = fetchReleaseManifest(controller.signal)
      .then((manifest) => rememberAvailableRelease(manifest.releaseId))
      .catch(() => availableReleaseIdRef.current)
      .finally(() => {
        window.clearTimeout(timeoutId);
        inFlightCheckRef.current = undefined;
      });
    inFlightCheckRef.current = request;
    return request;
  }, [rememberAvailableRelease]);

  useEffect(() => {
    if (!isDeployableReleaseId(clientReleaseId)) return;
    void checkForUpdate();

    const publishRelease = (releaseId: string) => {
      try {
        localStorage.setItem(releaseStorageKey, JSON.stringify({ releaseId, detectedAt: Date.now() }));
      } catch {
        // Storage can be unavailable in privacy mode; BroadcastChannel remains the primary path.
      }
    };
    let channel: BroadcastChannel | undefined;
    try {
      channel = new BroadcastChannel(releaseBroadcastChannel);
      channel.onmessage = (event: MessageEvent<{ releaseId?: unknown }>) => {
        const normalized = rememberAvailableRelease(event.data?.releaseId);
        if (normalized) publishRelease(normalized);
      };
    } catch {
      channel = undefined;
    }

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== releaseStorageKey || !event.newValue) return;
      try {
        const payload = JSON.parse(event.newValue) as { releaseId?: unknown };
        rememberAvailableRelease(payload.releaseId);
      } catch {
        // Ignore malformed notices from older clients.
      }
    };
    const handleForeground = () => {
      if (document.visibilityState === 'visible') void checkForUpdate();
    };
    const intervalId = window.setInterval(() => {
      if (document.visibilityState === 'visible') void checkForUpdate();
    }, periodicCheckIntervalMs);

    window.addEventListener('focus', handleForeground);
    window.addEventListener('online', handleForeground);
    window.addEventListener('storage', handleStorage);
    document.addEventListener('visibilitychange', handleForeground);
    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', handleForeground);
      window.removeEventListener('online', handleForeground);
      window.removeEventListener('storage', handleStorage);
      document.removeEventListener('visibilitychange', handleForeground);
      channel?.close();
    };
  }, [checkForUpdate, rememberAvailableRelease]);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!hasUnsavedWork() && !hasGlobalUnsavedWork()) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedWork]);

  useEffect(() => {
    if (!availableReleaseId) return;
    try {
      const channel = new BroadcastChannel(releaseBroadcastChannel);
      channel.postMessage({ releaseId: availableReleaseId });
      channel.close();
    } catch {
      // The storage fallback is written by the passive detector and navigation path.
    }
    try {
      localStorage.setItem(releaseStorageKey, JSON.stringify({ releaseId: availableReleaseId, detectedAt: Date.now() }));
    } catch {
      // Version coordination still works in this tab.
    }
  }, [availableReleaseId]);

  const applyUpdate = useCallback((targetHref = `${window.location.pathname}${window.location.search}`) => {
    const navigate = () => window.location.replace(targetHref);
    if (!hasUnsavedWork() && !hasGlobalUnsavedWork()) {
      navigate();
      return;
    }
    Modal.confirm({
      title: '系统已有更新',
      content: '当前页面有尚未保存的内容。立即刷新会丢失这些内容，请确认已经保存后再继续。',
      okText: '仍然刷新',
      cancelText: '留在当前页面',
      onOk: navigate
    });
  }, [hasUnsavedWork]);

  const navigateWithVersionCheck = useCallback((targetHref: string, navigateInApp: () => void) => {
    if (availableReleaseIdRef.current) {
      applyUpdate(targetHref);
      return;
    }

    if (hasUnsavedWork() || hasGlobalUnsavedWork()) {
      void checkForUpdate().then((nextReleaseId) => {
        if (nextReleaseId) applyUpdate(targetHref);
        else navigateInApp();
      });
      return;
    }

    navigateInApp();
    void checkForUpdate().then((nextReleaseId) => {
      if (nextReleaseId) window.location.replace(targetHref);
    });
  }, [applyUpdate, checkForUpdate, hasUnsavedWork]);

  return {
    availableReleaseId,
    applyUpdate,
    checkForUpdate,
    navigateWithVersionCheck
  };
}

export function AppUpdateNotice({ onRefresh }: { onRefresh: () => void }) {
  return (
    <Alert
      className="app-update-notice"
      type="info"
      showIcon
      message="系统已有更新"
      description="切换功能时会自动加载新版；如果正在录入，请先保存当前内容。"
      action={(
        <Space>
          <Button htmlType="button" type="primary" size="small" onClick={onRefresh}>
            立即刷新
          </Button>
        </Space>
      )}
    />
  );
}
