/**
 * Unified Cloudflare Worker HMAC Authentication Interceptor
 * 
 * Назначение:
 * 1. Автоматически подписывает все исходящие fetch-запросы к зарегистрированным
 *    Cloudflare воркерам (*.worker.united.network) динамическими токенами HMAC-SHA256.
 * 2. Изолированность: Прямые запросы к внешним нодам (публичные RPC, Coingecko, эксплореры)
 *    не затрагиваются и проходят напрямую без задержек.
 * 3. Безопасность: Секретный ключ никогда не передается по сети, передается только одноразовый хэш.
 * 
 * ==============================================================================
 * 📌 КАК ПОДКЛЮЧИТЬ ОСТАЛЬНЫЕ БЛОКЧЕЙНЫ В БУДУЩЕМ:
 * ==============================================================================
 * 
 * Вариант 1 (Статический список):
 * В массиве `ACTIVE_WORKER_DOMAINS` ниже раскомментируйте или добавьте домен воркера нужной сети:
 *   - "evm.worker.united.network"       // Ethereum & EVM
 *   - "polygon.worker.test.united.network"
 *   - "bsc.worker.united.network"       // BNB Chain
 *   - "ton.worker.united.network"       // TON Network
 *   - "solana.worker.united.network"    // Solana
 *   - "tron.worker.united.network"      // TRON
 * 
 * Вариант 2 (Динамическое подключение в рантайме):
 * Вызовите функцию `registerWorkerDomain('имя-домена-воркера')` или `enableAllWorkerSubdomains(true)`
 * в момент инициализации соответствующего менеджера блокчейна.
 * 
 * ==============================================================================
 */

// 1. Активные домены воркеров (по умолчанию включен Canton)
const ACTIVE_WORKER_DOMAINS = new Set<string>([
    "canton-devnet.worker.united.network",
    "canton-test.worker.united.network",
    "canton-testnet.worker.united.network",
    "canton-localnet.worker.united.network",

    // --- ДЛЯ ПОДКЛЮЧЕНИЯ ДРУГИХ БЛОКЧЕЙНОВ В БУДУЩЕМ (раскомментировать при обновлении воркеров): ---
    // "evm.worker.united.network",
    // "bsc.worker.united.network",
    // "polygon.worker.test.united.network",
    // "arbitrum.worker.test.united.network",
    // "base.worker.test.united.network",
    // "avalanche.worker.test.united.network",
    // "ton.worker.united.network",
    // "solana.worker.united.network",
    // "tron.worker.united.network",
    // "etherscan.worker.test.united.network",
    // "bscscan.worker.united.network",
    // "tronscan.worker.united.network",
    // "solscan.worker.united.network",
]);

let allowAllWorkerSubdomains = false;

/**
 * Динамическая регистрация домена воркера
 */
export function registerWorkerDomain(domainOrHost: string) {
    if (domainOrHost) {
        ACTIVE_WORKER_DOMAINS.add(domainOrHost.toLowerCase().trim());
    }
}

/**
 * Включает автоматический перехват всех поддоменов *.worker.united.network
 */
export function enableAllWorkerSubdomains(enabled = true) {
    allowAllWorkerSubdomains = enabled;
}

/**
 * Получение секретного ключа из окружения
 */
export function getWorkerSecret(): string {
    try {
        if (typeof WORKER_SHARED_SECRET !== 'undefined' && WORKER_SHARED_SECRET) {
            return WORKER_SHARED_SECRET;
        }
    } catch {
        // ignore
    }
    if (typeof process !== 'undefined' && process.env?.WORKER_SHARED_SECRET) {
        return process.env.WORKER_SHARED_SECRET;
    }
    return (import.meta as any).env?.WORKER_SHARED_SECRET || '';
}

/**
 * Генерация динамической одноразовой подписи HMAC-SHA256
 */
export async function generateWorkerHmacToken(
    userAddress = 'anonymous',
    secretKey = getWorkerSecret()
): Promise<{ token: string; ts: number }> {
    const ts = Math.floor(Date.now() / 60000); // 1-минутный временной бакет
    const message = `${ts}:${(userAddress || 'anonymous').toLowerCase()}`;
    const encoder = new TextEncoder();

    const key = await crypto.subtle.importKey(
        'raw',
        encoder.encode(secretKey),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
    );

    const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(message));
    const hashArray = Array.from(new Uint8Array(signature));
    const token = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    return { token, ts };
}

/**
 * Проверка, является ли URL целевым воркером с обязательной авторизацией
 */
export function isTargetWorkerUrl(urlStr: string): boolean {
    try {
        const origin = typeof window !== "undefined" && window.location?.origin ? window.location.origin : "https://swap.united.network";
        const parsed = new URL(urlStr, origin);
        const hostname = parsed.hostname.toLowerCase();

        if (ACTIVE_WORKER_DOMAINS.has(hostname)) {
            return true;
        }

        if (allowAllWorkerSubdomains && /.*\.worker(\.test)?\.united\.network$/i.test(hostname)) {
            return true;
        }

        return false;
    } catch {
        return false;
    }
}

let isInterceptorInstalled = false;

/**
 * Инициализация единого перехватчика fetch для Cloudflare воркеров
 */
export function initUnifiedWorkerAuth() {
    const globalObj: any = typeof globalThis !== "undefined" ? globalThis : (typeof window !== "undefined" ? window : undefined);
    if (isInterceptorInstalled || !globalObj || !globalObj.fetch) {
        return;
    }
    isInterceptorInstalled = true;

    const originalFetch = globalObj.fetch;

    globalObj.fetch = async function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
        const rawUrl = typeof input === "string" ? input : (input instanceof URL ? input.toString() : input.url);

        // Если запрос НЕ к воркеру — пропускаем без изменений
        if (!isTargetWorkerUrl(rawUrl)) {
            return originalFetch.call(this, input, init);
        }

        try {
            const secret = getWorkerSecret();
            if (secret) {
                const { token, ts } = await generateWorkerHmacToken("anonymous", secret);

                // Добавляем заголовки авторизации к запросу
                const headers = new Headers(
                    init?.headers || (typeof input === "object" && "headers" in input ? (input as Request).headers : undefined)
                );
                headers.set("X-Auth-Token", token);
                headers.set("X-Auth-Ts", String(ts));
                headers.set("X-Auth-Addr", "anonymous");

                const modifiedInit: RequestInit = {
                    ...init,
                    headers,
                };

                if (typeof input === "string" || input instanceof URL) {
                    return originalFetch.call(this, input, modifiedInit);
                } else {
                    const modifiedReq = new Request(input, modifiedInit);
                    return originalFetch.call(this, modifiedReq);
                }
            }
        } catch (err) {
            console.warn("[WorkerAuth] Error signing worker request with HMAC:", err);
        }

        return originalFetch.call(this, input, init);
    };

    if (typeof window !== "undefined" && (window as any) !== globalObj) {
        (window as any).fetch = globalObj.fetch;
    }
}
