/**
 * Intent SDK — Web binding.
 *
 * All models are embedded in the WASM binary at compile time.
 * No model files to fetch — just init and go.
 *
 * Usage:
 * ```ts
 * import init, { WebSdk } from "./pkg/intent_sdk_web.js";
 * import { IntentSdk } from "./index.ts";
 *
 * const sdk = await IntentSdk.load({ WebSdk, default: init });
 *
 * const result = sdk.process("send 50 USDT to alice");
 * console.log(result.status, result.intent, result.entities);
 * ```
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export type Status = "Done" | "InProgress" | "Failed";

export interface KbAnswer {
  id: string;
  answer: string;
  score: number;
}

export interface ProcessResult {
  status: Status;
  intent?: string;
  entities: Record<string, string>;
  missing: string[];
  clarificationText?: string;
  kbAnswer?: KbAnswer;
  lastSystemMessageMissing?: string[];
}

// ── IntentSdk ─────────────────────────────────────────────────────────────────

/**
 * High-level SDK class. Use `IntentSdk.load()` to create an instance.
 * All inference runs fully on-device inside the WASM module.
 */
export class IntentSdk {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private constructor(private inner: any) {}

  /**
   * Initialise WASM and create an SDK instance.
   * Call once at app startup and reuse the instance.
   */
  static async load(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    wasmModule: { WebSdk: any; default: (input?: any) => Promise<void> },
  ): Promise<IntentSdk> {
    await wasmModule.default();
    return new IntentSdk(new wasmModule.WebSdk());
  }

  /** Process one user utterance. Returns synchronously. */
  process(text: string): ProcessResult {
    return this.inner.process(text) as ProcessResult;
  }

  /** Reset the active conversation (call between independent sessions). */
  reset(): void {
    this.inner.reset();
  }
}
