# 🛠️ DrivePass+ - ТЕХНОЛОГИЧЕСКИЙ СТЕК (Детально)

## 📊 АРХИТЕКТУРА (High-Level)

```
┌──────────────────────────────────────────────────────────────────┐
│                         CLIENT TIER                              │
│                                                                  │
│  ┌────────────┐   ┌────────────┐   ┌────────────┐              │
│  │  Browser   │   │  Browser   │   │  Browser   │              │
│  │  (Client)  │   │  (Washer)  │   │ (Partner)  │              │
│  │            │   │            │   │            │              │
│  │  Personal  │   │   Scan QR  │   │ Dashboard  │              │
│  │ Dashboard  │   │   Verify   │   │ Analytics  │              │
│  └────────────┘   └────────────┘   └────────────┘              │
│         ↓                 ↓                ↓                     │
│    ┌────────────────────────────────────────────┐               │
│    │         Service Worker (PWA)               │               │
│    │  ✓ Offline Mode  ✓ Push Notifications     │               │
│    └────────────────────────────────────────────┘               │
└──────────────────────────────────────────────────────────────────┘
                              ↓
                         HTTPS / WSS
                              ↓
┌──────────────────────────────────────────────────────────────────┐
│                      APPLICATION TIER                            │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                 React 18.3.1 PWA                         │   │
│  │  ┌────────────────────────────────────────────────────┐  │   │
│  │  │  Routes (React Router 7)                           │  │   │
│  │  │  / → Onboarding                                    │  │   │
│  │  │  /auth → Login/Register                            │  │   │
│  │  │  /dashboard → Main (after auth)                    │  │   │
│  │  │  /profile → User Profile                           │  │   │
│  │  │  /map → Car Washes Map                             │  │   │
│  │  │  /qr → QR Code Display                             │  │   │
│  │  │  /washer → Washer Panel                            │  │   │
│  │  │  /partner → Partner Dashboard                      │  │   │
│  │  └────────────────────────────────────────────────────┘  │   │
│  │                                                           │   │
│  │  ┌────────────────────────────────────────────────────┐  │   │
│  │  │  State Management (Zustand)                        │  │   │
│  │  │  - authUser (current user)                         │  │   │
│  │  │  - subscription (active subscription)              │  │   │
│  │  │  - washHistory (wash records)                      │  │   │
│  │  │  - language (en/ru/uz)                             │  │   │
│  │  └────────────────────────────────────────────────────┘  │   │
│  │                                                           │   │
│  │  ┌────────────────────────────────────────────────────┐  │   │
│  │  │  UI Components (Shadcn/UI + Radix)                 │  │   │
│  │  │  - 40+ components (Dialog, Toast, Select, ...)    │  │   │
│  │  │  - Lucide Icons (1000+ SVG icons)                  │  │   │
│  │  │  - Tailwind CSS 4.0 (utility-first)                │  │   │
│  │  └────────────────────────────────────────────────────┘  │   │
│  └──────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────┘
                              ↓
                     REST API / PostgreSQL Protocol
                              ↓
┌──────────────────────────────────────────────────────────────────┐
│                      BACKEND TIER (Supabase)                     │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ Auth Service │  │   Database   │  │   Storage    │          │
│  │              │  │ (PostgreSQL) │  │     (S3)     │          │
│  │ ✓ JWT        │  │ ✓ Tables     │  │ ✓ Images     │          │
│  │ ✓ Phone Auth │  │ ✓ Functions  │  │ ✓ Logos      │          │
│  │ ✓ RLS        │  │ ✓ Triggers   │  │ ✓ QR codes   │          │
│  │ ✓ Rate Limit │  │ ✓ Realtime   │  │ ✓ CDN        │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │         Row Level Security (RLS Policies)                  │ │
│  │  ✓ Users see only their data                              │ │
│  │  ✓ Washers see only their car wash                        │ │
│  │  ✓ Partners see only their stats                          │ │
│  └────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
                              ↓
                       External APIs
                              ↓
┌──────────────────────────────────────────────────────────────────┐
│                     INTEGRATION TIER                             │
│                                                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │
│  │  Payme   │  │  Click   │  │  2GIS    │  │ SMS.uz   │        │
│  │   API    │  │   API    │  │   API    │  │   API    │        │
│  │ Payment  │  │ Payment  │  │   Maps   │  │  Verify  │        │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘        │
│                                                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                      │
│  │  Google  │  │  Sentry  │  │Cloudflare│                      │
│  │Analytics │  │  Errors  │  │   CDN    │                      │
│  └──────────┘  └──────────┘  └──────────┘                      │
└──────────────────────────────────────────────────────────────────┘
```

