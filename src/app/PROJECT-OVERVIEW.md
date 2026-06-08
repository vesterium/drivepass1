# DrivePass+ — Полное описание проекта

> Последнее обновление: 3 апреля 2026

---

## 1. ЧТО ЭТО ТАКОЕ

**DrivePass+** — PWA-приложение (Progressive Web App), агрегатор автомоек в Узбекистане с подпиской по модели «честный безлимит». Клиент платит фиксированную сумму в месяц и моет машину на любой партнёрской мойке по QR-коду, 1 раз в 24 часа.

**Регион запуска:** Самарканд, Узбекистан (планируется расширение на Ташкент).

---

## 2. БИЗНЕС-МОДЕЛЬ

### 2.1 Тарифы (реализовано)

| Тариф | Цена/мес | Для кого | Экономия |
|-------|----------|----------|----------|
| **Personal** | 220 000 сум (~$19) | Личный авто, 1 машина | 130 000 сум/мес (37%) |
| **Business** | 450 000 сум (~$38) | Такси/коммерческий, 1 машина | 200 000 сум/мес (31%) |

### 2.2 Тариф Luxury (запланирован, НЕ реализован)

| Тариф | Цена/мес | Для кого |
|-------|----------|----------|
| **Luxury** | 1 600 000 сум | Премиум-сегмент Самарканда |

### 2.3 Монетизация

- **Комиссия с моек:** Personal — 25 000 сум/мойка, Business — 35 000 сум/мойка
- **Реферальный бонус:** мойщик получает 5 000 сум за привлечённого клиента, клиент — скидку 10 000 сум
- **Цена одной мойки без подписки:** 50 000 сум

### 2.4 Анти-фрод

- Кулдаун **24 часа** между мойками (хардкод, проверяется на сервере)
- **Grace period:** 2 часа
- **Impossible Travel Detection:** если расстояние между двумя мойками > 5 км за < 30 мин при скорости > 200 км/ч — ставится `fraudFlag`
- **GeoFence:** QR генерируется только в радиусе 500 м от партнёрской мойки (фронтенд-компонент `GeoFenceGuard.tsx`)
- **Привязка:** 1 подписка = 1 госномер авто

---

## 3. ТЕХНИЧЕСКИЙ СТЕК

### 3.1 Фронтенд (то, что собрано здесь)

| Технология | Версия / Назначение |
|------------|-------------------|
| **React** | 18 — UI-фреймворк |
| **TypeScript** | Строгая типизация |
| **Tailwind CSS** | v4 — стилизация |
| **Shadcn/UI** | Библиотека UI-компонентов (полный набор в `/components/ui/`) |
| **Motion** (ex-Framer Motion) | Анимации переходов, навигации, логотипа |
| **Lucide React** | Иконки |
| **Sonner** | Тост-уведомления |
| **Leaflet/OSM** | Карта автомоек (через обёртку `YandexMap.tsx`) |

### 3.2 Бэкенд (Supabase)

| Компонент | Назначение |
|-----------|-----------|
| **Supabase Auth** | Аутентификация по номеру +998, email = `998XXXXXXXXX@drivepass.uz` (скрыт) |
| **Supabase Edge Functions (Deno + Hono)** | REST API: `/supabase/functions/server/index.tsx` |
| **KV Store** | Key-Value хранилище через `kv_store.tsx` (подписки, кулдауны, мойки, баланс) |
| **PostgreSQL (Supabase)** | Таблица `kv_store_80c25f01` + таблица `users` |

### 3.3 Внешние сервисы

| Сервис | Статус | Назначение |
|--------|--------|-----------|
| **Eskiz.uz** | Интегрирован в код | SMS-отправка (OTP, уведомления об истечении, подтверждение оплаты) |
| **Payme** | Webhook реализован | JSON-RPC вебхук: `CheckPerformTransaction`, `CreateTransaction`, `PerformTransaction`, `CancelTransaction`, `CheckTransaction` |
| **Click** | Webhook реализован | Вебхук: `action=0` (prepare), `action=1` (complete) |

---

## 4. ЧТО СДЕЛАНО (полный список компонентов)

### 4.1 Пользовательские экраны

