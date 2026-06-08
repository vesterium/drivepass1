# 📱 DrivePass+ — Нативное мобильное приложение

## ✅ Статус готовности

| Задача | Android | iOS |
|--------|---------|-----|
| Capacitor проект | ✅ готов | ❌ нужен Mac+Xcode |
| Брендовые иконки | ✅ сгенерированы | ❌ нужен Mac |
| Splash screen #2563EB | ✅ все размеры | ❌ нужен Mac |
| Все плагины (Camera, Geo, Push, Haptics…) | ✅ | ✅ установлены |
| Safe-area / keyboard CSS | ✅ | ✅ |
| Геозащита QR (prod=off) | ✅ | ✅ |
| Deep links uz.drivepass.app:// | ✅ | ❌ нужен Mac |

---

## 🤖 Android — пошаговая сборка

### Требования
- ✅ Node.js 22
- ✅ JDK 21 (устанавливается ниже)
- ⬜ Android Studio → https://developer.android.com/studio

### Если JDK 21 ещё не установлен
```bash
winget install EclipseAdoptium.Temurin.21.JDK
# Перезапусти терминал после установки
```

### Собрать и открыть в Android Studio
```bash
npm run build:android     # build + sync
npm run cap:open:android  # открывает Android Studio
```

### Debug APK (тест на телефоне)
В Android Studio: **Build → Build APK(s)**

Файл: `android/app/build/outputs/apk/debug/app-debug.apk`

```bash
# Установить на телефон через USB (USB-отладка включена):
adb install android/app/build/outputs/apk/debug/app-debug.apk
```

### Release AAB (Google Play)
```
Android Studio:
Build → Generate Signed Bundle/APK → Android App Bundle → Create new keystore

Keystore path : drivepass-release.jks
Password      : (придумай и сохрани!)
Alias         : drivepass
Build Variant : release

→ Finish → получишь app-release.aab
```

### Google Play Console
```
1. play.google.com/console → Новое приложение
2. Package name  : uz.drivepass.app
3. Название      : DrivePass+
4. Загрузи .aab → Internal Testing → Production
5. Проверка: 3–7 дней
```

---

## 🍎 iOS — только на Mac с Xcode

### Требования
- macOS 13+, Xcode 15+
- Apple Developer аккаунт ($99/год)

### Добавить iOS проект (один раз)
```bash
npx cap add ios
npm run build:ios
npx cap open ios          # откроет Xcode
```

### Разрешения (добавить в Info.plist)
Готовый список в файле `ios-config/Info.plist.additions.xml`:
- Камера (QR-сканер): NSCameraUsageDescription
- Геолокация (мойки рядом): NSLocationWhenInUseUsageDescription
- Push-уведомления: UIBackgroundModes → remote-notification

### Иконки iOS
```bash
mkdir -p resources
cp src/app/public/icons/icon.svg resources/icon.svg
npx @capacitor/assets generate --ios
```

### Подпись и публикация
```
Xcode → Signing & Capabilities:
- Team: твой Apple ID
- Bundle ID: uz.drivepass.app

Product → Archive → Distribute → App Store Connect
App Store: 1–3 дня проверки
```

---

## 🔔 Push-уведомления

### Android
```
1. console.firebase.google.com → New Project: DrivePass
2. Add Android app → uz.drivepass.app
3. Скачай google-services.json → положи в android/app/
4. npm run build:android
```

### iOS
```
1. developer.apple.com → Keys → New Key → APNs
2. Скачай .p8 файл
3. Загрузи в Supabase Dashboard → Settings → Auth → Push
```

---

## 🔄 Обновить приложение после изменений кода

```bash
npm run build:android    # пересобрать + синхронизировать Android
npm run build:ios        # пересобрать + синхронизировать iOS (на Mac)
npm run icons            # пересоздать иконки (если менял SVG)
```

---

## 🐛 Отладка на устройстве

```bash
# В capacitor.config.ts временно включи:
webContentsDebuggingEnabled: true

# Android: подключи USB → открой в Chrome:
chrome://inspect

# iOS: Safari → Разработка → [твой iPhone]
```

**Верни `false` перед публикацией в сторы!**

---

## ⚡ Live Reload (разработка на телефоне без пересборки)

```bash
# 1. Узнай IP (например 192.168.1.15):
ipconfig

# 2. В capacitor.config.ts раскомментируй:
# url: 'http://192.168.1.15:5173',
# cleartext: true,

# 3. Запусти:
npm run dev
npx cap run android --livereload --external
```
