-- ═══════════════════════════════════════════════════════════════════════════
-- DrivePass+ — Production Database Schema v2
-- Samarkand, Uzbekistan | PostgreSQL 15 + Supabase RLS
-- ═══════════════════════════════════════════════════════════════════════════
--
-- EXECUTION ORDER:
--   1. Run entire file in Supabase SQL Editor
--   2. Set Secrets: ESKIZ_EMAIL, ESKIZ_PASSWORD in Supabase Dashboard → Settings → Edge Functions
--   3. Enable RLS on all tables (already done here via ALTER TABLE ... ENABLE ROW LEVEL SECURITY)
--
-- ARCHITECTURE NOTES:
--   • Auth: phone number → synthetic email (phone@drivepass.uz) via Supabase Auth
--   • OTP: 6-digit code via Eskiz.uz SMS API (2-min TTL, 3 attempts max)
--   • QR:  HMAC-SHA256 signed token, 5-min TTL, single-use cooldown
--   • Payment: Payme / Click webhooks → activate subscription
--   • Geosearch: PostGIS-ready (lat/lng stored as DECIMAL; upgrade to GEOGRAPHY later)
-- ═══════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────
-- EXTENSIONS
-- ─────────────────────────────────────────────────────────────────────────
-- Uncomment if you want native geo-indexing (recommended for production):
-- CREATE EXTENSION IF NOT EXISTS postgis;