| Компонент | Файл | Что делает |
|-----------|------|-----------|
| **Onboarding** | `Onboarding.tsx` | Стартовый тур для нового пользователя (3 шага) |
| **WelcomeScreen** | `WelcomeScreen.tsx` | Выбор роли: «Клиент» или «Партнёр (мойка)» |
| **Auth** | `Auth.tsx` | Вход/регистрация по телефону +998, OTP-верификация через SMS, пароль |
| **Dashboard** | `Dashboard.tsx` | Главный экран клиента: подписка, QR, статистика, экономия |
| **Locations** | `Locations.tsx` | Список и карта партнёрских автомоек |
| **Scanner** | `Scanner.tsx` | QR-сканер для клиента |
| **Profile** | `Profile.tsx` | Профиль пользователя, настройки, выход |
| **WashHistory** | `WashHistory.tsx` | История моек с датами и местами |
| **BookingFlow** | `BookingFlow.tsx` | Бронирование мойки: выбор места, времени, типа услуги |
| **Marketplace** | `Marketplace.tsx` | Витрина доп. услуг |
| **Loyalty** | `Loyalty.tsx` | Программа лояльности: Bronze → Silver → Gold → Platinum |
| **FrugalityIndex** | `FrugalityIndex.tsx` | Индекс экономии пользователя |
| **Certificate** | `Certificate.tsx` | Сертификат экономии |
| **Services** | `Services.tsx` | Каталог сервисов (детейлинг, шиномонтаж, химчистка и др.) с картой |

### 4.2 Партнёрская панель

| Компонент | Файл | Что делает |
|-----------|------|-----------|
| **PartnerDashboard** | `PartnerDashboard.tsx` | Дашборд владельца мойки: статистика, баланс, мойки за сегодня |
| **PartnerScanner** | `PartnerScanner.tsx` | QR-сканер для подтверждения мойки партнёром |
| **PartnerSettings** | `PartnerSettings.tsx` | Настройки партнёра |
| **PayoutReports** | `PayoutReports.tsx` | Отчёты по выплатам мойкам |

### 4.3 Системные / CEO-панель

| Компонент | Файл | Что делает |
|-----------|------|-----------|
| **LaunchControlCenter** | `LaunchControlCenter.tsx` | CEO-дашборд: чеклист запуска, метрики, контроль готовности |
| **LaunchChecklist** | `LaunchChecklist.tsx` | Чеклист для запуска |
| **SmartLoadBalancer** | `SmartLoadBalancer.tsx` | Распределение нагрузки на мойки в реальном времени |
| **GeoFenceGuard** | `GeoFenceGuard.tsx` | Гео-ограждение: проверка нахождения у мойки |
| **WashCooldownScreen** | `WashCooldownScreen.tsx` | Экран кулдауна «до следующей мойки X часов» |

### 4.4 Общие компоненты

| Компонент | Файл | Что делает |
|-----------|------|-----------|
| **DrivePassLogo** | `DrivePassLogo.tsx` | Единый SVG-логотип, варианты: default/white/mono, animated/static |
| **QRDisplay** | `QRDisplay.tsx` | Генерация и показ QR-кода |
| **ModalPortal** | `ModalPortal.tsx` | Портал для модальных окон |
| **SubscriptionModal** | `SubscriptionModal.tsx` | Модал выбора подписки |
| **ManageSubscriptionModal** | `ManageSubscriptionModal.tsx` | Управление подпиской |
| **BookingModal** | `BookingModal.tsx` | Модал бронирования |
| **Reviews** | `Reviews.tsx` | Отзывы о мойках |
| **InstallPrompt** | `InstallPrompt.tsx` | PWA-промпт «Установить на экран» |

### 4.5 Контексты (глобальное состояние)

| Контекст | Файл | Что хранит |
|----------|------|-----------|
| **AuthContext** | `contexts/AuthContext.tsx` | Сессия Supabase, user, accessToken, signOut |
| **LanguageContext** | `contexts/LanguageContext.tsx` | Текущий язык (RU/EN/UZ), функция `t()` |
| **SubscriptionContext** | `contexts/SubscriptionContext.tsx` | Подписка: tier, status, carPlate, expiresAt |

