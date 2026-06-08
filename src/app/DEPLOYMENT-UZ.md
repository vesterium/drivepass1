# 🚀 DrivePass+ Deployment Guide для Узбекистана

## Боевой план запуска в Самарканде

---

## 1️⃣ ДОМЕН И ХОСТИНГ

### Купить домен .UZ
```bash
Рекомендуемые домены:
✅ drivepass.uz (идеально!)
✅ autopass.uz
✅ carwash.uz
✅ lavaj.uz (узбекский вариант)
```

**Где купить:**
- **UzDomain** - https://www.uzdomain.uz
- **UZINFOCOM** - https://uzinfocom.uz
- Цена: ~100,000 - 200,000 сум/год

### Настроить HTTPS
```bash
PWA ТРЕБУЕТ HTTPS! Без замочка в адресной строке приложение не установится!

Варианты:
1. Cloudflare (бесплатно) - https://cloudflare.com
   → Добавить сайт
   → Автоматический SSL
   → CDN для быстрой загрузки

2. Let's Encrypt (бесплатно)
   → Автоматический сертификат
   → Обновление каждые 90 дней
```

### Выбрать хостинг
```bash
РЕКОМЕНДУЮ: Vercel или Netlify

Почему:
✅ Бесплатно на старте
✅ Автодеплой из GitHub
✅ CDN по всему миру (быстро грузится в Узбекистане)
✅ HTTPS из коробки
✅ Edge Functions для API

Альтернативы (платные):
- DigitalOcean ($5/месяц)
- AWS Lightsail ($3.50/месяц)
- Hetzner Germany (~€4/месяц, близко к Узбекистану)
```

---

## 2️⃣ SUPABASE НАСТРОЙКА

### Регион базы данных
```bash
ВАЖНО! Выбрать правильный регион:

✅ Frankfurt, Germany (Европа) - 50-80ms пинг до Узбекистана
✅ Singapore (Азия) - 100-150ms пинг

❌ US East (Америка) - 300-500ms пинг (МЕДЛЕННО!)

Как проверить пинг:
ping frankfurt.supabase.co
```

### Environment Variables
```bash
# В Vercel/Netlify добавить переменные окружения:

SUPABASE_URL=https://yourproject.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

⚠️ SERVICE_ROLE_KEY НИКОГДА не должен попасть в клиентский код!
```

### Таблицы и индексы
```sql
-- Убедиться что индексы созданы для быстрых запросов

CREATE INDEX idx_kv_store_key ON kv_store_80c25f01(key);
CREATE INDEX idx_kv_store_prefix ON kv_store_80c25f01(key text_pattern_ops);

-- Для поиска по префиксу (wash:user:*)
CREATE INDEX idx_wash_user ON kv_store_80c25f01(key) 
  WHERE key LIKE 'wash:%';

CREATE INDEX idx_loyalty_user ON kv_store_80c25f01(key) 
  WHERE key LIKE 'loyalty:%';
```

---

## 3️⃣ ДЕПЛОЙ НА VERCEL (Рекомендуется)

### Пошаговая инструкция:

```bash
# 1. Зарегистрироваться на Vercel
https://vercel.com

# 2. Подключить GitHub репозиторий
- Import Project
- Выбрать репозиторий DrivePass+
- Framework Preset: Vite

# 3. Добавить Environment Variables
Settings → Environment Variables:
  SUPABASE_URL=...
  SUPABASE_ANON_KEY=...
  SUPABASE_SERVICE_ROLE_KEY=...

# 4. Deploy!
- Нажать "Deploy"
- Ждать ~2 минуты
- Получить URL: drivepass.vercel.app

# 5. Подключить свой домен
Settings → Domains:
  → Add Domain
  → drivepass.uz
  → Обновить DNS записи (A и CNAME)
```

### Vercel.json конфигурация
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "framework": "vite",
  "rewrites": [
    {
      "source": "/sw.js",
      "destination": "/sw.js"
    },
    {
      "source": "/manifest.json",
      "destination": "/manifest.json"
    },
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ],
  "headers": [
    {
      "source": "/sw.js",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=0, must-revalidate"
        },
        {
          "key": "Service-Worker-Allowed",
          "value": "/"
        }
      ]
    },
    {
      "source": "/manifest.json",
      "headers": [
        {
          "key": "Content-Type",
          "value": "application/manifest+json"
        }
      ]
    }
  ]
}
```

---

## 4️⃣ ПЛАТЕЖНАЯ ИНТЕГРАЦИЯ (Click / PayMe / Payme)

### Click (Узбекистан)
```bash
Документация: https://docs.click.uz