---

## 🎨 FRONTEND STACK

### Core Technologies

```yaml
Framework:
  Name: React
  Version: 18.3.1
  Why: 
    - #1 UI library in the world
    - Huge ecosystem
    - Component-based architecture
    - Virtual DOM for performance
    - Used by: Facebook, Netflix, Airbnb

Language:
  Name: TypeScript
  Version: 5.6.2
  Why:
    - Type safety (catch errors before runtime)
    - Better IDE support (autocomplete)
    - Self-documenting code
    - Used by: Microsoft, Google, Airbnb

Build Tool:
  Name: Vite
  Version: 6.0.11
  Why:
    - Lightning fast (100ms start vs 10s Webpack)
    - Hot Module Replacement (instant updates)
    - Optimized production builds
    - Tree shaking (removes unused code)

Styling:
  Name: Tailwind CSS
  Version: 4.0.0
  Why:
    - Utility-first approach
    - No CSS files needed
    - Responsive by default
    - PurgeCSS (final CSS ~10kb)
    - Used by: GitHub, Shopify, NASA
```

### UI Components

```yaml
Component Library:
  Name: Shadcn/UI
  Primitives: Radix UI
  Count: 40+ components
  
  Components Used:
    - Dialog (modals)
    - Toast (notifications)
    - Select (dropdowns)
    - Input (form fields)
    - Button (CTAs)
    - Card (containers)
    - Tabs (navigation)
    - Avatar (profile pics)
    - Badge (status)
    - Calendar (date picker)
    - Checkbox (forms)
    - Form (validation)
    - Label (accessibility)
    - Popover (tooltips)
    - Progress (loading)
    - RadioGroup (choices)
    - ScrollArea (overflow)
    - Separator (dividers)
    - Sheet (side panels)
    - Slider (ranges)
    - Switch (toggles)
    - Table (data)
    - Textarea (multiline)
    - Tooltip (hints)
    
  Why Shadcn:
    ✓ Copy/paste components (you own the code)
    ✓ No external dependencies
    ✓ Fully customizable
    ✓ Accessibility built-in (WCAG 2.1)
    ✓ TypeScript support

Icons:
  Name: Lucide React
  Version: Latest
  Count: 1000+ SVG icons
  Examples:
    - Car (🚗)
    - QrCode (📱)
    - MapPin (📍)
    - User (👤)
    - Calendar (📅)
    - DollarSign (💰)
    - Star (⭐)
    - Phone (☎️)
    - LogOut (🚪)
```

### Routing

```yaml
Router:
  Name: React Router
  Version: 7
  Pattern: Data Mode (createBrowserRouter)
  
  Routes:
    / :
      Component: Onboarding
      Access: Public
      
    /auth :
      Component: Auth (Login/Register)
      Access: Public
      
    /dashboard :
      Component: Dashboard
      Access: Protected (requires auth)
      
    /profile :
      Component: Profile
      Access: Protected
      
    /subscription :
      Component: SubscriptionPlans
      Access: Protected
      
    /map :
      Component: CarWashMap
      Access: Protected
      
    /qr :
      Component: QRCodeDisplay
      Access: Protected
      Condition: Has active subscription
      
    /history :
      Component: WashHistory
      Access: Protected
      
    /washer :
      Component: WasherPanel
      Access: Protected
      Role: Washer
      
    /partner :
      Component: PartnerDashboard
      Access: Protected
      Role: Partner
      
    * :
      Component: NotFound (404)
```

### State Management

```yaml
Library:
  Name: Zustand
  Version: Latest
  Pattern: Hooks-based
  
  Stores:
    authStore:
      - user (User | null)
      - isAuthenticated (boolean)
      - login (function)
      - logout (function)
      - updateProfile (function)
      
    subscriptionStore:
      - subscription (Subscription | null)
      - tier (none/personal/business)
      - expiresAt (Date)
      - autoRenew (boolean)
      - subscribe (function)
      - cancel (function)
      
    washStore:
      - history (WashRecord[])
      - canWashNow (boolean)
      - nextAvailableWash (Date | null)
      - timeRemaining (string)
      - generateQR (function)
      - recordWash (function)
      
    languageStore:
      - language (en/ru/uz)
      - setLanguage (function)
      - t (translation function)
      
  Why Zustand:
    ✓ Simple API (no boilerplate)
    ✓ Small bundle size (~1kb)
    ✓ No providers needed
    ✓ DevTools support
    ✓ TypeScript friendly
    
  vs Redux:
    Zustand: 50 lines of code
    Redux: 1000+ lines of code
```