### 4.6 Локализация

Три языка: **EN**, **RU**, **UZ** — файл `/translations/index.ts`. Покрывает: навигацию, дашборд, профиль, подписки, лояльность, локации.

### 4.7 PWA

- `/public/manifest.json` — манифест
- `/public/sw.js` — Service Worker (офлайн)
- `/public/offline.html` — офлайн-страница
- `/public/icons/icon.svg` — иконка приложения (синхронизирована с `DrivePassLogo`)

---

## 5. API ЭНДПОИНТЫ (сервер)

Все эндпоинты в `/supabase/functions/server/index.tsx`:

### 5.1 Аутентификация и OTP

| Метод | Путь | Что делает |
|-------|------|-----------|
| `POST` | `/otp/send` | Отправка 6-значного SMS-кода (rate limit 60 сек) |
| `POST` | `/otp/verify` | Проверка OTP (макс. 3 попытки, TTL 2 мин) |
| `POST` | `/auth/register` | Регистрация: телефон → email `998XXX@drivepass.uz`, создание через admin API |

### 5.2 Подписка

| Метод | Путь | Что делает |
|-------|------|-----------|
| `GET` | `/subscription` | Получение текущей подписки пользователя |
| `POST` | `/subscription/activate` | Активация подписки (sandbox) |
| `POST` | `/subscription/notify-expiring` | Cron: SMS-уведомление за N дней до истечения |

### 5.3 Платежи

| Метод | Путь | Что делает |
|-------|------|-----------|
| `POST` | `/payment/initiate` | Инициализация платежа (pending) |
| `POST` | `/payment/confirm` | Подтверждение (sandbox), стекинг подписки + SMS |
| `POST` | `/payment/payme-webhook` | Payme JSON-RPC (5 методов) |
| `POST` | `/payment/click-webhook` | Click (action 0/1) |

### 5.4 QR-коды

| Метод | Путь | Что делает |
|-------|------|-----------|
| `POST` | `/qr/generate` | Генерация HMAC-SHA256 подписанного QR-токена (TTL 5 мин) |
| `POST` | `/qr/validate` | Валидация QR партнёром |
| `POST` | `/qr/confirm-wash` | Подтверждение мойки: cooldown, loyalty +10, баланс партнёра, impossible travel check |

### 5.5 Остальные

| Метод | Путь | Что делает |
|-------|------|-----------|
| `GET` | `/cooldown` | Проверка кулдауна 24 ч |
| `GET/POST` | `/reviews/:locationId` | Отзывы о мойке |
| `GET/POST` | `/loyalty/points`, `/earn`, `/redeem` | Программа лояльности (Bronze → Platinum) |
| `GET/POST` | `/washes` | История моек |
| `GET` | `/partner/stats` | Статистика партнёра |
| `GET` | `/occupancy` | Загруженность моек в реальном времени |
| `GET/POST/DELETE` | `/bookings` | Бронирования |
| `GET` | `/certificate` | Данные для сертификата экономии |
| `GET` | `/health` | Healthcheck API |

---

## 6. ЧТО РАБОТАЕТ (при наличии Supabase)

1. Полный поток регистрации/входа по номеру +998 через OTP SMS
2. Выбор роли: клиент или партнёр (мойка)
3. Онбординг для новых пользователей
4. Оформление подписки Personal/Business с sandbox-оплатой
5. Генерация QR-кода (HMAC-SHA256, TTL 5 мин) с проверкой подписки и кулдауна
6. Валидация QR партнёром и подтверждение мойки
7. Кулдаун 24 часа между мойками (серверная проверка)
8. Impossible Travel антифрод (серверная проверка)
9. GeoFence 500 м (фронтенд-проверка)
10. Программа лояльности: начисление баллов, уровни, обмен
11. История моек
12. Бронирование мойки
13. Партнёрская панель: статистика, баланс, сканер
14. Отчёты по выплатам
15. Вебхуки Payme (полный JSON-RPC) и Click
16. SMS через Eskiz.uz (OTP, подтверждение оплаты, напоминания)
17. Стекинг подписок (продление не теряет дни)
18. Cron-уведомления о скором истечении подписки
19. Smart Load Balancer (распределение по мойкам)
20. Локализация RU/EN/UZ
21. PWA: manifest, Service Worker, офлайн-режим, промпт установки
22. CEO Launch Control Center
23. Каталог дополнительных сервисов с картой

