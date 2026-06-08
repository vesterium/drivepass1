// DrivePass+ Brand Identity

export const BRAND = {
  name: 'DrivePass+',
  slogan: 'Smart Car Care. Экономь каждый день.',
  
  colors: {
    primary: {
      50: '#eff6ff',
      100: '#dbeafe',
      200: '#bfdbfe',
      300: '#93c5fd',
      400: '#60a5fa',
      500: '#3b82f6',
      600: '#2563eb',
      700: '#1d4ed8',
      800: '#1e40af',
      900: '#1e3a8a',
    },
    secondary: {
      50: '#f0f9ff',
      100: '#e0f2fe',
      500: '#06b6d4',
      600: '#0891b2',
    },
    accent: {
      green: '#10b981',
      yellow: '#f59e0b',
      orange: '#f97316',
      purple: '#8b5cf6',
    },
    trust: {
      verified: '#10b981',
      payment: '#3b82f6',
      guarantee: '#8b5cf6',
    }
  },
  
  fonts: {
    heading: 'Inter, system-ui, -apple-system, sans-serif',
    body: 'Inter, system-ui, -apple-system, sans-serif',
  },
  
  pricing: {
    subscription: 25,
    currency: '$'
  }
};

export const TRUST_INDICATORS = [
  {
    icon: 'shield-check',
    label: 'Verified Partners',
    labelRu: 'Проверенные партнёры',
    labelUz: 'Tasdiqlangan hamkorlar',
    color: BRAND.colors.trust.verified
  },
  {
    icon: 'credit-card',
    label: 'Safe Payment',
    labelRu: 'Безопасная оплата',
    labelUz: "Xavfsiz to'lov",
    color: BRAND.colors.trust.payment,
    badges: ['Visa', 'Uzcard', 'Humo']
  },
  {
    icon: 'award',
    label: '100% Guarantee',
    labelRu: '100% гарантия',
    labelUz: '100% kafolat',
    color: BRAND.colors.trust.guarantee
  }
];
