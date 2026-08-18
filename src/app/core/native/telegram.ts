// Telegram Mini App bridge. The SDK script (loaded in index.html) always sets
// window.Telegram.WebApp, even in a plain browser tab -- but initData only comes back
// non-empty when the page was actually opened *from inside* Telegram (via a bot's menu
// button / t.me/<bot>?startapp=...). That's the real signal for "are we in the Mini App",
// not just "is the script present".

interface TelegramWebApp {
  initData: string;
  isVersionAtLeast: (version: string) => boolean;
  showScanQrPopup: (params: { text?: string }, callback: (text: string) => boolean | void) => void;
  closeScanQrPopup: () => void;
  ready: () => void;
  expand: () => void;
}

declare global {
  interface Window {
    Telegram?: { WebApp?: TelegramWebApp };
  }
}

export const isTelegramMiniApp = (): boolean => !!window.Telegram?.WebApp?.initData;

export function initTelegramMiniApp(): void {
  const webApp = window.Telegram?.WebApp;
  if (!webApp?.initData) return;
  webApp.ready();
  webApp.expand();
}

// showScanQrPopup shipped in Bot API 6.4 -- older Telegram clients won't have it even
// though window.Telegram.WebApp itself exists.
export function canUseNativeQrScan(): boolean {
  const webApp = window.Telegram?.WebApp;
  return !!webApp?.initData && typeof webApp.showScanQrPopup === 'function' && webApp.isVersionAtLeast('6.4');
}

// Opens Telegram's own native camera scanner (a system overlay, not a web <video>
// element) -- this is what makes scanning reliable inside the in-app WebView, where a
// raw getUserMedia() stream is flaky depending on platform.
export function scanQrNative(onScan: (text: string) => void, promptText: string): void {
  window.Telegram!.WebApp!.showScanQrPopup({ text: promptText }, (text) => {
    onScan(text);
    return true; // truthy return closes the popup after the first decoded code
  });
}

export function closeNativeQrScan(): void {
  try { window.Telegram?.WebApp?.closeScanQrPopup(); } catch {}
}