---

## 7. ЧТО НЕ РАБОТАЕТ / НЕ РЕАЛИЗОВАНО

### 7.1 Не подключено (требует реальных ключей)

| Что | Почему |
|-----|--------|
| **Payme боевой** | Нужны `PAYME_MERCHANT_ID` и `PAYME_KEY` в env |
| **Click боевой** | Нужны `CLICK_SERVICE_ID` и `CLICK_SECRET_KEY` в env |
| **Eskiz.uz SMS** | Нужны `ESKIZ_EMAIL` и `ESKIZ_PASSWORD` в env (в dev-режиме OTP показывается в ответе API) |
| **pg_cron** | Cron для `notify-expiring` нужно настроить в Supabase SQL + переменная `CRON_SECRET` |

### 7.2 Не реализовано в коде

| Что | Статус |
|-----|--------|
| **Тариф Luxury (1 600 000 сум)** | Только в планах, не добавлен в `pricing.ts` и UI |
| **Push-уведомления** | Нет (PWA может через Web Push, но не реализовано) |
| **Рекуррентные платежи (автосписание)** | Нет, только ручное продление |
| **Нативное приложение (Flutter/iOS/Android)** | Это PWA, не нативное |
| **Device Fingerprint антифрод** | Не реализован (только impossible travel + geofence) |
| **Привязка к устройству** | Нет |
| **Панель администратора** | Нет отдельной admin-панели (только CEO LaunchControlCenter) |
| **Управление партнёрами (CRUD)** | Партнёры хардкодированы, нет админки для добавления моек |
| **Аналитика и метрики (BI)** | Нет дашборда аналитики по бизнесу |
| **Email-уведомления** | Нет (только SMS) |
| **Мультивалютность** | Только UZS |
| **Несколько машин на аккаунт** | 1 подписка = 1 госномер |
| **Реальная карта моек** | Координаты захардкожены, нет динамической загрузки из БД |
| **Рейтинг и сортировка моек** | Базовая реализация, нет ML-рекомендаций |
| **Реферальная программа** | Константы есть, UI и API не реализованы |
| **Выплаты партнёрам** | Баланс считается, но вывод средств не реализован |
| **RLS (Row Level Security)** | SQL-миграция есть, но KV Store не использует RLS |

### 7.3 Ограничения архитектуры

| Ограничение | Пояснение |
|-------------|-----------|
| **KV Store вместо реляционной БД** | Все данные (подписки, мойки, баланс) хранятся в одной таблице key-value. Масштабирование ограничено. |
| **Нет очередей/воркеров** | Всё синхронно в Edge Functions. При большой нагрузке — узкое горлышко. |
| **GeoFence только на фронтенде** | Опытный пользователь может обойти через DevTools. Серверной проверки координат при генерации QR нет. |
| **Нет rate limiting на API** | Только OTP имеет rate limit. Остальные эндпоинты не защищены. |
| **Нет тестов** | Ни unit, ни e2e тестов нет. |
| **Нет CI/CD** | Нет автоматического деплоя. |

---

## 8. СТРУКТУРА ФАЙЛОВ

