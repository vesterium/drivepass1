import { Hono, type Context } from 'npm:hono';
import { cors } from 'npm:hono/cors';
import { logger } from 'npm:hono/logger';
import { createClient } from 'npm:@supabase/supabase-js';
import * as kv from './kv_store.tsx';

const app = new Hono();

// Middleware
app.use('*', cors({ origin: '*', credentials: true }));
app.use('*', logger(console.log));

// Supabase client (service role — admin access)
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
);

// Supabase anon client — required for signInWithPassword
// (service_role key is rejected by the /auth/v1/token endpoint)
const supabaseAnon = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_ANON_KEY') ?? '',
);

const QR_SECRET = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? 'drivepass-qr-secret-2024';

// ─────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────

/**
 * verifyUser — extracts and validates the user JWT from the request.
 *
 * The frontend sends TWO auth-related headers:
 *   Authorization: Bearer <publicAnonKey>   ← satisfies the Supabase gateway
 *   X-User-Token:  <user JWT>               ← carries the actual user identity
 *
 * We prefer X-User-Token; fall back to Authorization for backwards compat.
 */
async function verifyUser(c: Context) {
  const rawToken =
    c.req.header('X-User-Token')?.trim() ||
    c.req.header('Authorization')?.replace(/^Bearer\s+/i, '').trim();

  if (!rawToken) return null;

  // Strip any accidental "Bearer " prefix from X-User-Token
  const accessToken = rawToken.replace(/^Bearer\s+/i, '').trim();
  if (!accessToken) return null;

  try {
    const parts = accessToken.split('.');
    if (parts.length !== 3) {
      console.log('[verifyUser] Not a JWT (parts != 3)');
      return null;
    }

    // base64url → base64 → bytes → UTF-8 string
    // TextDecoder handles Cyrillic/Uzbek names in user_metadata correctly.
    const b64url = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const pad    = '='.repeat((4 - (b64url.length % 4)) % 4);
    const binary = atob(b64url + pad);
    const bytes  = Uint8Array.from(binary, ch => ch.charCodeAt(0));
    const claims = JSON.parse(new TextDecoder('utf-8').decode(bytes));

    console.log('[verifyUser] role:', claims.role, '| sub:', (claims.sub as string)?.slice(0, 8));

    // Reject anon / service-role keys — only real user sessions allowed
    if (!claims.sub || claims.role !== 'authenticated') {
      console.log('[verifyUser] Rejected: not an authenticated user token');
      return null;
    }

    // Check expiry (exp is Unix seconds)
    if (claims.exp && claims.exp * 1000 < Date.now()) {
      console.log('[verifyUser] Token expired');
      return null;
    }

    return {
      id: claims.sub as string,
      email: (claims.email as string) || '',
      user_metadata: (claims.user_metadata as Record<string, any>) || {},
      created_at: claims.iat
        ? new Date((claims.iat as number) * 1000).toISOString()
        : new Date().toISOString(),
    };
  } catch (e) {
    console.log('[verifyUser] JWT decode error:', e);
    return null;
  }
}

async function signPayload(payload: object): Promise<string> {
  const encoder = new TextEncoder();
  const payloadStr = JSON.stringify(payload);
  const keyMaterial = encoder.encode(QR_SECRET);
  const key = await crypto.subtle.importKey(
    'raw', keyMaterial, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(payloadStr));
  const sigHex = Array.from(new Uint8Array(sig))
    .map(b => b.toString(16).padStart(2, '0')).join('');
  return `${btoa(payloadStr)}.${sigHex}`;
}

async function verifyQRToken(token: string): Promise<any | null> {
  try {
    const dotIdx = token.lastIndexOf('.');
    if (dotIdx === -1) return null;
    const payloadB64 = token.slice(0, dotIdx);
    const sigHex = token.slice(dotIdx + 1);
    const payloadStr = atob(payloadB64);
    const payload = JSON.parse(payloadStr);
    if (payload.exp < Date.now()) return null;

    const encoder = new TextEncoder();
    const keyMaterial = encoder.encode(QR_SECRET);
    const key = await crypto.subtle.importKey(
      'raw', keyMaterial, { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']
    );
    const hexPairs = sigHex.match(/.{2}/g);
    if (!hexPairs) return null;
    const sigBytes = new Uint8Array(hexPairs.map((b: string) => parseInt(b, 16)));
    const valid = await crypto.subtle.verify('HMAC', key, sigBytes, encoder.encode(payloadStr));
    return valid ? payload : null;
  } catch {
    return null;
  }
}

async function sendEskizSMS(phone: string, message: string): Promise<boolean> {
  const eskizEmail = Deno.env.get('ESKIZ_EMAIL');
  const eskizPassword = Deno.env.get('ESKIZ_PASSWORD');
  if (!eskizEmail || !eskizPassword) return false;

  try {
    const authResp = await fetch('https://notify.eskiz.uz/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: eskizEmail, password: eskizPassword }),
    });
    const authData = await authResp.json();
    const token = authData?.data?.token;
    if (!token) return false;

    const cleanPhone = phone.replace(/\D/g, '');
    const smsResp = await fetch('https://notify.eskiz.uz/api/message/sms/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        mobile_phone: cleanPhone,
        message,
        from: '4546',
      }),
    });
    const smsData = await smsResp.json();
    console.log('Eskiz SMS response:', JSON.stringify(smsData));
    return smsData?.id ? true : false;
  } catch (e) {
    console.log('Eskiz SMS error:', e);
    return false;
  }
}

// ─────────────────────────────────────────
// SUBSCRIPTION RENEWAL HELPER
// Стекинг: если подписка ещё активна — продлевает от даты окончания.
// Иначе — новая подписка с текущего момента.
// Отправляет SMS-подтверждение (non-blocking).
// ─────────────────────────────────────────

