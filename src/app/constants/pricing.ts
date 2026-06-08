// DrivePass+ Pricing Model v4
// Три тарифа: Light · Standard · Premium

export const PRICING_PACKAGES = {
  // ── Light ──────────────────────────────────────────────────────────────────
  personal: {
    id: 'personal',
    name: { en: 'Light', ru: 'Light', uz: 'Light' },
    displayName: 'Light',
    description: {
      en: '4 washes per month',
      ru: '4 мойки в месяц',
      uz: 'Oyiga 4 ta yuvish',
    },
    price: { uzs: 390000, usd: 30 },
    washesPerMonth: 4,
    interval: '4 washes per calendar month',
    carLimit: 1,
    popular: false,
    partnerShare: 312000,   // 80%
    dpShare: 78000,         // 20%
    retailPrice: 150000,    // розница за 1 мойку
    savings: { monthly: 210000, percentage: 35 },
    accentColor: '#3B82F6',
    features: {
      ru: [
        '4 мойки в месяц',
        'Все партнёрские автомойки Узбекистана',
        'Доступ по QR-коду',
        'Экономия 35% vs розница',
        '1 автомобиль',
        'Антифрод-защита',
      ],
      en: [
        '4 washes per month',
        'All partner car washes in Uzbekistan',
        'QR code access',
        '35% savings vs retail',
        '1 car',
        'Anti-fraud protection',
      ],
      uz: [
        'Oyiga 4 ta yuvish',
        'O\'zbekiston bo\'ylab barcha hamkor avtomoykalar',
        'QR-kod orqali kirish',
        'Chegirmali narx',
        '1 avtomobil',
        'Himoya',
      ],
    },
  },

  // ── Standard ───────────────────────────────────────────────────────────────
  business: {
    id: 'business',
    name: { en: 'Standard', ru: 'Standard', uz: 'Standard' },
    displayName: 'Standard',
    description: {
      en: '6 washes per month',
      ru: '6 моек в месяц',
      uz: 'Oyiga 6 ta yuvish',
    },
    price: { uzs: 590000, usd: 46 },
    washesPerMonth: 6,
    interval: '6 washes per calendar month',
    carLimit: 1,
    popular: true,
    partnerShare: 472000,   // 80%
    dpShare: 118000,        // 20%
    retailPrice: 150000,
    savings: { monthly: 310000, percentage: 41 },
    accentColor: '#7C3AED',
    features: {
      ru: [
        '6 моек в месяц',
        'Все партнёрские автомойки Узбекистана',
        'Доступ по QR-коду',
        'Зелёный коридор без очереди',
        'Экономия 41% vs розница',
        '1 автомобиль',
        'Антифрод-защита (геозона + HMAC)',
      ],
      en: [
        '6 washes per month',
        'All partner car washes in Uzbekistan',
        'QR code access',
        'Green corridor priority',
        '41% savings vs retail',
        '1 car',
        'Anti-fraud protection',
      ],
      uz: [
        'Oyiga 6 ta yuvish',
        'O\'zbekiston bo\'ylab barcha hamkor avtomoykalar',
        'QR-kod orqali kirish',
        'Yashil koridor',
        '41% tejash',
        '1 avtomobil',
        'Himoya',
      ],
    },
  },

  // ── Premium ────────────────────────────────────────────────────────────────
  premium: {
    id: 'premium',
    name: { en: 'Premium', ru: 'Premium', uz: 'Premium' },
    displayName: 'Premium',
    description: {
      en: '10 washes per month',
      ru: '10 моек в месяц',
      uz: 'Oyiga 10 ta yuvish',
    },
    price: { uzs: 890000, usd: 69 },
    washesPerMonth: 10,
    interval: '10 washes per calendar month',
    carLimit: 1,
    popular: false,
    partnerShare: 712000,   // 80%
    dpShare: 178000,        // 20%
    retailPrice: 200000,    // выше у премиум моек
    savings: { monthly: 1110000, percentage: 55 },
    accentColor: '#F59E0B',
    features: {
      ru: [
        '10 моек в месяц',
        'Все партнёрские автомойки Узбекистана',
        'Доступ по QR-коду',
        'VIP зелёный коридор',
        'Экономия 55% vs розница',
        'Приоритетная поддержка',
        '1 автомобиль',
        'Антифрод-защита (геозона + HMAC)',
      ],
      en: [
        '10 washes per month',
        'All partner car washes in Uzbekistan',
        'QR code access',
        'VIP green corridor',
        '55% savings vs retail',
        'Priority support',
        '1 car',
        'Anti-fraud protection',
      ],
      uz: [
        'Oyiga 10 ta yuvish',
        'O\'zbekiston bo\'ylab barcha hamkor avtomoykalar',
        'QR-kod orqali kirish',
        'VIP yashil koridor',
        '55% tejash',
        'Ustuvor qo\'llab-quvvatlash',
        '1 avtomobil',
        'Himoya',
      ],
    },
  },
} as const;

export type PricingTier = keyof typeof PRICING_PACKAGES;

// Цена одной мойки без подписки (средняя по Узбекистану)
export const SINGLE_WASH_PRICE = { uzs: 150000, usd: 12 };

// Регион и валюта
export const REGION = {
  country: 'Узбекистан',
  cities: ['Самарканд', 'Ташкент', 'Бухара', 'Наманган', 'Фергана'],
  currency: 'UZS',
  currencySymbol: 'сум',
};

// Комиссия для партнёров (80% от стоимости подписки / кол-во моек)
export const PARTNER_COMMISSION = {
  personal: 78000,   // 312k / 4 = 78k за мойку
  business: 78667,   // 472k / 6 ≈ 78.7k за мойку
  premium:  71200,   // 712k / 10 = 71.2k за мойку
};

// Лимиты использования
export const USAGE_LIMITS = {
  personal: {
    washesPerMonth: 4,
    minHoursBetweenWashes: 12,
  },
  business: {
    washesPerMonth: 6,
    minHoursBetweenWashes: 12,
  },
  premium: {
    washesPerMonth: 10,
    minHoursBetweenWashes: 6,
  },
  graceWashes: 1,
  geofenceRadiusM: 500,
};

// Бонус за реферал
export const REFERRAL_BONUS = {
  washer: 10000,
  customer: 50000,
};