```
/
├── App.tsx                          # Точка входа, роутинг по View, навигация
├── components/
│   ├── Auth.tsx                     # Вход/регистрация
│   ├── BookingFlow.tsx              # Бронирование
│   ├── BookingModal.tsx             # Модал бронирования
│   ├── Certificate.tsx              # Сертификат экономии
│   ├── Dashboard.tsx                # Главный экран клиента
│   ├── DrivePassLogo.tsx            # SVG-логотип
│   ├── FrugalityIndex.tsx           # Индекс экономии
│   ├── GeoFenceGuard.tsx            # Гео-ограждение 500м
│   ├── InstallPrompt.tsx            # PWA install prompt
│   ├── LaunchChecklist.tsx          # Чеклист запуска
│   ├── LaunchControlCenter.tsx      # CEO-панель
│   ├── Locations.tsx                # Карта моек
│   ├── Loyalty.tsx                  # Программа лояльности
│   ├── ManageSubscriptionModal.tsx  # Управление подпиской
│   ├── Marketplace.tsx              # Доп. услуги
│   ├── ModalPortal.tsx              # Портал модалок
│   ├── Onboarding.tsx               # Онбординг
│   ├── PartnerDashboard.tsx         # Панель партнёра
│   ├── PartnerScanner.tsx           # QR-сканер партнёра
│   ├── PartnerSettings.tsx          # Настройки партнёра
│   ├── PayoutReports.tsx            # Отчёты выплат
│   ├── Profile.tsx                  # Профиль
│   ├── QRDisplay.tsx                # Показ QR-кода
│   ├── Reviews.tsx                  # Отзывы
│   ├── Scanner.tsx                  # QR-сканер клиента
│   ├── Services.tsx                 # Каталог сервисов
│   ├── SmartLoadBalancer.tsx        # Балансировщик нагрузки
│   ├── SubscriptionManageModal.tsx  # Управление подпиской (альт.)
│   ├── SubscriptionModal.tsx        # Выбор подписки
│   ├── WashCooldownScreen.tsx       # Экран кулдауна
│   ├── WashHistory.tsx              # История моек
│   ├── WelcomeScreen.tsx            # Экран выбора роли
│   ├── YandexMap.tsx                # Карта (Leaflet/OSM)
│   └── ui/                          # Shadcn/UI компоненты (30+ штук)
├── constants/
│   ├── branding.ts                  # Бренд: цвета, шрифты, trust indicators
│   └── pricing.ts                   # Тарифы, комиссии, лимиты
├── contexts/
│   ├── AuthContext.tsx               # Авторизация
│   ├── LanguageContext.tsx           # Локализация
│   └── SubscriptionContext.tsx       # Подписка
├── translations/
│   └── index.ts                     # RU/EN/UZ переводы
├── utils/
│   ├── apiClient.ts                 # API-утилиты (headers, url)
│   └── supabase/
│       ├── client.ts                # Supabase JS клиент
│       └── info.tsx                 # projectId, anonKey
├── supabase/
│   └── functions/server/
│       ├── index.tsx                # ВСЕ API эндпоинты (Hono)
│       └── kv_store.tsx             # KV Store обёртка
├── styles/
│   └── globals.css                  # Tailwind v4 + кастомные стили
├── public/
│   ├── manifest.json                # PWA манифест
│   ├── sw.js                        # Service Worker
│   ├── offline.html                 # Офлайн-страница
│   └── icons/icon.svg               # Иконка приложения
└── supabase-migration.sql           # SQL миграция для Supabase
```

---

## 9. КАК ЗАПУСТИТЬ

1. Подключить Supabase проект (projectId + anonKey в `utils/supabase/info.tsx`)
2. Развернуть Edge Function (`supabase functions deploy server`)
3. Задать env-переменные:
   - `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`
   - `ESKIZ_EMAIL`, `ESKIZ_PASSWORD` (для SMS)
   - `PAYME_MERCHANT_ID`, `PAYME_KEY` (для Payme)
   - `CLICK_SERVICE_ID`, `CLICK_SECRET_KEY` (для Click)
   - `CRON_SECRET` (для cron-уведомлений)
4. Выполнить `supabase-migration.sql`
5. Открыть приложение → Онбординг → Выбор роли → Вход по номеру +998

---

## 10. РЕЗЮМЕ

| Параметр | Значение |
|----------|----------|
| **Тип** | PWA (Progressive Web App) |
| **Готовность** | MVP — фронтенд и API полностью собраны, нужны реальные ключи |
| **Компоненты** | 30+ React-компонентов |
| **API эндпоинтов** | 20+ |
| **Языки** | RU, EN, UZ |
| **Платёжные системы** | Payme + Click (вебхуки готовы) |
| **SMS** | Eskiz.uz |
| **Антифрод** | Cooldown 24ч + Impossible Travel + GeoFence 500м |
| **Тесты** | Нет |
| **Нативное приложение** | Нет (только PWA) |
