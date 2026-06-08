import type { CapacitorConfig } from '@capacitor/cli';

const isDev = process.env.NODE_ENV === 'development';

const config: CapacitorConfig = {
  appId: 'uz.drivepass.app',
  appName: 'DrivePass+',
  webDir: 'dist',

  server: {
    androidScheme: 'https',
    iosScheme: 'capacitor',
    hostname: 'drivepass.app',
    // Live-reload: раскомментируй и вставь свой IP для разработки
    // url: 'http://192.168.1.X:5173',
    // cleartext: true,
  },

  plugins: {
    SplashScreen: {
      launchShowDuration: 1800,
      launchAutoHide: true,
      backgroundColor: '#2563EB',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
      useDialog: false,
      // iOS
      iosSpinnerStyle: 'small',
      spinnerColor: '#ffffff',
    },

    StatusBar: {
      style: 'DARK',
      backgroundColor: '#2563EB',
      overlaysWebView: false,
      animated: true,
    },

    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },

    Keyboard: {
      resize: 'body',
      style: 'DARK',
      resizeOnFullScreen: true,
    },

    LocalNotifications: {
      smallIcon: 'ic_stat_icon_config_sample',
      iconColor: '#2563EB',
      sound: 'beep.wav',
    },
  },

  ios: {
    // Safe-area: контент рисуется под notch, safe-area CSS переменные управляют отступами
    contentInset: 'always',
    scrollEnabled: false,
    backgroundColor: '#2563EB',
    preferredContentMode: 'mobile',
    limitsNavigationsToAppBoundDomains: true,
    allowsLinkPreview: false,
    // Отключаем отскок WebView (bounce effect) — как в нативных приложениях
    webContentsDebuggingEnabled: false,
    // Шрифт системный SF Pro вместо WebKit-дефолта
    overrideUserAgent: 'DrivePassPlus/1.0 (iOS; Capacitor)',
  },

  android: {
    backgroundColor: '#2563EB',
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
    loggingBehavior: 'none',
    // adjustResize сдвигает контент вверх когда открывается клавиатура
    windowSoftInputMode: 'adjustResize',
    overrideUserAgent: 'DrivePassPlus/1.0 (Android; Capacitor)',
  },
};

export default config;