### Forms & Validation

```yaml
Form Library:
  Name: React Hook Form
  Version: 7.55.0 (must specify version!)
  
  Features:
    ✓ Uncontrolled inputs (performance)
    ✓ Built-in validation
    ✓ Error handling
    ✓ TypeScript support
    ✓ Works with Shadcn components
    
  Example:
    const form = useForm({
      resolver: zodResolver(schema),
      defaultValues: { phone: "", carNumber: "" }
    });
    
Validation:
  Name: Zod
  Version: Latest
  
  Schemas:
    phoneSchema:
      - Must be +998 format
      - Exactly 9 digits after +998
      - No spaces in storage (998910339511)
      
    carNumberSchema:
      - Format: XX A XXX AA
      - 2 digits, letter, 3 digits, 2 letters
      - Example: 30 A 777 AA
      
    passwordSchema:
      - Min 8 characters
      - At least 1 uppercase
      - At least 1 lowercase
      - At least 1 number
      - Not in breach database (Supabase checks)
```

### PWA (Progressive Web App)

```yaml
Plugin:
  Name: vite-plugin-pwa
  Version: Latest
  
  Features:
    Service Worker:
      - Offline caching
      - Background sync
      - Push notifications
      - Update prompts
      
    Manifest:
      name: DrivePass+
      short_name: DrivePass
      theme_color: #10b981 (green)
      background_color: #ffffff
      display: standalone
      orientation: portrait
      icons:
        - 192x192 (Android)
        - 512x512 (iOS)
        - maskable icons
        
    Capabilities:
      ✓ Install to homescreen
      ✓ Fullscreen mode
      ✓ Splash screen
      ✓ Offline mode
      ✓ Push notifications
      ✓ Background sync
      ✓ Camera access (QR scan)
      ✓ Geolocation
      
  Offline Strategy:
    - Network First (API calls)
    - Cache First (static assets)
    - Stale While Revalidate (images)
```

### QR Code

```yaml
Library:
  Name: qrcode.react
  Version: Latest
  
  QR Format:
    code: DRIVEPASS-{userId}-{washId}-{timestamp}
    size: 256px (display)
    level: H (high error correction)
    includeMargin: true
    
  Data Structure:
    {
      "code": "DRIVEPASS-USER123-WASH456-TS1234567890",
      "userId": "uuid-of-user",
      "carNumber": "30 A 777 AA",
      "tier": "personal",
      "generatedAt": 1704067200,
      "expiresAt": 1704067800, // +10 minutes
      "signature": "sha256-hash" // prevent tampering
    }
    
  Security:
    ✓ TTL: 10 minutes (can't reuse old screenshots)
    ✓ One-time use (after scan, invalidated)
    ✓ Car number check (washer verifies)
    ✓ Signature (HMAC-SHA256)
```

### Maps & Geolocation

```yaml
Map Library:
  Name: React Leaflet
  Tiles: OpenStreetMap / Mapbox
  
  Features:
    - Show user location (blue dot)
    - Show car washes (markers)
    - Green Corridor badge (special icon)
    - Distance calculation
    - Zoom controls
    - Clustering (if >50 washes)
    
  Geolocation:
    API: Browser Geolocation API
    Permissions: Ask on first use
    Accuracy: High (GPS if available)
    Fallback: IP-based location
    
  Markers:
    User: 
      icon: blue-dot.svg
      color: #3b82f6 (blue)
      
    Car Wash:
      icon: wash-marker.svg
      color: #10b981 (green)
      popup: Name, rating, distance, directions
      
    Green Corridor:
      icon: fast-wash-marker.svg
      color: #22c55e (bright green)
      badge: "⚡ Fast"
```

### Internationalization (i18n)

```yaml
Library:
  Name: react-i18next
  Version: Latest
  
  Languages:
    - en (English) - 🇬🇧
    - ru (Русский) - 🇷🇺
    - uz (O'zbekcha) - 🇺🇿
    
  Files:
    /locales/en/common.json
    /locales/ru/common.json
    /locales/uz/common.json
    
  Example Translations:
    "welcome": {
      "en": "Welcome back!",
      "ru": "С возвращением!",
      "uz": "Qaytganingiz bilan!"
    }
    
    "get_qr_code": {
      "en": "Get QR Code",
      "ru": "Получить QR код",
      "uz": "QR kodni olish"
    }
    
  Storage:
    - Language saved to localStorage
    - Persists between sessions
    - Auto-detect browser language on first visit
```

