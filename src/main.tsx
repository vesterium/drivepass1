import { createRoot } from 'react-dom/client';
import App from './app/App.tsx';
import './styles/index.css';
import { initNativePlugins, registerPushNotifications, isNative } from './app/core/native/capacitor.ts';

// Global fallback — shows error text instead of white screen if React fails to mount
function showFatalError(err: unknown) {
  const msg = err instanceof Error ? err.message + '\n' + err.stack : String(err);
  document.body.innerHTML = `
    <div style="padding:32px;font-family:monospace;font-size:13px;background:#fff;color:#dc2626;white-space:pre-wrap;word-break:break-all;">
      <b style="font-size:16px">DrivePass+ failed to start</b>\n\n${msg}
    </div>`;
}

// Catch unhandled promise rejections
window.addEventListener('unhandledrejection', (e) => {
  console.error('[DrivePass] unhandledrejection', e.reason);
});

function onDeviceReady(): Promise<void> {
  if (!isNative) return Promise.resolve();
  return new Promise((resolve) => {
    if (document.readyState === 'complete') {
      resolve();
    } else {
      document.addEventListener('deviceready', () => resolve(), { once: true });
      setTimeout(resolve, 500);
    }
  });
}

async function bootstrap() {
  try {
    await initNativePlugins().catch(console.warn);

    const root = document.getElementById('root');
    if (!root) throw new Error('#root element not found');

    createRoot(root).render(<App />);

    // Push notifications disabled until Firebase is configured
    // if (isNative) { setTimeout(() => registerPushNotifications(), 4000); }
  } catch (err) {
    console.error('[DrivePass] bootstrap error', err);
    showFatalError(err);
  }
}

onDeviceReady().then(bootstrap).catch(showFatalError);