-- ─────────────────────────────────────────────────────────────────────────
-- TABLE: users
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.users (
  id                    UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name                  TEXT NOT NULL,
  phone                 TEXT UNIQUE NOT NULL,           -- clean: '998901234567'
  formatted_phone       TEXT,                           -- display: '+998 (90) 123 45 67'
  car_number            TEXT NOT NULL,                  -- UZ plate: '30 A 777 AA'
  subscription_tier     TEXT DEFAULT 'none'
                          CHECK (subscription_tier IN ('none', 'personal', 'business')),
  subscription_start_date TIMESTAMP WITH TIME ZONE,
  subscription_end_date   TIMESTAMP WITH TIME ZONE,
  is_active             BOOLEAN DEFAULT true,
  is_partner            BOOLEAN DEFAULT false,          -- can access PartnerDashboard
  partner_car_wash_id   UUID,                           -- FK to car_washes (set after onboarding)
  loyalty_points        INTEGER DEFAULT 0,
  loyalty_tier          TEXT DEFAULT 'bronze'
                          CHECK (loyalty_tier IN ('bronze', 'silver', 'gold', 'platinum')),
  created_at            TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at            TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE public.users IS
  'User profiles. Linked to auth.users via phone-as-email trick (+998XXXXXXXXX@drivepass.uz).';

-- ─────────────────────────────────────────────────────────────────────────
-- TABLE: car_washes  (partner locations)
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.car_washes (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name              TEXT NOT NULL,
  address           TEXT NOT NULL,
  city              TEXT DEFAULT 'Самарканд',
  district          TEXT,
  latitude          DECIMAL(10, 8) NOT NULL,    -- WGS-84
  longitude         DECIMAL(11, 8) NOT NULL,
  phone             TEXT,
  working_hours     JSONB DEFAULT '{"mon-fri":"08:00-22:00","sat-sun":"09:00-21:00"}',
  services          TEXT[] DEFAULT ARRAY['Экспресс','Стандарт'],
  has_green_corridor BOOLEAN DEFAULT false,      -- dedicated lane for DrivePass+ clients
  is_active         BOOLEAN DEFAULT true,
  is_drivepass_partner BOOLEAN DEFAULT true,
  rating            DECIMAL(2,1) DEFAULT 4.5 CHECK (rating BETWEEN 1.0 AND 5.0),
  total_reviews     INTEGER DEFAULT 0,
  owner_user_id     UUID REFERENCES public.users(id),  -- partner owner (nullable until linked)
  commission_personal  INTEGER DEFAULT 25000,   -- UZS per wash
  commission_business  INTEGER DEFAULT 35000,
  created_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE public.car_washes IS
  'Partner car wash locations. Coordinates stored as DECIMAL for simplicity; '
  'upgrade to PostGIS GEOGRAPHY(POINT,4326) for nearest-neighbour queries at scale.';

-- ─────────────────────────────────────────────────────────────────────────
-- TABLE: subscriptions
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  tier                    TEXT NOT NULL CHECK (tier IN ('personal', 'business')),
  car_plate               TEXT NOT NULL,
  price_paid              INTEGER NOT NULL,              -- UZS
  start_date              TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date                TIMESTAMP WITH TIME ZONE NOT NULL,
  status                  TEXT DEFAULT 'active'
                            CHECK (status IN ('active', 'expired', 'cancelled', 'pending')),
  payment_method          TEXT CHECK (payment_method IN ('click', 'payme', 'uzcard', 'humo', 'cash', 'sandbox')),
  payment_transaction_id  TEXT UNIQUE,                  -- idempotency key from gateway
  auto_renew              BOOLEAN DEFAULT false,
  created_at              TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE public.subscriptions IS
  'Subscription records. payment_transaction_id UNIQUE prevents duplicate payment processing.';

-- ─────────────────────────────────────────────────────────────────────────
-- TABLE: wash_history
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.wash_history (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  car_wash_id           UUID REFERENCES public.car_washes(id),
  car_wash_name         TEXT,
  car_plate             TEXT NOT NULL,
  subscription_id       UUID REFERENCES public.subscriptions(id),
  tier                  TEXT NOT NULL CHECK (tier IN ('personal', 'business')),
  washed_at             TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  next_available_wash   TIMESTAMP WITH TIME ZONE NOT NULL,  -- washed_at + 24h
  qr_token_hash         TEXT,                               -- SHA-256 of used QR token (for audit)
  confirmed_by_user_id  UUID REFERENCES auth.users(id),    -- partner user who scanned
  partner_commission    INTEGER,                            -- UZS paid to partner
  points_earned         INTEGER DEFAULT 10,
  created_at            TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE public.wash_history IS
  'Immutable wash log. next_available_wash enforces 24h cooldown at DB level.';

-- ─────────────────────────────────────────────────────────────────────────
-- TABLE: payments  (audit log for Payme / Click webhooks)
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.payments (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES public.users(id),
  subscription_id   UUID REFERENCES public.subscriptions(id),
  provider          TEXT NOT NULL CHECK (provider IN ('payme', 'click', 'uzcard', 'humo', 'sandbox')),
  amount            INTEGER NOT NULL,                -- UZS (in tiyin for Payme: amount * 100)
  currency          TEXT DEFAULT 'UZS',
  status            TEXT DEFAULT 'pending'
                      CHECK (status IN ('pending', 'paid', 'failed', 'refunded', 'cancelled')),
  provider_txn_id   TEXT UNIQUE,                    -- transaction ID from payment gateway
  provider_payload  JSONB,                          -- raw webhook body for audit
  idempotency_key   TEXT UNIQUE,                    -- prevent double-processing
  paid_at           TIMESTAMP WITH TIME ZONE,
  created_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE public.payments IS
  'Payment audit log. idempotency_key + provider_txn_id UNIQUE prevents duplicate charges.';

-- ─────────────────────────────────────────────────────────────────────────
-- TABLE: loyalty_history
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.loyalty_history (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  points      INTEGER NOT NULL,
  type        TEXT NOT NULL CHECK (type IN ('earned', 'redeemed', 'expired', 'bonus')),
  reason      TEXT,
  wash_id     UUID REFERENCES public.wash_history(id),
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────
-- INDEXES  (performance-critical paths)
-- ─────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_users_phone                ON public.users(phone);
CREATE INDEX IF NOT EXISTS idx_users_car_number           ON public.users(car_number);
CREATE INDEX IF NOT EXISTS idx_users_is_partner           ON public.users(is_partner) WHERE is_partner = true;

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id      ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status       ON public.subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_end_date     ON public.subscriptions(end_date);

CREATE INDEX IF NOT EXISTS idx_wash_history_user_id       ON public.wash_history(user_id);
CREATE INDEX IF NOT EXISTS idx_wash_history_washed_at     ON public.wash_history(washed_at DESC);
CREATE INDEX IF NOT EXISTS idx_wash_history_next_avail    ON public.wash_history(next_available_wash);
CREATE INDEX IF NOT EXISTS idx_wash_history_car_wash      ON public.wash_history(car_wash_id);

CREATE INDEX IF NOT EXISTS idx_payments_user_id           ON public.payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_status            ON public.payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_provider_txn      ON public.payments(provider_txn_id);

-- Geospatial index (simple B-tree on lat/lng for now; switch to PostGIS later)
CREATE INDEX IF NOT EXISTS idx_car_washes_location        ON public.car_washes(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_car_washes_active          ON public.car_washes(is_active) WHERE is_active = true;

-- ─────────────────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ───────��─────────────────────────────────────────────────────────────────

-- users ──────────────────────────────────────────────────────────────────
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users: read own profile"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "users: update own profile"
  ON public.users FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Service role bypasses RLS (used in Edge Functions)
-- No policy needed — Supabase service role key has full access.

-- car_washes (public read; only owner/service-role can write) ────────────
ALTER TABLE public.car_washes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "car_washes: public read"
  ON public.car_washes FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "car_washes: partner owner can update own"
  ON public.car_washes FOR UPDATE
  USING (auth.uid() = owner_user_id)
  WITH CHECK (auth.uid() = owner_user_id);

-- subscriptions ──────────────────────────────────────────────────────────
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "subscriptions: read own"
  ON public.subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- INSERT / UPDATE done via service-role in Edge Functions only.
-- Direct client writes blocked by missing INSERT policy.

-- wash_history ───────────────────────────────────────────────────────────
ALTER TABLE public.wash_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wash_history: client reads own washes"
  ON public.wash_history FOR SELECT
  USING (auth.uid() = user_id);

-- ⚠️ KEY ISOLATION: partner sees ONLY washes confirmed at their car wash
-- This prevents partner A from seeing partner B's data via REST API
CREATE POLICY "wash_history: partner reads own car_wash washes"
  ON public.wash_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.car_washes cw
      WHERE cw.id = wash_history.car_wash_id
        AND cw.owner_user_id = auth.uid()
    )
  );

-- Inserts are done server-side via Edge Function (service role). No client INSERT.

-- payments ───────────────────────────────────────────────────────────────
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "payments: read own"
  ON public.payments FOR SELECT
  USING (auth.uid() = user_id);

-- loyalty_history ────────────────────────────────────────────────────────
ALTER TABLE public.loyalty_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "loyalty_history: read own"
  ON public.loyalty_history FOR SELECT
  USING (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────
-- FUNCTIONS
-- ─────────────────────────────────────────────────────────────────────────

-- Trigger: auto-update updated_at
CREATE OR REPLACE FUNCTION public.fn_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

CREATE TRIGGER trg_car_washes_updated_at
  BEFORE UPDATE ON public.car_washes
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

-- 24-hour cooldown check (called from Edge Function as fallback)
CREATE OR REPLACE FUNCTION public.fn_can_wash_now(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_next_available TIMESTAMP WITH TIME ZONE;
BEGIN
  SELECT next_available_wash INTO v_next_available
  FROM public.wash_history
  WHERE user_id = p_user_id
  ORDER BY washed_at DESC
  LIMIT 1;

  IF v_next_available IS NULL THEN RETURN TRUE; END IF;
  RETURN NOW() >= v_next_available;
END;
$$;

COMMENT ON FUNCTION public.fn_can_wash_now IS
  'Returns TRUE if 24h cooldown has passed since last wash. SECURITY DEFINER — runs as owner.';

-- ─────────────────────────────────────────────────────────────────────────
-- ANTI-FRAUD: check_wash_eligibility
-- Вызывается с фронта через supabase.rpc('check_wash_eligibility')
-- Привязка к госномеру — защита от передачи подписки другому человеку
-- ─────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.check_wash_eligibility(vehicle_plate_input TEXT)
RETURNS JSONB AS $$
DECLARE
    last_wash_timestamp TIMESTAMP WITH TIME ZONE;
    is_eligible         BOOLEAN;
    seconds_remaining   INTEGER;
    washes_this_month   INTEGER;
    wash_limit          INTEGER;
    min_hours_between   INTEGER;
    sub_tier            TEXT;
BEGIN
    -- 1. Определяем тариф подписки по госномеру
    SELECT s.tier INTO sub_tier
    FROM public.subscriptions s
    WHERE s.car_plate = vehicle_plate_input
      AND s.status = 'active'
      AND s.end_date > NOW()
    ORDER BY s.created_at DESC
    LIMIT 1;

    -- Нет активной подписки
    IF sub_tier IS NULL THEN
        RETURN jsonb_build_object(
            'eligible', FALSE,
            'reason', 'no_active_subscription',
            'seconds_remaining', 0,
            'washes_this_month', 0,
            'wash_limit', 0
        );
    END IF;

    -- 2. Определяем лимиты по тарифу
    IF sub_tier = 'business' THEN
        wash_limit := 20;
        min_hours_between := 6;
    ELSE
        wash_limit := 8;
        min_hours_between := 12;
    END IF;

    -- 3. Считаем мойки за текущий календарный месяц
    SELECT COUNT(*) INTO washes_this_month
    FROM public.wash_history
    WHERE car_plate = vehicle_plate_input
      AND washed_at >= date_trunc('month', NOW());

    -- 4. Проверяем лимит моек в месяц
    IF washes_this_month >= wash_limit THEN
        RETURN jsonb_build_object(
            'eligible', FALSE,
            'reason', 'monthly_limit_reached',
            'seconds_remaining', 0,
            'washes_this_month', washes_this_month,
            'wash_limit', wash_limit
        );
    END IF;

    -- 5. Проверяем минимальный интервал между мойками (антифрод)
    SELECT washed_at INTO last_wash_timestamp
    FROM public.wash_history
    WHERE car_plate = vehicle_plate_input
    ORDER BY washed_at DESC
    LIMIT 1;

    IF last_wash_timestamp IS NOT NULL
       AND (NOW() - last_wash_timestamp) < (min_hours_between || ' hours')::INTERVAL THEN
        seconds_remaining := (min_hours_between * 3600) - EXTRACT(EPOCH FROM (NOW() - last_wash_timestamp))::INTEGER;
        RETURN jsonb_build_object(
            'eligible', FALSE,
            'reason', 'cooldown_active',
            'seconds_remaining', seconds_remaining,
            'washes_this_month', washes_this_month,
            'wash_limit', wash_limit
        );
    END IF;

    -- 6. Всё ок — можно мыть
    RETURN jsonb_build_object(
        'eligible', TRUE,
        'reason', 'ok',
        'seconds_remaining', 0,
        'washes_this_month', washes_this_month,
        'wash_limit', wash_limit,
        'washes_remaining', wash_limit - washes_this_month
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.check_wash_eligibility IS
  'Anti-fraud v3: проверяет лимит моек в месяц (8 для Standard, 20 для Business) '
  'и минимальный интервал (12ч / 6ч). Привязка по госномеру. '
  'SECURITY DEFINER — обходит RLS. '
  'Вызов: supabase.rpc(''check_wash_eligibility'', { vehicle_plate_input: plate })';

-- Nearest car washes by Euclidean distance (simple, no PostGIS dependency)
-- For production: replace with ST_DWithin(geog, ST_Point(lng,lat)::geography, radius_m)
CREATE OR REPLACE FUNCTION public.fn_nearest_car_washes(
  p_lat DECIMAL,
  p_lng DECIMAL,
  p_limit INTEGER DEFAULT 10
)
RETURNS SETOF public.car_washes
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT *
  FROM public.car_washes
  WHERE is_active = true
  ORDER BY
    ((latitude - p_lat)^2 + (longitude - p_lng)^2)  -- Euclidean ≈ good for <50 km
  LIMIT p_limit;
$$;

COMMENT ON FUNCTION public.fn_nearest_car_washes IS
  'Returns nearest car washes sorted by simple Euclidean distance. '
  'For production accuracy at scale, upgrade to PostGIS ST_DWithin.';

-- ─────────────────────────────────────────────────────────────────────────
-- SEED DATA — Samarkand car washes
-- ─────────────────────────────────────────────────────────────────────────
INSERT INTO public.car_washes
  (name, address, city, district, latitude, longitude, phone,
   has_green_corridor, is_drivepass_partner, rating, total_reviews, services)
VALUES
  ('AutoShine Premium',
   'ул. Амира Темура, 42, Самарканд',     'Самарканд', 'Центральный район',
   39.6542, 66.9597, '+998 91 234 56 78',
   true,  true, 4.8, 312, ARRAY['Экспресс','Стандарт','Премиум']),

  ('ExpressWash Регистан',
   'ул. Регистан, 15, Самарканд',         'Самарканд', 'Старый город',
   39.6270, 66.9750, '+998 91 345 67 89',
   true,  true, 4.6, 187, ARRAY['Экспресс','Стандарт']),

  ('CleanWave Улугбека',
   'пр. Мирзо Улугбека, 88, Самарканд',  'Самарканд', 'Запад',
   39.6480, 66.9420, '+998 91 456 78 90',
   false, true, 4.7, 245, ARRAY['Стандарт','Детейлинг']),

  ('ProWash Сиябская',
   'ул. Сиябская, 28, Самарканд',        'Самарканд', 'Базар Сиаб',
   39.6330, 66.9640, '+998 91 567 89 01',
   false, true, 4.5, 98,  ARRAY['Экспресс','Стандарт']),

  ('Crystal Auto Ташкентская',
   'ул. Ташкентская, 56, Самарканд',     'Самарканд', 'Северный',
   39.6610, 66.9680, '+998 91 678 90 12',
   true,  true, 4.9, 421, ARRAY['Экспресс','Стандарт','Премиум','Детейлинг'])

ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────
-- NOTES FOR PRODUCTION DEPLOYMENT
-- ─────────────────────────────────────────────────────────────────────────
--
-- 1. ESKIZ SMS
--    Supabase Dashboard → Settings → Edge Functions → Add secrets:
--      ESKIZ_EMAIL    = your@email.com
--      ESKIZ_PASSWORD = your_password
--
-- 2. PAYME INTEGRATION
--    - Payme endpoint: POST /payment/payme-webhook
--    - Verify X-Auth header: Basic base64(PAYME_MERCHANT_ID:PAYME_KEY)
--    - Methods: CheckPerformTransaction, CreateTransaction, PerformTransaction, CancelTransaction
--    - Store raw payload in payments.provider_payload for audit
--    - Use payments.idempotency_key to prevent duplicate processing
--
-- 3. CLICK INTEGRATION
--    - Click endpoint: POST /payment/click-webhook
--    - Verify sign_string: MD5(click_trans_id + service_id + SECRET_KEY + merchant_trans_id + amount + action + sign_time)
--    - Actions: 0 = prepare, 1 = complete
--
-- 4. PARTNER ISOLATION (RLS)
--    - Partner users must have is_partner = true and partner_car_wash_id set
--    - wash_history policy "partner reads own car_wash washes" enforces isolation
--    - Edge Function /partner/stats MUST filter by authenticated user's car_wash_id
--    - Never trust client-supplied partnerId — always derive from auth.uid()
--
-- 5. GEOLOCATION UPGRADE PATH
--    - Enable PostGIS: CREATE EXTENSION postgis;
--    - Add column: ALTER TABLE car_washes ADD COLUMN geog GEOGRAPHY(POINT,4326);
--    - Populate: UPDATE car_washes SET geog = ST_Point(longitude, latitude)::geography;
--    - Index: CREATE INDEX ON car_washes USING GIST(geog);
--    - Query: ORDER BY geog <-> ST_Point(user_lng, user_lat)::geography LIMIT 10;
-- ═══════════════════════════════════════════════════════════════════════════