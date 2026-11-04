export interface IndexedDBWriteManagerOptions {
  debounceDelayMs?: number;
  maxBatchSize?: number;
  writeBatchDirect: (entries: Array<[string, unknown]>) => Promise<void>;
  deleteDirect: (key: string) => Promise<void>;
}

interface PendingEntry {
  value: unknown;
  resolvers: Array<() => void>;
  rejecters: Array<(err: Error) => void>;
}

export class IndexedDBWriteManager {
  private debounceDelayMs: number;
  private maxBatchSize: number;
  private writeBatchDirect: (entries: Array<[string, unknown]>) => Promise<void>;
  private deleteDirect: (key: string) => Promise<void>;

  private pendingEntries = new Map<string, PendingEntry>();
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private flushPromise: Promise<void> | null = null;

  constructor(options: IndexedDBWriteManagerOptions) {
    this.debounceDelayMs = options.debounceDelayMs ?? 25;
    this.maxBatchSize = options.maxBatchSize ?? 100;
    this.writeBatchDirect = options.writeBatchDirect;
    this.deleteDirect = options.deleteDirect;

    if (typeof window !== 'undefined') {
      const flushHandler = () => {
        void this.flush();
      };
      window.addEventListener('beforeunload', flushHandler);
      window.addEventListener('pagehide', flushHandler);
    }
  }

  public scheduleWrite(key: string, value: unknown, immediate: boolean = false): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const existing = this.pendingEntries.get(key);
      if (existing) {
        existing.value = value;
        existing.resolvers.push(resolve);
        existing.rejecters.push(reject);
      } else {
        this.pendingEntries.set(key, {
          value,
          resolvers: [resolve],
          rejecters: [reject],
        });
      }

      if (immediate) {
        if (this.debounceTimer) {
          clearTimeout(this.debounceTimer);
          this.debounceTimer = null;
        }
        void this.flush();
      } else {
        if (!this.debounceTimer) {
          this.debounceTimer = setTimeout(() => {
            this.debounceTimer = null;
            void this.flush();
          }, this.debounceDelayMs);
        }
      }
    });
  }

  public async scheduleDelete(key: string): Promise<void> {
    const existing = this.pendingEntries.get(key);
    if (existing) {
      this.pendingEntries.delete(key);
      existing.resolvers.forEach((res) => res());
    }
    if (this.flushPromise) {
      await this.flushPromise;
    }
    await this.deleteDirect(key);
  }

  public peekMemory(key: string): { has: boolean; value?: unknown } {
    if (this.pendingEntries.has(key)) {
      return { has: true, value: this.pendingEntries.get(key)!.value };
    }
    return { has: false };
  }

  public hasPendingWrites(): boolean {
    return this.pendingEntries.size > 0;
  }

  public hasPendingWrite(key: string): boolean {
    return this.pendingEntries.has(key);
  }

  public getPendingWriteCount(): number {
    return this.pendingEntries.size;
  }

  public async flush(): Promise<void> {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }

    if (this.flushPromise) {
      return this.flushPromise;
    }

    this.flushPromise = (async () => {
      while (this.pendingEntries.size > 0) {
        const batchKeys = Array.from(this.pendingEntries.keys()).slice(0, this.maxBatchSize);
        const batchEntries: Array<[string, unknown]> = [];
        const batchPending: PendingEntry[] = [];

        for (const k of batchKeys) {
          const entry = this.pendingEntries.get(k);
          if (entry) {
            batchEntries.push([k, entry.value]);
            batchPending.push(entry);
            this.pendingEntries.delete(k);
          }
        }

        if (batchEntries.length > 0) {
          try {
            await this.writeBatchDirect(batchEntries);
            for (const p of batchPending) {
              p.resolvers.forEach((res) => res());
            }
          } catch (err) {
            const error = err instanceof Error ? err : new Error(String(err));
            for (const p of batchPending) {
              p.rejecters.forEach((rej) => rej(error));
            }
          }
        }
      }
    })().finally(() => {
      this.flushPromise = null;
    });

    return this.flushPromise;
  }

  public async flushKey(key: string): Promise<void> {
    if (this.pendingEntries.has(key)) {
      await this.flush();
    }
  }

  public clearMemoryCache(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    this.pendingEntries.clear();
  }
}