---

## 🗄️ BACKEND STACK (Supabase)

### Supabase Overview

```yaml
Platform: Supabase
Type: Backend-as-a-Service (BaaS)
Based on: PostgreSQL
Open Source: Yes
Self-Hostable: Yes

Services Included:
  - Authentication (Auth)
  - Database (PostgreSQL 15)
  - Storage (S3-compatible)
  - Edge Functions (Deno)
  - Realtime (WebSocket)
  - Vector (pgvector for AI)
```

### Authentication

```yaml
Provider: Supabase Auth
Strategy: Phone-based (custom implementation)

Flow:
  1. User enters phone: +998 (91) 033 95 11
  2. Frontend converts to: 998910339511
  3. Creates fake email: 998910339511@drivepass.uz
  4. Supabase creates auth.users record
  5. Returns JWT (access + refresh tokens)
  6. Frontend stores in localStorage
  7. Auto-refresh before expiry
  
Tokens:
  Access Token:
    Duration: 1 hour
    Storage: localStorage
    Sent in: Authorization header
    Format: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
    
  Refresh Token:
    Duration: 30 days
    Storage: localStorage (httpOnly in production)
    Used to: Get new access token
    
Security:
  ✓ Password Leak Protection (HaveIBeenPwned)
  ✓ Rate Limiting (10 signup/hour, 30 login/hour)
  ✓ Min password length: 8 chars
  ✓ Session expiry: 1 hour
  ✓ Auto-logout on inactivity
```

### Database Schema

```sql
-- Auth users (managed by Supabase)
auth.users (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE, -- 998910339511@drivepass.uz
  encrypted_password TEXT,
  created_at TIMESTAMP,
  last_sign_in_at TIMESTAMP
)

-- Our custom user data
public.users (
  id UUID PRIMARY KEY REFERENCES auth.users,
  name TEXT NOT NULL,
  phone TEXT UNIQUE NOT NULL, -- 998910339511
  formatted_phone TEXT, -- +998 (91) 033 95 11
  car_number TEXT NOT NULL, -- 30 A 777 AA
  subscription_tier TEXT DEFAULT 'none', -- none/personal/business
  subscription_expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
)
INDEX idx_users_phone ON users(phone)
INDEX idx_users_subscription ON users(subscription_tier, subscription_expires_at)

-- Wash history (KEY TABLE)
public.wash_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  car_wash_id UUID REFERENCES car_washes(id),
  car_number TEXT NOT NULL,
  washed_at TIMESTAMP DEFAULT NOW(),
  next_available_wash TIMESTAMP GENERATED ALWAYS AS (washed_at + INTERVAL '24 hours') STORED, -- ⚠️ KEY!
  qr_code TEXT UNIQUE NOT NULL,
  verified_by_washer BOOLEAN DEFAULT FALSE,
  washer_id UUID REFERENCES washers(id),
  subscription_tier TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
)
INDEX idx_wash_user_next ON wash_history(user_id, next_available_wash)
INDEX idx_wash_qr ON wash_history(qr_code)

-- Car washes
public.car_washes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),
  phone TEXT,
  working_hours JSONB, -- {"mon": "08:00-20:00", ...}
  has_green_corridor BOOLEAN DEFAULT FALSE,
  rating DECIMAL(3,2) DEFAULT 0.00,
  total_reviews INTEGER DEFAULT 0,
  partner_id UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
)
INDEX idx_carwash_location ON car_washes(latitude, longitude)

-- Subscriptions
public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  tier TEXT NOT NULL, -- personal/business
  amount INTEGER NOT NULL, -- 220000 or 450000
  currency TEXT DEFAULT 'UZS',
  payment_method TEXT, -- payme/click
  payment_transaction_id TEXT,
  starts_at TIMESTAMP NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  auto_renew BOOLEAN DEFAULT TRUE,
  status TEXT DEFAULT 'active', -- active/cancelled/expired
  created_at TIMESTAMP DEFAULT NOW()
)
INDEX idx_sub_user_status ON subscriptions(user_id, status, expires_at)

-- Washers (car wash employees)
public.washers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  car_wash_id UUID REFERENCES car_washes(id),
  name TEXT NOT NULL,
  phone TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
)

-- Reviews
public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  car_wash_id UUID REFERENCES car_washes(id),
  wash_history_id UUID REFERENCES wash_history(id),
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMP DEFAULT NOW()
)
```