async function autoRenewSubscription(
  userId: string,
  tier: string,
  carPlate: string,
  paymentId: string,
  provider: string,
  phone?: string,
): Promise<Record<string, unknown>> {
  const existing = await kv.get(`subscription:${userId}`);
  const now = new Date();

  let newStart: Date;
  let newEnd: Date;
  let stacked = false;

  if (existing?.status === 'active' && new Date(existing.expiresAt) > now) {
    // Стекинг: начинаем от текущего конца, пользователь не теряет дни
    newStart = new Date(existing.expiresAt);
    newEnd   = new Date(newStart.getTime() + 30 * 24 * 60 * 60 * 1000);
    stacked  = true;
    console.log(`[renewal] Stacking ${userId}: ${existing.expiresAt} → ${newEnd.toISOString()}`);
  } else {
    newStart = now;
    newEnd   = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    console.log(`[renewal] New subscription ${userId} → ${newEnd.toISOString()}`);
  }

  const subscription = {
    id: crypto.randomUUID(),
    userId,
    tier,
    carPlate: carPlate.toUpperCase(),
    status:   'active',
    paymentId,
    provider,
    stacked,
    createdAt: now.toISOString(),
    startedAt: newStart.toISOString(),
    expiresAt: newEnd.toISOString(),
  };

  await kv.set(`subscription:${userId}`, subscription);

  // SMS-подтверждение (non-blocking)
  if (phone) {
    const prices: Record<string, number> = { personal: 990_000, business: 1_800_000 };
    const price     = prices[tier] ?? 990_000;
    const expiryStr = newEnd.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
    const tierLabel = tier === 'business' ? 'Business' : 'Personal';
    const msg = stacked
      ? `DrivePass+ продлён! Тариф ${tierLabel} активен до ${expiryStr}. Оплачено: ${price.toLocaleString('ru-RU')} сум.`
      : `DrivePass+ активирован! Тариф ${tierLabel} до ${expiryStr}. Оплачено: ${price.toLocaleString('ru-RU')} сум. Удачных поездок!`;
    sendEskizSMS(phone, msg).catch(e => console.log('[SMS] error:', e));
  }

  return subscription;
}

// ─────────────────────────────────────────
// HEALTH CHECK
// ─────────────────────────────────────────

app.get('/make-server-80c25f01/health', (c) => {
  return c.json({ status: 'ok', service: 'DrivePass+ API v2', timestamp: new Date().toISOString() });
});

// ─────────────────────────────────────────
// OTP ROUTES
// ─────────────────────────────────────────

