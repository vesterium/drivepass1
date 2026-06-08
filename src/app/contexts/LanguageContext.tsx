import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { nativeStorage } from '../core/native/storage';
import { translations } from '../translations';

type Language = 'en' | 'ru' | 'uz';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

// ── Stable default translator (English) — prevents crash if provider is missing ──
function makeTranslator(lang: Language) {
  return (key: string): string => {
    const keys = key.split('.');
    let value: any = translations[lang];
    for (const k of keys) {
      value = value?.[k];
    }
    return typeof value === 'string' ? value : key;
  };
}

const LanguageContext = createContext<LanguageContextType>({
  language: 'en',
  setLanguage: () => {},
  t: makeTranslator('en'),
});

const STORAGE_KEY = 'dp_language';

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>('ru');

  useEffect(() => {
    nativeStorage.getItem(STORAGE_KEY).then(saved => {
      if (saved === 'en' || saved === 'ru' || saved === 'uz') {
        setLanguageState(saved);
      }
    });
  }, []);

  const setLanguage = (lang: Language) => {
    nativeStorage.setItem(STORAGE_KEY, lang).catch(() => {});
    setLanguageState(lang);
  };

  const t = makeTranslator(language);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