### SQL Functions

```sql
-- Check if user can wash now (24h limit)
CREATE OR REPLACE FUNCTION can_wash_now(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  last_wash_next_available TIMESTAMP;
BEGIN
  SELECT next_available_wash INTO last_wash_next_available
  FROM wash_history
  WHERE user_id = p_user_id
  ORDER BY washed_at DESC
  LIMIT 1;
  
  -- No washes yet → can wash
  IF last_wash_next_available IS NULL THEN
    RETURN TRUE;
  END IF;
  
  -- 24 hours passed → can wash
  IF NOW() >= last_wash_next_available THEN
    RETURN TRUE;
  END IF;
  
  -- Less than 24h → cannot wash
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- Get time until next wash
CREATE OR REPLACE FUNCTION time_until_next_wash(p_user_id UUID)
RETURNS INTERVAL AS $$
DECLARE
  last_wash_next_available TIMESTAMP;
BEGIN
  SELECT next_available_wash INTO last_wash_next_available
  FROM wash_history
  WHERE user_id = p_user_id
  ORDER BY washed_at DESC
  LIMIT 1;
  
  IF last_wash_next_available IS NULL THEN
    RETURN INTERVAL '0 seconds';
  END IF;
  
  IF NOW() >= last_wash_next_available THEN
    RETURN INTERVAL '0 seconds';
  END IF;
  
  RETURN last_wash_next_available - NOW();
END;
$$ LANGUAGE plpgsql;

-- Update car wash rating (trigger)
CREATE OR REPLACE FUNCTION update_car_wash_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE car_washes
  SET 
    rating = (
      SELECT AVG(rating)::DECIMAL(3,2)
      FROM reviews
      WHERE car_wash_id = NEW.car_wash_id
    ),
    total_reviews = (
      SELECT COUNT(*)
      FROM reviews
      WHERE car_wash_id = NEW.car_wash_id
    )
  WHERE id = NEW.car_wash_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_rating
AFTER INSERT OR UPDATE ON reviews
FOR EACH ROW
EXECUTE FUNCTION update_car_wash_rating();
```

### Row Level Security (RLS)

```sql
-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE wash_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Users can only see their own data
CREATE POLICY "Users read own data"
ON users FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Users update own data"
ON users FOR UPDATE
USING (auth.uid() = id);

-- Wash history: own data only
CREATE POLICY "Users read own wash history"
ON wash_history FOR SELECT
USING (auth.uid() = user_id);

-- Washers can see washes at their car wash
CREATE POLICY "Washers read washes at their wash"
ON wash_history FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM washers
    WHERE washers.user_id = auth.uid()
    AND washers.car_wash_id = wash_history.car_wash_id
  )
);

-- Washers can insert washes
CREATE POLICY "Washers insert washes"
ON wash_history FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM washers
    WHERE washers.user_id = auth.uid()
    AND washers.car_wash_id = wash_history.car_wash_id
  )
);

-- Car washes are public (everyone can read)
CREATE POLICY "Anyone read car washes"
ON car_washes FOR SELECT
TO authenticated
USING (true);

-- Only partners can update their own car wash
CREATE POLICY "Partners update own wash"
ON car_washes FOR UPDATE
USING (auth.uid() = partner_id);
```

### Storage

```yaml
Buckets:
  car-wash-logos:
    Public: true
    File Types: image/jpeg, image/png, image/webp
    Max Size: 2MB
    Path: /car-wash-logos/{car_wash_id}/{filename}
    
  user-avatars:
    Public: true
    File Types: image/jpeg, image/png
    Max Size: 1MB
    Path: /user-avatars/{user_id}/{filename}
    
  qr-codes:
    Public: false (authenticated only)
    File Types: image/png
    Max Size: 100KB
    Path: /qr-codes/{user_id}/{timestamp}.png
    
RLS Policies:
  - Users can upload their own avatar
  - Partners can upload their car wash logo
  - Anyone (authenticated) can view car wash logos
```

### Realtime