app.post('/make-server-80c25f01/otp/send', async (c) => {
  try {
    const { phone } = await c.req.json();
    if (!phone) return c.json({ error: 'Номер телефона обязателен' }, 400);

    const cleanPhone = phone.replace(/\D/g, '');
    if (!cleanPhone.startsWith('998') || cleanPhone.length !== 12) {
      return c.json({ error: 'Неверный формат номера. Используйте +998 XX XXX XX XX' }, 400);
    }

    const existing = await kv.get(`otp:${cleanPhone}`);
    if (existing?.sentAt && existing.sentAt > Date.now() - 60000) {
      const waitSec = Math.ceil((existing.sentAt + 60000 - Date.now()) / 1000);
      return c.json({ error: `Подождите ${waitSec} секунд перед повторной отправкой` }, 429);
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = Date.now() + 120 * 1000;

    await kv.set(`otp:${cleanPhone}`, {
      code, expires, attempts: 0, sentAt: Date.now()
    });

    const message = `DrivePass+ код: ${code}. Действителен 2 минуты. Никому не передавайте!`;
    const smsSent = await sendEskizSMS(cleanPhone, message);

    console.log(`OTP for ${cleanPhone}: ${code} (smsSent: ${smsSent})`);

    return c.json({
      success: true,
      smsSent,
      devCode: smsSent ? undefined : code,
      expiresIn: 120,
    });
  } catch (error) {
    console.log('OTP send error:', error);
    return c.json({ error: `Ошибка отправки OTP: ${error}` }, 500);
  }
});

app.post('/make-server-80c25f01/otp/verify', async (c) => {
  try {
    const { phone, code } = await c.req.json();
    const cleanPhone = phone.replace(/\D/g, '');

    const otpData = await kv.get(`otp:${cleanPhone}`);
    if (!otpData) {
      return c.json({ error: 'OTP не найден или истёк. Запросите новый.' }, 400);
    }

    const { code: storedCode, expires, attempts } = otpData;

    if (Date.now() > expires) {
      await kv.del(`otp:${cleanPhone}`);
      return c.json({ error: 'Время действия OTP истекло. Запросите новый.' }, 400);
    }

    if (attempts >= 3) {
      await kv.del(`otp:${cleanPhone}`);
      return c.json({ error: 'Превышено количество попыток. Запросите новый OTP.' }, 400);
    }

    if (code !== storedCode) {
      await kv.set(`otp:${cleanPhone}`, { ...otpData, attempts: attempts + 1 });
      const left = 2 - attempts;
      return c.json({ error: `Неверный код. Осталось попыток: ${left}` }, 400);
    }

    await kv.del(`otp:${cleanPhone}`);
    await kv.set(`otp_verified:${cleanPhone}`, { verified: true, at: Date.now() });

    return c.json({ success: true });
  } catch (error) {
    console.log('OTP verify error:', error);
    return c.json({ error: `Ошибка верификации OTP: ${error}` }, 500);
  }
});

// ─────────────────────────────────────────
// SUBSCRIPTION ROUTES
// ─────────────────────────────────────────

app.get('/make-server-80c25f01/subscription', async (c) => {
  try {
    const user = await verifyUser(c);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const sub = await kv.get(`subscription:${user.id}`);
    if (!sub) {
      return c.json({ subscription: null });
    }

    return c.json({ subscription: sub });
  } catch (error) {
    console.log('Get subscription error:', error);
    return c.json({ error: `Ошибка получения подписки: ${error}` }, 500);
  }
});

app.post('/make-server-80c25f01/subscription/activate', async (c) => {
  try {
    const user = await verifyUser(c);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const { tier, carPlate, paymentId } = await c.req.json();

    if (!['personal', 'business'].includes(tier)) {
      return c.json({ error: 'Неверный тариф. Доступны: personal, business' }, 400);
    }
    if (!carPlate) {
      return c.json({ error: 'Госномер автомобиля обязателен' }, 400);
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const subscription = {
      id: crypto.randomUUID(),
      userId: user.id,
      tier,
      carPlate: carPlate.toUpperCase(),
      status: 'active',
      paymentId: paymentId || 'sandbox',
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
    };

    await kv.set(`subscription:${user.id}`, subscription);

    return c.json({ subscription });
  } catch (error) {
    console.log('Activate subscription error:', error);
    return c.json({ error: `Ошибка активации подписки: ${error}` }, 500);
  }
});

// ─────────────────────────────────────────
// COOLDOWN ROUTES
// ─────────────────────────────────────────

app.get('/make-server-80c25f01/cooldown', async (c) => {
  try {
    const user = await verifyUser(c);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const cooldown = await kv.get(`cooldown:${user.id}`);
    if (!cooldown) {
      return c.json({ canWash: true, nextWashAt: null, timeLeft: null });
    }

    const { lastWashAt } = cooldown;
    const nextWashAt = new Date(lastWashAt + 24 * 60 * 60 * 1000);
    const now = new Date();

    if (now >= nextWashAt) {
      return c.json({ canWash: true, nextWashAt: null, timeLeft: null });
    }

    const diff = nextWashAt.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    return c.json({
      canWash: false,
      nextWashAt: nextWashAt.toISOString(),
      timeLeft: `${hours}ч ${minutes}м`,
      lastWashAt: new Date(lastWashAt).toISOString(),
    });
  } catch (error) {
    console.log('Cooldown check error:', error);
    return c.json({ error: `Ошибка проверки кулдауна: ${error}` }, 500);
  }
});

// ─────────────────────────────────────────
// QR CODE ROUTES
// ─────────────────────────────────────────

app.post('/make-server-80c25f01/qr/generate', async (c) => {
  try {
    const user = await verifyUser(c);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const sub = await kv.get(`subscription:${user.id}`);
    if (!sub || sub.status !== 'active') {
      return c.json({ error: 'Нет активной подписки. Оформите подписку.' }, 403);
    }

    const subscription = sub;

    if (new Date(subscription.expiresAt) < new Date()) {
      await kv.set(`subscription:${user.id}`, { ...subscription, status: 'expired' });
      return c.json({ error: 'Подписка истекла. Оформите новую.' }, 403);
    }

    const cooldown = await kv.get(`cooldown:${user.id}`);
    if (cooldown?.lastWashAt) {
      const nextWashAt = new Date(cooldown.lastWashAt + 24 * 60 * 60 * 1000);
      if (new Date() < nextWashAt) {
        const diff = nextWashAt.getTime() - Date.now();
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        return c.json({
          error: `Следующая мойка доступна через ${hours}ч ${minutes}м`,
          cooldown: true,
          nextWashAt: nextWashAt.toISOString(),
          timeLeft: `${hours}ч ${minutes}м`,
        }, 429);
      }
    }

    const now = Date.now();
    const payload = {
      uid: user.id,
      cp: subscription.carPlate,
      sid: subscription.id,
      tier: subscription.tier,
      ts: now,
      exp: now + 5 * 60 * 1000,
    };

    const token = await signPayload(payload);

    return c.json({ token, expiresAt: payload.exp, carPlate: subscription.carPlate });
  } catch (error) {
    console.log('QR generate error:', error);
    return c.json({ error: `Ошибка генерации QR: ${error}` }, 500);
  }
});

app.post('/make-server-80c25f01/qr/validate', async (c) => {
  try {
    const user = await verifyUser(c);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const { token } = await c.req.json();
    if (!token) return c.json({ valid: false, error: 'QR токен не передан' });

    const payload = await verifyQRToken(token);
    if (!payload) {
      return c.json({ valid: false, error: 'QR недействителен или истёк' });
    }

    const sub = await kv.get(`subscription:${payload.uid}`);
    if (!sub || sub.status !== 'active') {
      return c.json({ valid: false, error: 'Подписка неактивна или не найдена' });
    }

    if (new Date(sub.expiresAt) < new Date()) {
      return c.json({ valid: false, error: 'Срок подписки истёк' });
    }

    const cooldown = await kv.get(`cooldown:${payload.uid}`);
    if (cooldown?.lastWashAt) {
      const nextWashAt = new Date(cooldown.lastWashAt + 24 * 60 * 60 * 1000);
      if (new Date() < nextWashAt) {
        const diff = nextWashAt.getTime() - Date.now();
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        return c.json({
          valid: false,
          error: `Cooldown активен. Следующая мойка через ${hours}ч ${minutes}м`,
          cooldown: true,
          timeLeft: `${hours}ч ${minutes}м`,
        });
      }
    }

    return c.json({
      valid: true,
      carPlate: payload.cp,
      tier: payload.tier,
      userId: payload.uid,
      subscriptionId: payload.sid,
    });
  } catch (error) {
    console.log('QR validate error:', error);
    return c.json({ error: `Ошибка валидации QR: ${error}` }, 500);
  }
});

app.post('/make-server-80c25f01/qr/confirm-wash', async (c) => {
  try {
    const user = await verifyUser(c);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const { token, partnerId, partnerName, lat, lng } = await c.req.json();

    const payload = await verifyQRToken(token);
    if (!payload) {
      return c.json({ error: 'QR недействителен или истёк' }, 400);
    }

    const cooldown = await kv.get(`cooldown:${payload.uid}`);
    if (cooldown?.lastWashAt) {
      const nextWashAt = new Date(cooldown.lastWashAt + 24 * 60 * 60 * 1000);
      if (new Date() < nextWashAt) {
        return c.json({ error: '24ч кулдаун ещё активен. Мойка не подтверждена.' }, 429);
      }
    }

    // ── Impossible Travel Check ──────────────────────────────────────────────
    const lastLocation = await kv.get(`wash_location:${payload.uid}`);
    let fraudFlag = false;
    if (lastLocation && lat && lng && lastLocation.lat && lastLocation.lng && lastLocation.at) {
      const haversine = (lat1: number, lon1: number, lat2: number, lon2: number) => {
        const R = 6371;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) ** 2 +
          Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      };
      const distKm = haversine(lastLocation.lat, lastLocation.lng, lat, lng);
      const timeDiffMin = (Date.now() - lastLocation.at) / 60000;
      const speedKmh = distKm / (timeDiffMin / 60);
      if (distKm > 5 && timeDiffMin < 30 && speedKmh > 200) {
        fraudFlag = true;
        console.log(`⚠️ Impossible Travel: user ${payload.uid} ${distKm.toFixed(1)}km in ${timeDiffMin.toFixed(0)}min`);
        await kv.set(`fraud:${payload.uid}:${Date.now()}`, {
          userId: payload.uid, distKm, timeDiffMin, speedKmh,
          from: { lat: lastLocation.lat, lng: lastLocation.lng },
          to: { lat, lng }, at: new Date().toISOString(),
        });
      }
    }
    if (lat && lng) {
      await kv.set(`wash_location:${payload.uid}`, { lat, lng, at: Date.now() });
    }

    const washId = crypto.randomUUID();
    const now = Date.now();
    const pid = partnerId || user.id;

    const wash = {
      id: washId,
      userId: payload.uid,
      carPlate: payload.cp,
      subscriptionId: payload.sid,
      tier: payload.tier,
      partnerId: pid,
      partnerName: partnerName || 'Автомойка',
      confirmedBy: user.id,
      lat: lat || null,
      lng: lng || null,
      fraudFlag,
      createdAt: new Date(now).toISOString(),
    };

    await kv.set(`wash:${payload.uid}:${washId}`, wash);
    await kv.set(`partner:${pid}:wash:${washId}`, wash);
    await kv.set(`cooldown:${payload.uid}`, { lastWashAt: now });

    const currentPoints = await kv.get(`loyalty:${payload.uid}:points`);
    const newPoints = (currentPoints || 0) + 10;
    await kv.set(`loyalty:${payload.uid}:points`, newPoints);

    const historyEntry = {
      id: crypto.randomUUID(),
      points: 10,
      reason: `Мойка у ${partnerName || 'Автомойка'}`,
      type: 'earned',
      createdAt: new Date().toISOString(),
    };
    await kv.set(`loyalty:${payload.uid}:history:${historyEntry.id}`, historyEntry);

    let tier = 'bronze';
    if (newPoints >= 10000) tier = 'platinum';
    else if (newPoints >= 5000) tier = 'gold';
    else if (newPoints >= 2000) tier = 'silver';
    await kv.set(`loyalty:${payload.uid}:tier`, tier);

    const commissions: Record<string, number> = { personal: 25000, business: 35000 };
    const commission = commissions[payload.tier] || 25000;
    const partnerBalance = await kv.get(`partner:${pid}:balance`);
    const newBalance = (partnerBalance || 0) + commission;
    await kv.set(`partner:${pid}:balance`, newBalance);

    return c.json({ success: true, wash, commission, pointsEarned: 10 });
  } catch (error) {
    console.log('Confirm wash error:', error);
    return c.json({ error: `Ошибка подтверждения мойки: ${error}` }, 500);
  }
});

// ─────────────────────────────────────────
// PAYMENT (SANDBOX)
// ─────────────────────────────────────────

app.post('/make-server-80c25f01/payment/initiate', async (c) => {
  try {
    const user = await verifyUser(c);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const { tier, carPlate, provider } = await c.req.json();

    if (!['personal', 'business'].includes(tier)) {
      return c.json({ error: 'Неверный тариф' }, 400);
    }
    if (!carPlate) {
      return c.json({ error: 'Госномер обязателен' }, 400);
    }

    const prices: Record<string, number> = { personal: 990_000, business: 1_800_000 };
    const amount = prices[tier];
    const paymentId = crypto.randomUUID();

    // Сохраняем phone — нужен для SMS при webhook PerformTransaction/action=1
    const phone = user.user_metadata?.phone ?? '';

    const payment = {
      id: paymentId,
      userId: user.id,
      phone,
      tier,
      carPlate: carPlate.toUpperCase(),
      amount,
      provider: provider || 'payme',
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    await kv.set(`payment:${paymentId}`, payment);

    return c.json({ paymentId, amount, currency: 'UZS', provider: payment.provider });
  } catch (error) {
    console.log('Payment initiate error:', error);
    return c.json({ error: `Ошибка инициализации платежа: ${error}` }, 500);
  }
});

app.post('/make-server-80c25f01/payment/confirm', async (c) => {
  try {
    const user = await verifyUser(c);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const { paymentId } = await c.req.json();

    const paymentData = await kv.get(`payment:${paymentId}`);
    if (!paymentData) {
      return c.json({ error: 'Платёж не найден' }, 404);
    }
    if (paymentData.userId !== user.id) {
      return c.json({ error: 'Нет доступа к этому платежу' }, 403);
    }
    if (paymentData.status === 'paid') {
      const sub = await kv.get(`subscription:${user.id}`);
      return c.json({ success: true, subscription: sub, alreadyPaid: true });
    }

    await kv.set(`payment:${paymentId}`, {
      ...paymentData, status: 'paid', paidAt: new Date().toISOString(),
    });

    // ── Стекинг + SMS — единый путь для sandbox и боевого ──────────
    const phone = user.user_metadata?.phone ?? paymentData.phone ?? '';
    const subscription = await autoRenewSubscription(
      user.id,
      paymentData.tier,
      paymentData.carPlate,
      paymentId,
      paymentData.provider || 'sandbox',
      phone,
    );

    console.log(`[payment/confirm] user=${user.id} tier=${paymentData.tier} stacked=${(subscription as any).stacked}`);
    return c.json({ success: true, subscription });
  } catch (error) {
    console.log('Payment confirm error:', error);
    return c.json({ error: `Ошибка подтверждения платежа: ${error}` }, 500);
  }
});

// ─────────────────────────────────────────
// REVIEWS ROUTES
// ─────────────────────────────────────────

app.get('/make-server-80c25f01/reviews/:locationId', async (c) => {
  try {
    const locationId = c.req.param('locationId');
    const reviews = await kv.getByPrefix(`review:${locationId}:`);
    return c.json({ reviews });
  } catch (error) {
    console.log('Get reviews error:', error);
    return c.json({ error: 'Failed to fetch reviews' }, 500);
  }
});

app.post('/make-server-80c25f01/reviews', async (c) => {
  try {
    const user = await verifyUser(c);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const { locationId, rating, comment } = await c.req.json();

    const review = {
      id: crypto.randomUUID(),
      userId: user.id,
      userName: user.user_metadata?.name || 'Anonymous',
      locationId,
      rating,
      comment,
      verified: true,
      helpful: 0,
      createdAt: new Date().toISOString(),
    };

    await kv.set(`review:${locationId}:${review.id}`, review);
    return c.json({ review });
  } catch (error) {
    console.log('Create review error:', error);
    return c.json({ error: 'Failed to create review' }, 500);
  }
});

// ─────────────────────────────────────────
// LOYALTY ROUTES
// ─────────────────────────────────────────

app.get('/make-server-80c25f01/loyalty/points', async (c) => {
  try {
    const user = await verifyUser(c);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const points = await kv.get(`loyalty:${user.id}:points`);
    const tier = await kv.get(`loyalty:${user.id}:tier`);
    const history = await kv.getByPrefix(`loyalty:${user.id}:history:`);

    return c.json({
      points: points || 0,
      tier: tier || 'bronze',
      history,
    });
  } catch (error) {
    console.log('Get loyalty points error:', error);
    return c.json({ error: 'Failed to fetch loyalty points' }, 500);
  }
});

app.post('/make-server-80c25f01/loyalty/earn', async (c) => {
  try {
    const user = await verifyUser(c);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const { points, reason } = await c.req.json();
    const currentPoints = await kv.get(`loyalty:${user.id}:points`);
    const newPoints = (currentPoints || 0) + points;
    await kv.set(`loyalty:${user.id}:points`, newPoints);

    const historyEntry = {
      id: crypto.randomUUID(),
      points, reason, type: 'earned',
      createdAt: new Date().toISOString(),
    };
    await kv.set(`loyalty:${user.id}:history:${historyEntry.id}`, historyEntry);

    let tier = 'bronze';
    if (newPoints >= 10000) tier = 'platinum';
    else if (newPoints >= 5000) tier = 'gold';
    else if (newPoints >= 2000) tier = 'silver';
    await kv.set(`loyalty:${user.id}:tier`, tier);

    return c.json({ points: newPoints, tier });
  } catch (error) {
    console.log('Earn loyalty points error:', error);
    return c.json({ error: 'Failed to earn points' }, 500);
  }
});

app.post('/make-server-80c25f01/loyalty/redeem', async (c) => {
  try {
    const user = await verifyUser(c);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const { points, reward } = await c.req.json();
    const currentPoints = await kv.get(`loyalty:${user.id}:points`);
    if (currentPoints === undefined || currentPoints === null || currentPoints < points) {
      return c.json({ error: 'Insufficient points' }, 400);
    }

    const newPoints = currentPoints - points;
    await kv.set(`loyalty:${user.id}:points`, newPoints);

    const historyEntry = {
      id: crypto.randomUUID(),
      points, reward, type: 'redeemed',
      createdAt: new Date().toISOString(),
    };
    await kv.set(`loyalty:${user.id}:history:${historyEntry.id}`, historyEntry);
    return c.json({ points: newPoints });
  } catch (error) {
    console.log('Redeem loyalty points error:', error);
    return c.json({ error: 'Failed to redeem points' }, 500);
  }
});

// ─────────────────────────────────────────
// WASH HISTORY ROUTES
// ─────────────────────────────────────────

app.get('/make-server-80c25f01/washes', async (c) => {
  try {
    const user = await verifyUser(c);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const washes = await kv.getByPrefix(`wash:${user.id}:`);
    return c.json({ washes });
  } catch (error) {
    console.log('Get washes error:', error);
    return c.json({ error: 'Failed to fetch washes' }, 500);
  }
});

app.post('/make-server-80c25f01/washes', async (c) => {
  try {
    const user = await verifyUser(c);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const { locationId, locationName } = await c.req.json();

    const wash = {
      id: crypto.randomUUID(),
      userId: user.id,
      locationId,
      locationName,
      createdAt: new Date().toISOString(),
    };

    await kv.set(`wash:${user.id}:${wash.id}`, wash);

    const currentPoints = await kv.get(`loyalty:${user.id}:points`);
    const newPoints = (currentPoints || 0) + 10;
    await kv.set(`loyalty:${user.id}:points`, newPoints);

    return c.json({ wash, pointsEarned: 10 });
  } catch (error) {
    console.log('Create wash error:', error);
    return c.json({ error: 'Failed to create wash record' }, 500);
  }
});

// ─────────────────────────────────────────
// PARTNER ROUTES
// ─────────────────────────────────────────

app.get('/make-server-80c25f01/partner/stats', async (c) => {
  try {
    const user = await verifyUser(c);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const partnerId = user.id;

    const washes = await kv.getByPrefix(`partner:${partnerId}:wash:`);

    const today = new Date().toISOString().split('T')[0];
    const todayWashes = washes.filter(w => w?.createdAt?.startsWith(today));

    const balance = await kv.get(`partner:${partnerId}:balance`);

    const calcRevenue = (washList: typeof washes) =>
      washList.reduce((sum, w) => {
        const tier = w?.tier;
        return sum + (tier === 'business' ? 35000 : 25000);
      }, 0);

    const stats = {
      todayWashes: todayWashes.length,
      todayRevenue: calcRevenue(todayWashes),
      monthlyWashes: washes.length,
      monthlyRevenue: calcRevenue(washes),
      activeCustomers: new Set(washes.map(w => w?.userId).filter(Boolean)).size,
      totalWashes: washes.length,
      balance: balance || 0,
      recentWashes: washes
        .sort((a, b) => new Date(b?.createdAt || 0).getTime() - new Date(a?.createdAt || 0).getTime())
        .slice(0, 10),
    };

    return c.json(stats);
  } catch (error) {
    console.log('Get partner stats error:', error);
    return c.json({ error: `Ошибка загрузки статистики: ${error}` }, 500);
  }
});

// ─────────────────────────────────────────
// AUTH ROUTES  (server-side, bypasses email confirmation)
// ─────────────────────────────────────────

app.post('/make-server-80c25f01/auth/register', async (c) => {
  try {
    const { phone, password, name, carNumber } = await c.req.json();

    if (!phone || !password || !name) {
      return c.json({ error: 'phone, password и name обязательны' }, 400);
    }

    const cleanPhone = phone.replace(/\D/g, '');
    if (!cleanPhone.startsWith('998') || cleanPhone.length !== 12) {
      return c.json({ error: 'Неверный формат номера (+998 XX XXX XX XX)' }, 400);
    }
    if (password.length < 6) {
      return c.json({ error: 'Пароль минимум 6 символов' }, 400);
    }

    const otpVerified = await kv.get(`otp_verified:${cleanPhone}`);
    if (!otpVerified) {
      return c.json({
        error: 'SMS-код не подтверждён. Пройдите верификацию номера.',
        code: 'OTP_NOT_VERIFIED',
      }, 403);
    }

    const email = `${cleanPhone}@drivepass.uz`;

    const { data: createData, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        name: name.trim(),
        phone: cleanPhone,
        car_number: carNumber || '',
      },
    });

    if (createError) {
      if (
        createError.message?.toLowerCase().includes('already') ||
        (createError as any).status === 422
      ) {
        return c.json({
          error: 'Этот номер уже зарегистрирован. Войдите в систему.',
          code: 'ALREADY_EXISTS',
        }, 409);
      }
      console.error('Admin createUser error:', createError);
      return c.json({ error: createError.message }, 400);
    }

    const userId = createData.user.id;

    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email,
    });

    if (linkError || !linkData?.properties?.hashed_token) {
      console.error('generateLink error:', linkError);
      return c.json({
        user: createData.user,
        created: true,
        loginToken: null,
        email,
        warning: 'Токен входа не получен. Войдите вручную.',
      });
    }

    console.log('generateLink OK → hashed_token available');

    const { error: profileError } = await supabase.from('users').upsert({
      id: userId,
      name: name.trim(),
      phone: cleanPhone,
      car_number: carNumber || '',
      subscription_tier: 'none',
      created_at: new Date().toISOString(),
    });
    if (profileError) {
      console.log('Profile upsert (non-fatal):', profileError.message);
    }

    await kv.del(`otp_verified:${cleanPhone}`);

    return c.json({
      user: createData.user,
      created: true,
      loginToken: linkData.properties.hashed_token,
      email,
    });
  } catch (error) {
    console.error('Auth register error:', error);
    return c.json({ error: `Ошибка регистрации: ${error}` }, 500);
  }
});

