"use client";
import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Locale, translations, TranslationKeys } from "@/i18n/translations";

interface LanguageContextType {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (typeof translations)[Locale];
}

const LanguageContext = createContext<LanguageContextType>({
  locale: "en",
  setLocale: () => {},
  t: translations.en,
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>("en");
  useEffect(() => {
    const saved = localStorage.getItem('music-solana-language');
    if (saved === 'en' || saved === 'es') setLocale(saved);
  }, []);
  function changeLocale(next: Locale) {
    setLocale(next);
    localStorage.setItem('music-solana-language', next);
    document.documentElement.lang = next;
  }
  useEffect(() => { document.documentElement.lang = locale; }, [locale]);
  return (
    <LanguageContext.Provider value={{ locale, setLocale: changeLocale, t: translations[locale] }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => useContext(LanguageContext);
