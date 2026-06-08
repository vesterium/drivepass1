# 🚀 НАСТРОЙКА SUPABASE - ПОШАГОВАЯ ИНСТРУКЦИЯ

## ✅ ЧТО НУЖНО СДЕЛАТЬ

### 1️⃣ ОТКЛЮЧИ EMAIL CONFIRMATION (для быстрого старта)

```
1. Открой: https://supabase.com/dashboard
2. Выбери свой проект
3. Перейди:
   
   Authentication (слева)
   └── Settings (вкладка)
       └── Auth Providers (раздел)
           └── Email (нажми Edit)
               
4. ОТКЛЮЧИ: "Enable email confirmations"
5. Нажми: Save
```

**Результат:** Регистрация сразу логинит пользователя без email подтверждения.

---

### 2️⃣ ВКЛЮЧИ PASSWORD LEAK PROTECTION (безопасность)

```
1. В том же месте (Auth Providers → Email)
2. ВКЛЮЧИ: "Enable password leak protection"
3. Нажми: Save
```

**Результат:** Пароли проверяются по базе HaveIBeenPwned.org

---

### 3️⃣ ЗАПУСТИ SQL МИГРАЦИЮ (создание таблиц)

```
1. Открой: SQL Editor в Supabase Dashboard
   
   SQL Editor (слева)
   └── New Query
   
2. Скопируй ВЕСЬ код из файла:
   /supabase-migration.sql
   
3. Вставь в редактор
4. Нажми: Run (или Ctrl+Enter)
5. Дождись успешного выполнения
```

**Что создастся:**
- ✅ Таблица `users` (пользователи с телефонами и госномерами)
- ✅ Таблица `wash_history` (история моек с 24ч лимитом)
- ✅ Таблица `car_washes` (партнерские автомойки)
- ✅ Таблица `washers` (мойщики)
- ✅ Таблица `subscriptions` (подписки)
- ✅ Функции `can_wash_now()` и `time_until_next_wash()`
- ✅ 3 тестовые автомойки в Самарканде

---

### 4️⃣ ПРОВЕРЬ ТАБЛИЦЫ

```
1. Открой: Table Editor
2. Убедись что создались:
   - users
   - wash_history
   - car_washes
   - washers
   - subscriptions
```

---

### 5️⃣ ПРОВЕРЬ RLS (Row Level Security)

```
1. Открой любую таблицу (например, users)
2. Нажми: "RLS" (справа вверху)
3. Убедись что политики созданы:
   - "Users can read own data"
   - "Users can update own data"
```

**Результат:** Пользователи видят только свои данные.

---

## 🧪 ТЕСТИРОВАНИЕ

### Тест 1: Регистрация с телефоном

```bash
npm run dev

1. Открой приложение
2. Пройди Onboarding
3. Создай аккаунт:
   
   Имя:      Тест Пользователь
   Телефон:  +998 (91) 033 95 11
   Госномер: 30 A 777 AA
   Пароль:   test123
   
4. Ожидается:
   ✅ "Добро пожаловать в DrivePass+! 🎉"
   ✅ Dashboard открывается
   ✅ Показывает: "Добро пожаловать, Тест"
   ✅ Показывает госномер: "30 A 777 AA"
```

### Тест 2: Проверка данных в Supabase

```
1. Открой: Table Editor → users
2. Найди созданного пользователя
3. Проверь поля:
   ✅ name: "Тест Пользователь"
   ✅ phone: "998910339511"
   ✅ formatted_phone: "+998 (91) 033 95 11"
   ✅ car_number: "30 A 777 AA"
   ✅ subscription_tier: "none"
```

### Тест 3: QR код и 24ч лимит

```
1. На Dashboard нажми: "Получить QR код"
2. Ожидается:
   ✅ Toast: "QR код получен!"
   ✅ Кнопка становится серой
   ✅ Показывает: "QR недоступен"
   ✅ Показывает таймер: "Доступно через 23ч 59м"
   
3. Проверь в Supabase (wash_history):
   ✅ Создалась запись с user_id
   ✅ washed_at = сейчас
   ✅ next_available_wash = сейчас + 24 часа
```

---

## 📊 ПРОВЕРКА В SUPABASE DASHBOARD

### Authentication → Users

```
После регистрации:

✅ Email: 998910339511@drivepass.uz
✅ Provider: email
✅ Confirmed: да (если Email Confirmation отключен)
✅ Created: сегодня
```

### Table Editor → users

```
✅ id: UUID (совпадает с auth.users)
✅ name: Имя пользователя
✅ phone: 998910339511 (чистый номер)
✅ formatted_phone: +998 (91) 033 95 11
✅ car_number: 30 A 777 AA
✅ subscription_tier: none (пока)
```

### Table Editor → car_washes

```
✅ 3 автомойки в Самарканде:
   - AutoShine Premium (рейтинг 4.8)
   - Express Wash (рейтинг 4.6)
   - Clean Car Plus (рейтинг 4.7)
```

---

## 🔧 TROUBLESHOOTING

### Ошибка: "relation does not exist"

```
Причина: Таблицы не созданы
Решение: Запусти SQL миграцию (шаг 3)
```

### Ошибка: "permission denied"

```
Причина: RLS политики не настроены
Решение: 
1. Открой таблицу
2. Settings → Enable RLS
3. Или перезапусти SQL миграцию
```

### Ошибка: "already registered"

```
Причина: Номер телефона уже есть в базе
Решение: 
1. Используй другой номер (+998 (93) XXX XX XX)
2. Или удали старого пользователя:
   - Table Editor → users → найди → Delete
   - Authentication → Users → найди → Delete
```

### Кнопка "Получить QR" не работает

```
Причина: Таблица wash_history не создана
Решение: Проверь что SQL миграция выполнена
```

---

## ✅ ФИНАЛЬНАЯ ПРОВЕРКА

```
╔══════════════════════════════════════════╗
║                                          ║
║  ✅ Email Confirmation отключен          ║
║  ✅ Password Leak Protection включен     ║
║  ✅ Все таблицы созданы                  ║
║  ✅ RLS политики работают                ║
║  ✅ Тестовые мойки добавлены             ║
║  ✅ Регистрация по телефону работает     ║
║  ✅ Госномер сохраняется                 ║
║  ✅ QR код генерируется                  ║
║  ✅ 24ч лимит работает                   ║
║                                          ║
║  🎉 ВСЁ ГОТОВО!                          ║
║                                          ║
╚══════════════════════════════════════════╝
```

---

## 📝 ВАЖНЫЕ ЗАМЕТКИ

### Для Development:
- ✅ Email Confirmation ОТКЛЮЧЕН
- ✅ Быстрая регистрация без писем

### Для Production:
- ⚠️ ВКЛЮЧИ Email Confirmation обратно
- ⚠️ Настрой SMTP для писем
- ⚠️ Настрой email templates
- ⚠️ Увеличь Rate Limits если нужно

---

## 🔗 ПОЛЕЗНЫЕ ССЫЛКИ

**Supabase Docs:**
- https://supabase.com/docs/guides/auth
- https://supabase.com/docs/guides/auth/phone-login (для будущего SMS auth)

**Проект:**
- Dashboard: https://supabase.com/dashboard
- SQL Editor: Dashboard → SQL Editor
- Table Editor: Dashboard → Table Editor

---

**Дата:** 15 февраля 2025  
**Версия:** 2.0.0 (Phone Auth + Car Numbers)  
**Статус:** ✅ ГОТОВО К ТЕСТИРОВАНИЮ
