import { createRoot } from 'react-dom/client';
import App from './app/App.tsx';
import './styles/index.css';
import { initNativePlugins, registerPushNotifications, isNative } from './app/core/native/capacitor.ts';

// On native, ensure Capacitor is ready before mounting React.
// On web, this resolves immediately.
function onDeviceReady(): Promise<void> {
  if (!isNative) return Promise.resolve();
  return new Promise((resolve) => {
    // Capacitor fires deviceready when the native bridge is available.
    // If already ready (SPA reload), resolve immediately.
    if (document.readyState === 'complete') {
      resolve();
    } else {
      document.addEventListener('deviceready', () => resolve(), { once: true });
      // Fallback: mount after 500ms even if deviceready doesn't fire
      setTimeout(resolve, 500);
    }
  });
}

async function bootstrap() {
  // Init native plugins (status bar, splash screen fade, platform CSS class, keyboard)
  await initNativePlugins().catch(console.warn);

  // Mount React
  const root = document.getElementById('root')!;
  createRoot(root).render(<App />);

  // Request push notification token after a delay (after user has seen the app)
  if (isNative) {
    setTimeout(() => {
      registerPushNotifications().then((token) => {
        if (token) console.log('[DrivePass] Push token registered');
      }).catch(console.warn);
    }, 4000);
  }
}

onDeviceReady().then(bootstrap);