// ─────────────────────────────────────────
// PAYMENT WEBHOOKS  (Payme + Click)
// ─────────────────────────────────────────

app.post('/make-server-80c25f01/payment/payme-webhook', async (c) => {
  try {
    const merchantId = Deno.env.get('PAYME_MERCHANT_ID') ?? '';
    const paymeKey   = Deno.env.get('PAYME_KEY') ?? '';

    const authHeader = c.req.header('Authorization') ?? '';
    if (merchantId && paymeKey) {
      const expected = `Basic ${btoa(`${merchantId}:${paymeKey}`)}`;
      if (authHeader !== expected) {
        return c.json({
          error: { code: -32504, message: { ru: 'Неверные данные авторизации' } },
        }, 401);
      }
    }

    const body = await c.req.json();
    const { method, params, id: rpcId } = body;

    const rpcOk  = (result: object) => c.json({ jsonrpc: '2.0', id: rpcId, result });
    const rpcErr = (code: number, message: string) =>
      c.json({ jsonrpc: '2.0', id: rpcId, error: { code, message: { ru: message } } });

    if (method === 'CheckPerformTransaction') {
      const paymentId = params?.account?.payment_id;
      const paymentData = await kv.get(`payment:${paymentId}`);
      if (!paymentData) return rpcErr(-31050, 'Заказ не найден');
      if (paymentData.status !== 'pending') return rpcErr(-31050, 'Заказ уже обработан');
      return rpcOk({ allow: true });
    }

    if (method === 'CreateTransaction') {
      const { id: txId, account, amount } = params;
      const paymentId = account?.payment_id;

      const paymentData = await kv.get(`payment:${paymentId}`);
      if (!paymentData) return rpcErr(-31050, 'Заказ не найден');

      const existingTx = await kv.get(`payme_tx:${txId}`);
      if (existingTx) {
        return rpcOk({
          create_time: existingTx.createTime,
          transaction: txId,
          state: 1,
        });
      }

      const createTime = Date.now();
      await kv.set(`payme_tx:${txId}`, {
        txId, paymentId, amount, createTime, state: 1,
      });
      await kv.set(`payment:${paymentId}`, {
        ...paymentData, providerTxId: txId, status: 'processing',
      });

      return rpcOk({ create_time: createTime, transaction: txId, state: 1 });
    }

    if (method === 'PerformTransaction') {
      const { id: txId } = params;
      const tx = await kv.get(`payme_tx:${txId}`);
      if (!tx) return rpcErr(-31003, 'Транзакция не найдена');
      if (tx.state === 2) {
        return rpcOk({ transaction: txId, perform_time: tx.performTime, state: 2 });
      }

      const paymentData = await kv.get(`payment:${tx.paymentId}`);
      if (!paymentData) return rpcErr(-31050, 'Заказ не найден');

      const performTime = Date.now();
      await kv.set(`payme_tx:${txId}`, { ...tx, state: 2, performTime });
      await kv.set(`payment:${tx.paymentId}`, {
        ...paymentData, status: 'paid', paidAt: new Date().toISOString(),
      });

      // ── Стекинг + SMS ──────────────────────────────────────────────
      await autoRenewSubscription(
        paymentData.userId, paymentData.tier, paymentData.carPlate,
        tx.paymentId, 'payme', paymentData.phone,
      );
      console.log(`[Payme] PerformTransaction OK: user=${paymentData.userId} tier=${paymentData.tier}`);

      return rpcOk({ transaction: txId, perform_time: performTime, state: 2 });
    }

    if (method === 'CancelTransaction') {
      const { id: txId, reason } = params;
      const tx = await kv.get(`payme_tx:${txId}`);
      if (!tx) return rpcErr(-31003, 'Транзакция не найдена');

      const cancelTime = Date.now();
      const newState = tx.state === 2 ? -2 : -1;
      await kv.set(`payme_tx:${txId}`, { ...tx, state: newState, cancelTime, reason });

      const paymentData = await kv.get(`payment:${tx.paymentId}`);
      if (paymentData) {
        await kv.set(`payment:${tx.paymentId}`, { ...paymentData, status: 'cancelled' });
      }

      return rpcOk({ transaction: txId, cancel_time: cancelTime, state: newState });
    }

    if (method === 'CheckTransaction') {
      const { id: txId } = params;
      const tx = await kv.get(`payme_tx:${txId}`);
      if (!tx) return rpcErr(-31003, 'Транзакция не найдена');
      return rpcOk({
        create_time: tx.createTime,
        perform_time: tx.performTime ?? 0,
        cancel_time: tx.cancelTime ?? 0,
        transaction: txId,
        state: tx.state,
        reason: tx.reason ?? null,
      });
    }

    return rpcErr(-32601, `Метод ${method} не поддерживается`);
  } catch (error) {
    console.error('Payme webhook error:', error);
    return c.json({ error: { code: -32400, message: { ru: `Ошибка сервера: ${error}` } } }, 500);
  }
});

