/**
 * Domain Guard & Anti-Clickjacking Security System.
 * Protects application runtime against domain spoofing, phishing, and iframe embedding.
 */

import { SECURITY_CONFIG, isStrictEnvironment } from './security-config';

const ALLOWED_DOMAINS = [
  'united.network',
  'swap.united.network',
  'test.united.network',
  'united-noncustodial-swap-front.web.app',
  'united-noncustodial-swap-front.firebaseapp.com',
  'localhost',
  '127.0.0.1'
];

function checkIsWebView(): boolean {
  if (typeof window === 'undefined') return false;
  return 'flutter_inappwebview' in window && navigator.userAgent.toLowerCase().indexOf("united.network") !== -1;
}

function renderPhishingWarningScreen(hostname: string): void {
  // Wipe entire document content to immediately halt all JS execution and Vue rendering
  document.documentElement.innerHTML = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Security Alert - Phishing Domain Blocked</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          background-color: #0b0e14;
          color: #ffffff;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          padding: 24px;
          text-align: center;
        }
        .card {
          background: #161b26;
          border: 1px solid #eb5757;
          border-radius: 16px;
          max-width: 520px;
          width: 100%;
          padding: 40px 32px;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6);
        }
        .icon {
          width: 64px;
          height: 64px;
          background: rgba(235, 87, 87, 0.15);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 24px;
          color: #eb5757;
          font-size: 32px;
          font-weight: bold;
        }
        h1 {
          font-size: 22px;
          font-weight: 700;
          color: #eb5757;
          margin-bottom: 12px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        p {
          font-size: 15px;
          line-height: 1.6;
          color: #a0aec0;
          margin-bottom: 24px;
        }
        .unverified-domain {
          background: #0d1117;
          border: 1px dashed rgba(235, 87, 87, 0.4);
          padding: 8px 12px;
          border-radius: 8px;
          color: #fc8181;
          font-family: monospace;
          word-break: break-all;
          margin-bottom: 24px;
          display: block;
        }
        .official-link {
          display: inline-block;
          background: #eb5757;
          color: #ffffff;
          font-weight: 600;
          text-decoration: none;
          padding: 14px 28px;
          border-radius: 12px;
          font-size: 15px;
          transition: background 0.2s ease;
        }
        .official-link:hover {
          background: #d32f2f;
        }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="icon">⚠️</div>
        <h1>Security Warning</h1>
        <p>This domain is not authorized to host the United Network Non-Custodial App. Access has been blocked to protect your assets and keys.</p>
        <span class="unverified-domain">Blocked Domain: ${hostname}</span>
        <a href="https://swap.united.network" class="official-link">Go to Official App (swap.united.network)</a>
      </div>
    </body>
    </html>
  `;
  // Stop further JS execution
  throw new Error(`[DomainGuard] Execution halted: Unverified domain ${hostname}`);
}

export function enforceDomainSecurity(): void {
  if (!SECURITY_CONFIG.domainGuard.enabled || typeof window === 'undefined') {
    return;
  }
  try {
    // 1. Anti-Clickjacking: prevent running inside an unauthorized iframe (skip in webviews/embedded apps)
    if (window.self !== window.top && !checkIsWebView()) {
      try {
        const topHost = window.top?.location.hostname.toLowerCase();
        if (topHost && !ALLOWED_DOMAINS.some(allowed => topHost === allowed || topHost.endsWith(`.${allowed}`))) {
          console.error('[DomainGuard] Clickjacking attempt detected! App execution in iframe is prohibited.');
          window.top!.location.href = window.self.location.href;
          return;
        }
      } catch {
        // Cross-origin iframe access blocked by browser policy -> safe fallback
      }
    }

    // 2. Anti-Domain-Spoofing: verify origin hostname
    const hostname = window.location.hostname.toLowerCase();
    const isAllowed = ALLOWED_DOMAINS.some(allowed =>
      hostname === allowed || hostname.endsWith(`.${allowed}`)
    );

    if (!isAllowed) {
      console.warn(`[DomainGuard Security Notice] Running on unverified domain: ${hostname}`);
      // Hard security halt if current environment is configured in strictEnvironments
      if (isStrictEnvironment('domainGuard')) {
        renderPhishingWarningScreen(hostname);
      }
    }
  } catch (err) {
    if (err instanceof Error && err.message.includes('[DomainGuard] Execution halted')) {
      throw err;
    }
    console.error('[DomainGuard Error]', err);
  }
}
