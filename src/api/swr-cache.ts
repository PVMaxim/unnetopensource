import { shallowRef, type Ref } from 'vue';

const memorySwrCache = new Map<string, { data: any; timestamp: number }>();

export interface SwrOptions<T> {
  ttlMs?: number;
  initialData?: T;
  onError?: (err: unknown) => void;
}

export interface SwrResult<T> {
  data: Ref<T | undefined>;
  isLoading: Ref<boolean>;
  error: Ref<unknown | null>;
  mutate: (newData?: T | Promise<T>) => Promise<void>;
  revalidate: () => Promise<T | undefined>;
}

export function useStaleWhileRevalidate<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: SwrOptions<T> = {}
): SwrResult<T> {
  const { ttlMs = 60000, initialData, onError } = options;

  const cached = memorySwrCache.get(key);
  const initialValue = cached ? cached.data : initialData;

  const data = shallowRef<T | undefined>(initialValue);
  const isLoading = shallowRef<boolean>(!cached);
  const error = shallowRef<unknown | null>(null);

  const revalidate = async (): Promise<T | undefined> => {
    try {
      const freshData = await fetcher();
      memorySwrCache.set(key, { data: freshData, timestamp: Date.now() });
      data.value = freshData;
      error.value = null;
      return freshData;
    } catch (err) {
      error.value = err;
      if (onError) onError(err);
      return data.value;
    } finally {
      isLoading.value = false;
    }
  };

  const isStale = !cached || Date.now() - cached.timestamp > ttlMs;
  if (isStale) {
    revalidate();
  }

  const mutate = async (newData?: T | Promise<T>) => {
    if (newData !== undefined) {
      const resolved = await Promise.resolve(newData);
      memorySwrCache.set(key, { data: resolved, timestamp: Date.now() });
      data.value = resolved;
    } else {
      await revalidate();
    }
  };

  return {
    data,
    isLoading,
    error,
    mutate,
    revalidate,
  };
}