app.post('/make-server-80c25f01/payment/click-webhook', async (c) => {
  try {
    const serviceId = Deno.env.get('CLICK_SERVICE_ID') ?? '';
    const secretKey = Deno.env.get('CLICK_SECRET_KEY') ?? '';

    const form = await c.req.formData().catch(() => null);
    let body: Record<string, string> = {};

    if (form) {
      form.forEach((val, key) => { body[key] = String(val); });
    } else {
      body = await c.req.json().catch(() => ({}));
    }

    const {
      click_trans_id, service_id,
      merchant_trans_id: paymentId,
      amount, action, sign_time, sign_string,
      error: clickError,
    } = body;

    if (serviceId && secretKey) {
      const md5 = async (str: string) => {
        const buf = await crypto.subtle.digest(
          'MD5',
          new TextEncoder().encode(str),
        ).catch(() => null);
        if (!buf) return '';
        return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
      };

      const signBase = `${click_trans_id}${service_id}${secretKey}${paymentId}${amount}${action}${sign_time}`;
      const expectedSign = await md5(signBase);

      if (expectedSign && sign_string && sign_string !== expectedSign) {
        return c.json({ error: -1, error_note: 'SIGN CHECK FAILED!' });
      }
    }

    const paymentData = await kv.get(`payment:${paymentId}`);
    if (!paymentData) {
      return c.json({ error: -5, error_note: 'User does not exist' });
    }

    if (action === '0' || action === 0) {
      if (paymentData.status !== 'pending') {
        return c.json({ error: -4, error_note: 'Already paid' });
      }
      await kv.set(`payment:${paymentId}`, {
        ...paymentData,
        clickTransId: click_trans_id,
        status: 'processing',
      });
      return c.json({
        click_trans_id,
        merchant_trans_id: paymentId,
        merchant_prepare_id: paymentId,
        error: 0,
        error_note: 'Success',
      });
    }

    if (action === '1' || action === 1) {
      if (parseInt(clickError ?? '0') < 0) {
        await kv.set(`payment:${paymentId}`, { ...paymentData, status: 'cancelled' });
        return c.json({ error: 0, error_note: 'Cancelled' });
      }

      if (paymentData.status === 'paid') {
        return c.json({ error: -4, error_note: 'Already paid' });
      }

      await kv.set(`payment:${paymentId}`, {
        ...paymentData, status: 'paid', paidAt: new Date().toISOString(),
      });

      // ── Стекинг + SMS ──────────────────────────────────────────────
      await autoRenewSubscription(
        paymentData.userId, paymentData.tier, paymentData.carPlate,
        paymentId, 'click', paymentData.phone,
      );
      console.log(`[Click] action=1 OK: user=${paymentData.userId} tier=${paymentData.tier}`);

      return c.json({
        click_trans_id,
        merchant_trans_id:   paymentId,
        merchant_confirm_id: paymentId,
        error:      0,
        error_note: 'Success',
      });
    }

    return c.json({ error: -3, error_note: 'Action not found' });
  } catch (error) {
    console.error('Click webhook error:', error);
    return c.json({ error: -9, error_note: `Server error: ${error}` });
  }
});

