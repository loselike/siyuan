const transientReadRetryDelaysMs = [150, 350, 750, 1_500, 2_500] as const;
const transientGatewayStatuses = new Set([502, 503, 504]);

type AvailabilityRetryDependencies = {
  fetchImpl?: typeof fetch;
  wait?: (milliseconds: number) => Promise<void>;
};

function wait(milliseconds: number) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, milliseconds));
}

function isSafeRead(method: string | undefined) {
  return ['GET', 'HEAD'].includes((method ?? 'GET').toUpperCase());
}

function isAbort(error: unknown, signal?: RequestInit['signal']) {
  return signal?.aborted === true || (error instanceof Error && error.name === 'AbortError');
}

/**
 * Bridges the short gateway gap of an API image handoff for reads only.
 * Business writes are never replayed because a lost response cannot prove
 * whether the original mutation committed.
 */
export async function fetchWithReadAvailabilityRetry(
  input: RequestInfo | URL,
  init: RequestInit = {},
  dependencies: AvailabilityRetryDependencies = {}
): Promise<Response> {
  const fetchImpl = dependencies.fetchImpl ?? ((requestInput, requestInit) => globalThis.fetch(requestInput, requestInit));
  const waitForRetry = dependencies.wait ?? wait;
  if (!isSafeRead(init.method)) return fetchImpl(input, init);

  let lastError: unknown;
  for (let attempt = 0; attempt <= transientReadRetryDelaysMs.length; attempt += 1) {
    try {
      const response = await fetchImpl(input, init);
      if (!transientGatewayStatuses.has(response.status) || attempt === transientReadRetryDelaysMs.length) {
        return response;
      }
    } catch (error) {
      if (isAbort(error, init.signal) || attempt === transientReadRetryDelaysMs.length) throw error;
      lastError = error;
    }
    const retryDelay = transientReadRetryDelaysMs[attempt];
    if (retryDelay === undefined) break;
    await waitForRetry(retryDelay);
  }

  throw lastError instanceof Error ? lastError : new Error('网络请求失败，请稍后重试');
}