Что нужно:
1. Merchant ID (получить в Click)
2. Secret Key
3. Service ID

Интеграция:
- POST запросы для создания платежа
- Callback URL для подтверждения
- Webhook для уведомлений

Комиссия: ~2-3%
```

### PayMe (от Payme.uz)
```bash
Документация: https://developer.payme.uz

Что нужно:
1. Merchant ID
2. Test/Prod ключи
3. Callback URL

Преимущества:
✅ Популярен в Узбекистане
✅ Интеграция в Click

Комиссия: ~2%
```

### Пример интеграции
```typescript
// /supabase/functions/server/payment.tsx

import { Hono } from 'npm:hono';

const payment = new Hono();

// Click prepare
payment.post('/click/prepare', async (c) => {
  const { click_trans_id, service_id, merchant_trans_id, amount } = await c.req.json();
  
  // Проверка суммы и пользователя
  const isValid = await validatePayment(merchant_trans_id, amount);
  
  if (isValid) {
    return c.json({
      click_trans_id,
      merchant_trans_id,
      error: 0,
      error_note: 'Success'
    });
  }
  
  return c.json({ error: -5, error_note: 'Invalid amount' });
});

// Click complete
payment.post('/click/complete', async (c) => {
  const { click_trans_id, merchant_trans_id } = await c.req.json();
  
  // Активировать подписку пользователя
  await activateSubscription(merchant_trans_id);
  
  return c.json({
    click_trans_id,
    merchant_trans_id,
    error: 0,
    error_note: 'Success'
  });
});
```

---

## 5️⃣ QR-КОДЫ ДЛЯ АВТОМОЕК

### Создать QR-коды
```bash
# Онлайн генераторы:
1. qr-code-generator.com
2. qrcode-monkey.com

# Или программно (в приложении):
npm install qrcode
```

### URL структура
```
Для регистрации клиентов:
https://drivepass.uz?utm_source=qr_table&location=cleanwave_samarkand

Для мойщиков (сканирование):
https://drivepass.uz/partner/scan?station=cleanwave_main
```

### Физические материалы

**Табличка на столе (Table Tent):**
```
Размер: A5 (148x210mm)
Материал: Пластик ламинированный
Макет:

┌──────────────────────────┐
│   [ЛОГОТИП DrivePass+]   │
│                          │
│  Мойте машину каждый     │
│  день от 130,000 сум!    │
│                          │
│    [QR КОД - 5x5cm]      │
│                          │
│  📱 Наведите камеру      │
│  📲 Откройте ссылку      │
│  🎁 Первая мойка -50%!   │
└──────────────────────────┘

Цена печати: ~5,000 сум/шт
Количество: 5-10 на автомойку
```

---

## 6️⃣ МАРКЕТИНГ И ЗАПУСК

### Стратегия "Агент 007"

```bash
ШАГ 1: Найти ТОП автомойку
- Спальный район Самарканда
- Хороший трафик (50+ машин/день)
- Современный владелец

ШАГ 2: Встреча с владельцем
Предложение:
  "Мы платим вам 20,000 сум за каждую мойку по подписке.
   Клиент платит 220,000 сум за 8 моек.
   Вы получаете: 8 × 20,000 = 160,000 сум.
   Клиент экономит: 8 × 50,000 - 220,000 = 180,000 сум.
   Все в плюсе!"

ШАГ 3: Мотивация мойщиков
  "За каждого нового клиента, который зарегистрируется
   через ваш QR-код - 5,000 сум наличкой.
   10 клиентов = 50,000 сум!"

ШАГ 4: Разместить материалы
  - 3 стойки с QR на столах
  - 1 баннер на кассе
  - Наклейки на окнах

ШАГ 5: Личное присутствие
  - Первые 3 дня быть на месте
  - Помогать клиентам регистрироваться
  - Собирать фидбек
```

### Первая неделя (День за Днем)

**День 1:** Договор с автомойкой + установка материалов
**День 2-3:** Личное присутствие, помощь клиентам
**День 4-5:** Мониторинг регистраций, корректировка
**День 6-7:** Подсчет результатов, оплата партнерам

**Цель первой недели:** 20-30 регистраций

---

## 7️⃣ МЕТРИКИ И АНАЛИТИКА

### Google Analytics 4
```html
<!-- В index.html добавить -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-XXXXXXXXXX');
</script>
```

### События для отслеживания
```javascript
// Регистрация
gtag('event', 'sign_up', { method: 'email' });