// ─────────────────────────────────────────
// SUBSCRIPTION NOTIFY-EXPIRING
// POST /subscription/notify-expiring
// Защищён x-cron-secret. Вызывается pg_cron каждый день в 09:00 UTC.
// Находит подписки, истекающие через days_ahead дней, отправляет SMS.
// ─────────────────────────────────────────

app.post('/make-server-80c25f01/subscription/notify-expiring', async (c) => {
  try {
    const cronSecret = Deno.env.get('CRON_SECRET') ?? '';
    const incoming   = c.req.header('x-cron-secret') ?? '';

    // Если CRON_SECRET задан — проверяем. Если нет — разрешаем (development).
    if (cronSecret && incoming !== cronSecret) {
      console.log('[notify-expiring] Unauthorized: wrong cron secret');
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const body = await c.req.json().catch(() => ({}));
    const days_ahead = Number(body.days_ahead ?? 3);
    const windowMs   = days_ahead * 24 * 60 * 60 * 1000;
    const now        = Date.now();
    const horizon    = now + windowMs;

    // Сканируем все активные подписки
    const allSubs = await kv.getByPrefix('subscription:');
    let notified = 0;
    let skipped  = 0;

    for (const sub of (allSubs ?? [])) {
      if (!sub || sub.status !== 'active') { skipped++; continue; }

      const expiresMs = new Date(sub.expiresAt).getTime();
      // Только те, что в окне [сейчас .. сейчас + days_ahead дней]
      if (expiresMs < now || expiresMs > horizon) { skipped++; continue; }

      // Дедупликация: одно SMS в сутки на подписку
      const sentKey    = `notify_sent:${sub.userId}:${sub.id}`;
      const alreadySent = await kv.get(sentKey);
      if (alreadySent) { skipped++; continue; }

      // Получаем телефон из auth.admin
      const { data: authUser } = await supabase.auth.admin.getUserById(sub.userId);
      const phone = authUser?.user?.user_metadata?.phone;
      if (!phone) {
        console.log(`[notify-expiring] No phone for userId=${sub.userId}`);
        skipped++;
        continue;
      }

      const daysLeft  = Math.ceil((expiresMs - now) / 86_400_000);
      const expiryStr = new Date(sub.expiresAt).toLocaleDateString('ru-RU', {
        day: 'numeric', month: 'long',
      });
      const tierLabel = sub.tier === 'business' ? 'Business' : 'Personal';
      const prices: Record<string, number> = { personal: 220_000, business: 450_000 };
      const price = prices[sub.tier] ?? 220_000;

      const msg =
        `DrivePass+: подписка ${tierLabel} истекает ${expiryStr} (через ${daysLeft} дн.). ` +
        `Продлите за ${price.toLocaleString('ru-RU')} сум в приложении drivepass.uz`;

      const sent = await sendEskizSMS(phone, msg);
      console.log(`[notify-expiring] userId=${sub.userId} phone=${phone} sent=${sent} daysLeft=${daysLeft}`);

      if (sent) {
        // TTL 25 часов — чтобы завтра снова работало
        await kv.set(sentKey, { sentAt: new Date().toISOString(), daysLeft });
        notified++;
      } else {
        skipped++;
      }
    }

    return c.json({
      ok:        true,
      notified,
      skipped,
      days_ahead,
      scannedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[notify-expiring] error:', error);
    return c.json({ error: `Ошибка notify-expiring: ${error}` }, 500);
  }
});

// ─────────────────────────────────────────
// OCCUPANCY (Real-time car wash load)
// ─────────────────────────────────────────

app.get('/make-server-80c25f01/occupancy', async (c) => {
  try {
    const hour = new Date().getHours();
    const isPeak = (hour >= 8 && hour <= 10) || (hour >= 17 && hour <= 20);
    const base = isPeak ? 65 : 30;
    const ids = ['cw-001', 'cw-002', 'cw-003', 'cw-004', 'cw-005'];
    const result: Record<string, { percent: number; queueMin: number; status: string }> = {};
    ids.forEach((id, i) => {
      const pct = Math.min(95, base + ((hour * 7 + i * 13 + 17) % 35));
      result[id] = {
        percent: pct,
        queueMin: Math.floor(pct / 20) * 5,
        status: pct < 40 ? 'free' : pct < 70 ? 'moderate' : 'busy',
      };
    });
    return c.json({ occupancy: result, updatedAt: new Date().toISOString() });
  } catch (error) {
    return c.json({ error: `Ошибка: ${error}` }, 500);
  }
});

// ─────────────────────────────────────────
// BOOKINGS
// ─────────────────────────────────────────

app.post('/make-server-80c25f01/bookings', async (c) => {
  try {
    const user = await verifyUser(c);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);
    const { locationId, locationName, serviceType, scheduledAt, notes } = await c.req.json();
    if (!locationId || !scheduledAt) return c.json({ error: 'locationId и scheduledAt обязательны' }, 400);
    const booking = {
      id: crypto.randomUUID(),
      userId: user.id,
      locationId,
      locationName: locationName || 'Автомойка',
      serviceType: serviceType || 'Стандарт',
      scheduledAt,
      notes: notes || '',
      status: 'confirmed',
      createdAt: new Date().toISOString(),
    };
    await kv.set(`booking:${user.id}:${booking.id}`, booking);
    return c.json({ booking });
  } catch (error) {
    return c.json({ error: `Ошибка создания брони: ${error}` }, 500);
  }
});

app.get('/make-server-80c25f01/bookings', async (c) => {
  try {
    const user = await verifyUser(c);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);
    const bookings = await kv.getByPrefix(`booking:${user.id}:`);
    return c.json({
      bookings: (bookings || []).sort((a: any, b: any) =>
        new Date(b?.createdAt || 0).getTime() - new Date(a?.createdAt || 0).getTime()
      ),
    });
  } catch (error) {
    return c.json({ error: `Ошибка загрузки броней: ${error}` }, 500);
  }
});

app.delete('/make-server-80c25f01/bookings/:id', async (c) => {
  try {
    const user = await verifyUser(c);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);
    const bookingId = c.req.param('id');
    const booking = await kv.get(`booking:${user.id}:${bookingId}`);
    if (!booking) return c.json({ error: 'Бронь не найдена' }, 404);
    await kv.set(`booking:${user.id}:${bookingId}`, { ...booking, status: 'cancelled' });
    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: `Ошибка отмены: ${error}` }, 500);
  }
});