```yaml
Enabled Tables:
  - wash_history (for washer panel live updates)
  
Subscriptions:
  WasherPanel:
    channel: "wash_history:car_wash_id=eq.{washId}"
    event: INSERT
    callback: (payload) => addNewWash(payload.new)
    
  UserDashboard:
    channel: "subscriptions:user_id=eq.{userId}"
    event: UPDATE
    callback: (payload) => updateSubscription(payload.new)
```

---

## 🔌 INTEGRATIONS

### Payment Gateways

```yaml
Payme:
  Endpoint: https://checkout.paycom.uz
  Merchant ID: From Payme dashboard
  Test Mode: Yes (for development)
  
  Flow:
    1. User selects subscription
    2. Frontend creates order
    3. Redirect to Payme checkout
    4. User pays with card
    5. Payme redirects back with transaction_id
    6. Backend verifies payment
    7. Activate subscription
    
Click:
  Endpoint: https://my.click.uz/services/pay
  Service ID: From Click dashboard
  Merchant User ID: From Click
  
  Similar flow to Payme
```

### SMS Gateway

```yaml
Provider: SMS.uz
Endpoint: https://notify.eskiz.uz/api
API Key: From SMS.uz dashboard

Usage:
  - Phone verification (future)
  - Payment confirmations
  - Wash reminders
  
Cost: ~50 UZS per SMS
```

### Maps

```yaml
Provider: OpenStreetMap (free)
Alternative: Mapbox (if >50k users)

Tiles: 
  Free: https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png
  Mapbox: https://api.mapbox.com/v4/mapbox.streets/{z}/{x}/{y}.png
  
Geocoding:
  Forward: address → coordinates
  Reverse: coordinates → address
  Provider: Nominatim (OSM) / Mapbox
```

### Analytics

```yaml
Google Analytics 4:
  Property ID: G-XXXXXXXXXX
  
  Events:
    - page_view (automatic)
    - user_signup
    - subscription_start
    - qr_code_generated
    - wash_completed
    - subscription_cancelled
    
Sentry:
  DSN: https://xxx@sentry.io/xxx
  
  Tracked:
    - JavaScript errors
    - API errors (4xx, 5xx)
    - Performance (Core Web Vitals)
    - User feedback
```

---

## 📦 DEPLOYMENT

### Hosting

```yaml
Platform: Vercel (recommended)
Alternative: Netlify, Cloudflare Pages

Vercel Features:
  ✓ Automatic deployments (git push)
  ✓ Preview deployments (PRs)
  ✓ Custom domain (drivepass.uz)
  ✓ SSL certificate (automatic)
  ✓ Edge network (fast worldwide)
  ✓ Serverless functions
  
Cost: Free tier (100GB bandwidth/month)
```

### Build Configuration

```yaml
# vercel.json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "env": {
    "VITE_SUPABASE_URL": "@supabase-url",
    "VITE_SUPABASE_ANON_KEY": "@supabase-anon-key"
  }
}
```

### Environment Variables

```bash
# .env.production
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...
VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX
VITE_SENTRY_DSN=https://xxx@sentry.io/xxx
VITE_PAYME_MERCHANT_ID=xxx
VITE_CLICK_SERVICE_ID=xxx
```

---

## 📊 MONITORING

### Performance

```yaml
Core Web Vitals:
  LCP (Largest Contentful Paint): <2.5s ✅
  FID (First Input Delay): <100ms ✅
  CLS (Cumulative Layout Shift): <0.1 ✅
  
Tools:
  - Lighthouse (Chrome DevTools)
  - WebPageTest
  - GTmetrix
```

### Error Tracking

```yaml
Sentry:
  - Real-time error alerts
  - Stack traces
  - User context
  - Breadcrumbs (user actions)
  
Supabase Logs:
  - API errors
  - Auth failures
  - Database errors
```

### Uptime Monitoring

```yaml
UptimeRobot:
  - Check every 5 minutes
  - Alert via Email/Telegram
  - 99.9% uptime target
```

---

## 🚀 CI/CD PIPELINE

```yaml
GitHub Actions:
  on:
    push:
      branches: [main]
      
  jobs:
    lint:
      - ESLint
      - TypeScript check
      
    test:
      - Unit tests (Jest)
      - E2E tests (Playwright)
      
    build:
      - npm run build
      
    deploy:
      - Vercel production
      
  on:
    pull_request:
      
  jobs:
    preview:
      - Deploy to preview URL
```

---

**Версия:** 2.0.0  
**Дата:** 15 февраля 2025  
**Статус:** ✅ PRODUCTION-READY