// Покупка подписки
gtag('event', 'purchase', {
  transaction_id: 'xxx',
  value: 220000,
  currency: 'UZS',
  items: [{ item_name: 'Pro Package', quantity: 1 }]
});

// QR скан
gtag('event', 'qr_scan', { location: 'cleanwave_main' });

// Установка PWA
gtag('event', 'app_install');
```

### Важные метрики
```
KPI для успеха:

Неделя 1:
- Регистрации: 20-30
- Установки PWA: 10-15
- Первые подписки: 5-10

Месяц 1:
- Активные подписчики: 100
- Выручка: 100 × 220,000 = 22,000,000 сум (~$1,900)
- Расходы партнерам: ~3,200,000 сум
- Чистая прибыль: ~18,800,000 сум (~$1,600)

Месяц 6:
- Подписчики: 500
- Выручка: ~110,000,000 сум (~$9,500/мес)
- Прибыль: ~85,000,000 сум (~$7,300/мес)
```

---

## 8️⃣ БЕЗОПАСНОСТЬ И ЗАЩИТА

### Динамический QR-код (TOTP)
```typescript
// Генерация временного QR (обновление каждые 30 сек)
import { authenticator } from 'npm:otplib';

const secret = user.qr_secret; // Хранится в БД
const token = authenticator.generate(secret);

// Токен действителен 30 секунд
// Скриншот бесполезен через минуту!
```

### Привязка госномера
```typescript
// При регистрации
const carPlate = '30 A 777 AA'; // Формат Узбекистан
await kv.set(`user:${userId}:car_plate`, carPlate);

// При сканировании QR мойщик видит:
"Госномер: 30 A 777 AA"
// И сверяет с реальной машиной
```

### Кулдаун между мойками
```typescript
// Нельзя помыться дважды подряд
const lastWash = await kv.get(`user:${userId}:last_wash`);
const now = Date.now();
const threeHours = 3 * 60 * 60 * 1000;

if (lastWash && (now - lastWash) < threeHours) {
  return {
    error: 'Следующая мойка через 3 часа',
    nextWashTime: new Date(lastWash + threeHours)
  };
}
```

---

## 9️⃣ ЧЕКЛИСТ ПЕРЕД ЗАПУСКОМ

```
[ ] Домен drivepass.uz куплен и настроен
[ ] HTTPS работает (замочек в браузере)
[ ] Supabase регион Frankfurt выбран
[ ] Environment variables настроены
[ ] Vercel деплой успешен
[ ] PWA устанавливается на Android
[ ] PWA устанавливается на iOS
[ ] Service Worker работает офлайн
[ ] Платежная система Click интегрирована
[ ] QR-коды напечатаны (10 штук)
[ ] Табл-тенты изготовлены (5 штук)
[ ] Договор с первой автомойкой подписан
[ ] Google Analytics настроен
[ ] Тестовые платежи прошли успешно
[ ] Система безопасности (TOTP, cooldown) работает
[ ] Резервная копия БД настроена
[ ] Мобильный номер поддержки активен
[ ] Telegram канал создан
```

---

## 🔟 КОНТАКТЫ ПОДДЕРЖКИ

### Техническая помощь:
- **Vercel Support:** https://vercel.com/support
- **Supabase Support:** https://supabase.com/support

### Платежные системы:
- **Click:** +998 71 200 09 09
- **PayMe:** +998 95 145 00 00

### Домены:
- **UzDomain:** info@uzdomain.uz

---

## 🎯 ФИНАЛЬНЫЙ ЧЕК

```bash
# 1. Открыть сайт на телефоне
https://drivepass.uz

# 2. Нажать "Добавить на главный экран"

# 3. Открыть приложение

# 4. Зарегистрироваться

# 5. Выбрать пакет PRO (220,000 сум)

# 6. Оплатить через Click

# 7. Получить динамический QR-код

# 8. Поехать на автомойку

# 9. Показать QR мойщику

# 10. ПОМЫТЬСЯ! 🚗✨

ЕСЛИ ВСЕ РАБОТАЕТ - МОЖНО ЗАПУСКАТЬ!
```

---

## 🚀 СТАРТ!

**Готово!** Теперь у вас есть:
- ✅ Полностью рабочее PWA приложение
- ✅ Правильная бизнес-модель (пакеты)
- ✅ План запуска в Самарканде
- ✅ Стратегия маркетинга
- ✅ Система безопасности

**Следующий шаг:** Сделать первые 100 подписчиков!

**ПОЕХАЛИ! ГАЗ В ПОЛ! 💨🚗**

---

*Вопросы? Пиши в Telegram: @drivepass_support*
