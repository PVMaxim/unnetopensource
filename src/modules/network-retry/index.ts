import { AppModule } from '../registry';

function isRetryableFetchError(err: any): boolean {
  if (!err) return false;
  if (err?.name === 'AbortError' || err?.name === 'CanceledError') return false;

  const status = err?.status || err?.response?.status || err?.statusCode;
  if (status === 429 || (status >= 500 && status <= 599)) {
    return true;
  }

  const message = (err?.message || String(err)).toLowerCase();
  if (message.includes('abort') || message.includes('canceled')) {
    return false;
  }

  if (message.includes('429') || message.includes('too many requests') || message.includes('rate limit')) {
    return true;
  }

  if (
    message.includes('network error') ||
    message.includes('failed to fetch') ||
    message.includes('networkerror') ||
    message.includes('econnreset') ||
    message.includes('econnaborted') ||
    message.includes('etimedout') ||
    message.includes('timeout') ||
    err?.name === 'TypeError'
  ) {
    return true;
  }

  return false;
}

const DEFAULT_FETCH_TIMEOUT = 180000;
const inFlightGetRequests = new Map<string, Promise<Response>>();

function setupGlobalFetchRetry() {
  const originalFetch = globalThis.fetch;
  if (!originalFetch) return;

  globalThis.fetch = async function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const method = (init?.method || 'GET').toUpperCase();
    const isGet = method === 'GET' && !init?.body;
    const cacheKey = isGet ? typeof input === 'string' ? input : input instanceof URL ? input.toString() : (input as Request).url : null;

    if (cacheKey && inFlightGetRequests.has(cacheKey)) {
      const pendingResponse = await inFlightGetRequests.get(cacheKey)!;
      return pendingResponse.clone();
    }

    const maxRetries = 3;
    let lastError: any;

    const executeFetch = async (): Promise<Response> => {
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        if (init?.signal?.aborted) {
          throw init.signal.reason || new DOMException('The operation was aborted', 'AbortError');
        }

        let timeoutId: any = null;
        let fetchSignal = init?.signal;

        if (!fetchSignal && typeof AbortController !== 'undefined') {
          const controller = new AbortController();
          timeoutId = setTimeout(() => controller.abort(new DOMException('Request timeout', 'TimeoutError')), DEFAULT_FETCH_TIMEOUT);
          fetchSignal = controller.signal;
        }

        try {
          const response = await originalFetch(input, init ? { ...init, signal: fetchSignal } : { signal: fetchSignal });

          if (timeoutId) clearTimeout(timeoutId);

          if ((response.status === 429 || (response.status >= 500 && response.status <= 599)) && attempt < maxRetries) {
            if (init?.signal?.aborted) {
              throw init.signal.reason || new DOMException('The operation was aborted', 'AbortError');
            }
            const waitTime = 500 * Math.pow(2, attempt) + Math.random() * 200;
            await new Promise((resolve) => setTimeout(resolve, waitTime));
            continue;
          }

          return response;
        } catch (err: any) {
          if (timeoutId) clearTimeout(timeoutId);

          if (err?.name === 'AbortError' || init?.signal?.aborted) {
            throw err;
          }

          lastError = err;

          if (attempt < maxRetries && isRetryableFetchError(err)) {
            if (init?.signal?.aborted) {
              throw init.signal.reason || new DOMException('The operation was aborted', 'AbortError');
            }
            const waitTime = 500 * Math.pow(2, attempt) + Math.random() * 200;
            await new Promise((resolve) => setTimeout(resolve, waitTime));
            continue;
          }

          throw err;
        }
      }

      throw lastError;
    };

    if (cacheKey) {
      const fetchPromise = executeFetch().finally(() => {
        inFlightGetRequests.delete(cacheKey);
      });
      inFlightGetRequests.set(cacheKey, fetchPromise);
      const res = await fetchPromise;
      return res.clone();
    }

    return executeFetch();
  };
}

export const networkRetryModule: AppModule = {
  name: 'network-retry',
  enabled: false,
  register() {
    setupGlobalFetchRetry();
  },
};

