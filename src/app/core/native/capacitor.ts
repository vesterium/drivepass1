import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { App } from '@capacitor/app';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { Keyboard } from '@capacitor/keyboard';
import { Network } from '@capacitor/network';
import { Geolocation } from '@capacitor/geolocation';
import { Camera, CameraPermissionState } from '@capacitor/camera';
import { PushNotifications } from '@capacitor/push-notifications';

export const isNative = Capacitor.isNativePlatform();
export const platform = Capacitor.getPlatform(); // 'ios' | 'android' | 'web'

// ── Platform class on <body> ───────────────────────────────────────────────────
// Enables platform-specific CSS: body.ios / body.android / body.web
function setPlatformClass() {
  document.body.classList.remove('ios', 'android', 'web');
  document.body.classList.add(platform);
}

// ── Init ──────────────────────────────────────────────────────────────────────

export async function initNativePlugins() {
  setPlatformClass();

  if (!isNative) return;

  try {
    // Status bar
    await StatusBar.setStyle({ style: Style.Dark });
    if (platform === 'android') {
      await StatusBar.setBackgroundColor({ color: '#2563EB' });
      await StatusBar.setOverlaysWebView({ overlay: false });
    }
    if (platform === 'ios') {
      // iOS: overlaysWebView so the app draws edge-to-edge, safe areas handle the inset
      await StatusBar.setOverlaysWebView({ overlay: true });
    }
  } catch {}

  // Keyboard
  try {
    Keyboard.addListener('keyboardWillShow', () => {
      document.body.classList.add('keyboard-open');
    });
    Keyboard.addListener('keyboardWillHide', () => {
      document.body.classList.remove('keyboard-open');
    });
    Keyboard.addListener('keyboardDidHide', () => {
      // Force scroll reset so content isn't stuck above keyboard
      window.scrollTo(0, 0);
    });
  } catch {}

  // Hide splash screen after React renders
  try {
    await SplashScreen.hide({ fadeOutDuration: 400 });
  } catch {}
}

// ── Back button (Android) ─────────────────────────────────────────────────────

let backPressedOnce = false;

export function registerBackButton(onBack: () => boolean) {
  if (!isNative || platform !== 'android') return () => {};
  const listenerPromise = App.addListener('backButton', ({ canGoBack }) => {
    const handled = onBack();
    if (!handled && !canGoBack) {
      // Double-press back to exit — prevents accidental app exit
      if (backPressedOnce) {
        App.exitApp();
      } else {
        backPressedOnce = true;
        // Show native toast would be ideal but we use a simple timeout reset
        setTimeout(() => { backPressedOnce = false; }, 2000);
        // Dispatch custom event so React can show a toast
        window.dispatchEvent(new CustomEvent('drivepass:back-press-warning'));
      }
    } else {
      backPressedOnce = false;
    }
  });
  return () => { listenerPromise.then(l => l.remove()); };
}

// ── App lifecycle ─────────────────────────────────────────────────────────────

export function onAppResume(callback: () => void) {
  if (!isNative) return () => {};
  const p = App.addListener('appStateChange', ({ isActive }) => {
    if (isActive) callback();
  });
  return () => { p.then(l => l.remove()); };
}

// ── Open external URL ─────────────────────────────────────────────────────────
// On native Capacitor WebView, window.open with '_blank' or '_system' routes
// to the OS browser (Chrome/Safari) automatically for external domains.

export function openUrl(url: string): void {
  // '_system' forces the OS browser on Android; Safari handles it on iOS.
  // Falls back to '_blank' which Capacitor also routes externally.
  window.open(url, '_system') ?? window.open(url, '_blank');
}

// ── Haptics ───────────────────────────────────────────────────────────────────

export async function hapticTap() {
  if (!isNative) return;
  try { await Haptics.impact({ style: ImpactStyle.Light }); } catch {}
}

export async function hapticSuccess() {
  if (!isNative) return;
  try { await Haptics.impact({ style: ImpactStyle.Medium }); } catch {}
}

export async function hapticError() {
  if (!isNative) return;
  try { await Haptics.notification({ type: NotificationType.Error }); } catch {}
}

export async function hapticWarning() {
  if (!isNative) return;
  try { await Haptics.notification({ type: NotificationType.Warning }); } catch {}
}

// ── Push Notifications ────────────────────────────────────────────────────────
// Отключено до настройки Firebase Cloud Messaging (google-services.json)
// Без FCM конфига PushNotifications.register() вызывает краш на Android

export async function registerPushNotifications(): Promise<string | null> {
  return null;
}

export function addPushNotificationListener(
  _onNotification: (title: string, body: string, data: Record<string, unknown>) => void
) {
  return () => {};
}

// ── Camera Permissions ────────────────────────────────────────────────────────

export async function requestCameraPermission(): Promise<boolean> {
  if (!isNative) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(t => t.stop());
      return true;
    } catch {
      return false;
    }
  }
  try {
    let status = await Camera.checkPermissions();
    if (status.camera === 'prompt' || status.camera === 'prompt-with-rationale') {
      status = await Camera.requestPermissions({ permissions: ['camera'] });
    }
    return (status.camera as CameraPermissionState) === 'granted';
  } catch {
    return false;
  }
}

// ── Network Status ────────────────────────────────────────────────────────────

export async function getNetworkStatus(): Promise<boolean> {
  if (!isNative) return navigator.onLine;
  try {
    const status = await Network.getStatus();
    return status.connected;
  } catch {
    return navigator.onLine;
  }
}

export function addNetworkListener(onChange: (connected: boolean) => void) {
  if (!isNative) {
    const onOnline  = () => onChange(true);
    const onOffline = () => onChange(false);
    window.addEventListener('online',  onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online',  onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }
  const p = Network.addListener('networkStatusChange', (s) => onChange(s.connected));
  return () => { p.then(l => l.remove()); };
}

// ── Geolocation ───────────────────────────────────────────────────────────────

export async function getCurrentPosition(): Promise<{ lat: number; lng: number } | null> {
  if (!isNative) {
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => resolve(null),
        { timeout: 5000, enableHighAccuracy: true }
      );
    });
  }
  try {
    const perm = await Geolocation.requestPermissions();
    if (perm.location !== 'granted') return null;
    const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 5000 });
    return { lat: pos.coords.latitude, lng: pos.coords.longitude };
  } catch {
    return null;
  }
}