// ─────────────────────────────────────────
// CERTIFICATE & FRUGALITY INDEX
// ─────────────────────────────────────────

app.get('/make-server-80c25f01/certificate', async (c) => {
  try {
    const user = await verifyUser(c);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const washes = await kv.getByPrefix(`wash:${user.id}:`);
    const points = await kv.get(`loyalty:${user.id}:points`);
    const tier = await kv.get(`loyalty:${user.id}:tier`);
    const sub = await kv.get(`subscription:${user.id}`);

    const totalWashes = (washes || []).length;
    const sorted = (washes || []).sort((a: any, b: any) =>
      new Date(a?.createdAt || 0).getTime() - new Date(b?.createdAt || 0).getTime()
    );

    const firstDate = sorted[0]?.createdAt ? new Date(sorted[0].createdAt) : new Date();
    const daysSince = Math.max(1, (Date.now() - firstDate.getTime()) / 86400000);
    const expected = Math.max(1, Math.floor(daysSince / 7) * 2);
    const consistency = Math.min(100, Math.round((totalWashes / expected) * 100));

    const weeklyMap: Record<string, number> = {};
    (washes || []).forEach((w: any) => {
      if (!w?.createdAt) return;
      const d = new Date(w.createdAt);
      d.setDate(d.getDate() - d.getDay());
      const key = d.toISOString().split('T')[0];
      weeklyMap[key] = (weeklyMap[key] || 0) + 1;
    });

    const score = Math.min(100, Math.round(
      Math.min(40, totalWashes * 3) +
      consistency * 0.3 +
      Math.min(20, (points || 0) / 50) +
      (sub?.status === 'active' ? 10 : 0)
    ));

    return c.json({
      certificate: {
        userId: user.id,
        userName: user.user_metadata?.name || 'DrivePass+ User',
        carPlate: sub?.carPlate || user.user_metadata?.car_number || '',
        totalWashes,
        frugalityScore: score,
        consistencyScore: consistency,
        loyaltyPoints: points || 0,
        loyaltyTier: tier || 'bronze',
        subscriptionTier: sub?.tier || 'none',
        memberSince: user.created_at,
        lastWash: sorted[sorted.length - 1]?.createdAt || null,
        weeklyHeatmap: weeklyMap,
        generatedAt: new Date().toISOString(),
        certId: `DP-${user.id.slice(0, 8).toUpperCase()}`,
      },
    });
  } catch (error) {
    return c.json({ error: `Ошибка сертификата: ${error}` }, 500);
  }
});

