/**
 * IntentSdk wrapper — initialises the WASM-based intent SDK
 * and exposes process/reset for the chat service.
 */

export type Status = "Done" | "InProgress" | "Failed";

export interface KbAnswer {
  id: string;
  answer: string;
  score: number;
}

export interface LastSystemMessage {
  status: Status;
  intent?: string;
  entities: Record<string, string>;
  missing: string[];
  clarification_text?: string;
  kb_answer_id?: string | null;
}

export interface ProcessResult {
  status: Status;
  intent?: string;
  intent_type?: string;
  entities: Record<string, string>;
  missing: string[];
  clarification_text?: string;
  kb_answer?: KbAnswer | null;
  last_system_message?: LastSystemMessage | null;
}

const SDK_BASE_URL = 'https://sdk.united.network/intent';

let sdkInstance: any = null;
let initPromise: Promise<void> | null = null;

export async function initIntentSdk(): Promise<void> {
  if (sdkInstance) return;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const jsUrl = `${SDK_BASE_URL}/intent_sdk_web.js`;
    const wasmUrl = `${SDK_BASE_URL}/intent_sdk_web_bg.wasm`;

    const wasmModule = await import(/* @vite-ignore */ jsUrl);
    await wasmModule.default(wasmUrl);
    sdkInstance = new wasmModule.WebSdk();
  })();

  return initPromise;
}

export function processMessage(text: string): ProcessResult {
  if (!sdkInstance) {
    throw new Error('IntentSdk not initialised. Call initIntentSdk() first.');
  }
  const raw = sdkInstance.process(text);
  // serde_wasm_bindgen returns HashMap as JS Map — convert to plain object
  if (raw.entities instanceof Map) {
    raw.entities = Object.fromEntries(raw.entities);
  }
  return raw as ProcessResult;
}

export function resetConversation(): void {
  sdkInstance?.reset();
}

export function isSdkReady(): boolean {
  return sdkInstance !== null;
}