// ─────────────────────────────────────────
// LOYALTY: Spend points on wash upgrades
// ─────────────────────────────────────────

app.post('/make-server-80c25f01/loyalty/spend-wash', async (c) => {
  try {
    const user = await verifyUser(c);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);
    const { upgradeType } = await c.req.json();
    const costs: Record<string, number> = {
      express_wash: 200, premium_wash: 500, detailing: 1500, ceramic: 2000,
    };
    const cost = costs[upgradeType];
    if (!cost) return c.json({ error: 'Неверный тип апгрейда' }, 400);
    const current = (await kv.get(`loyalty:${user.id}:points`)) || 0;
    if (current < cost) return c.json({ error: `Недостаточно баллов. Нужно ${cost}, есть ${current}` }, 400);
    const newPts = current - cost;
    await kv.set(`loyalty:${user.id}:points`, newPts);
    const voucherId = crypto.randomUUID();
    const voucher = {
      id: voucherId, userId: user.id, type: upgradeType, pointsSpent: cost,
      status: 'active', expiresAt: new Date(Date.now() + 30 * 86400000).toISOString(),
      createdAt: new Date().toISOString(),
    };
    await kv.set(`voucher:${user.id}:${voucherId}`, voucher);
    await kv.set(`loyalty:${user.id}:history:${crypto.randomUUID()}`, {
      id: crypto.randomUUID(), points: -cost, reason: `Куплен ${upgradeType}`, type: 'redeemed', createdAt: new Date().toISOString(),
    });
    return c.json({ success: true, newPoints: newPts, voucher });
  } catch (error) {
    return c.json({ error: `Ошибка: ${error}` }, 500);
  }
});

app.get('/make-server-80c25f01/loyalty/vouchers', async (c) => {
  try {
    const user = await verifyUser(c);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);
    const all = await kv.getByPrefix(`voucher:${user.id}:`);
    const active = (all || []).filter((v: any) => v?.status === 'active' && new Date(v.expiresAt) > new Date());
    return c.json({ vouchers: active });
  } catch (error) {
    return c.json({ error: `Ошибка: ${error}` }, 500);
  }
});

// ─────────────────────────────────────────
// MARKETPLACE
// ─────────────────────────────────────────

app.get('/make-server-80c25f01/marketplace', (c) => {
  return c.json({
    products: [
      { id: 'p1', category: 'detailing', name: 'Полировка кузова', price: 120000, duration: '2 ч', rating: 4.9 },
      { id: 'p2', category: 'tire', name: 'Шиномонтаж', price: 80000, duration: '45 мин', rating: 4.7 },
      { id: 'p3', category: 'oil', name: 'Замена масла', price: 150000, duration: '30 мин', rating: 4.8 },
      { id: 'p4', category: 'detailing', name: 'Химчистка салона', price: 200000, duration: '3 ч', rating: 4.6 },
      { id: 'p5', category: 'coating', name: 'Ceramic PRO', price: 800000, duration: '8 ч', rating: 5.0 },
      { id: 'p6', category: 'insurance', name: 'ОСАГО Gross', price: 350000, duration: '1 год', rating: 4.5 },
    ],
  });
});

// ─────────────────────────────────────────
// PAYMENT: Real Payme/Click redirect URL
// ─────────────────────────────────────────

app.post('/make-server-80c25f01/payment/redirect-url', async (c) => {
  try {
    const user = await verifyUser(c);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);
    const { paymentId, provider } = await c.req.json();
    const paymentData = await kv.get(`payment:${paymentId}`);
    if (!paymentData) return c.json({ error: 'Платёж не найден' }, 404);

    const paymeId = Deno.env.get('PAYME_MERCHANT_ID') || '';
    const clickServiceId = Deno.env.get('CLICK_SERVICE_ID') || '';
    const clickMerchantId = Deno.env.get('CLICK_MERCHANT_ID') || '';

    let redirectUrl = '';
    if (provider === 'payme' && paymeId) {
      const params = `m=${paymeId};ac.payment_id=${paymentId};a=${paymentData.amount * 100}`;
      redirectUrl = `https://checkout.paycom.uz/${btoa(params)}`;
    } else if (provider === 'click' && clickServiceId) {
      redirectUrl = `https://my.click.uz/services/pay?service_id=${clickServiceId}&merchant_id=${clickMerchantId}&amount=${paymentData.amount}&transaction_param=${paymentId}`;
    }

    return c.json({ redirectUrl, hasMerchant: !!(paymeId || clickServiceId) });
  } catch (error) {
    return c.json({ error: `Ошибка: ${error}` }, 500);
  }
});

Deno.serve(app.fetch);
