"use client";
import { createContext, useContext, useState, ReactNode } from "react";
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
  return (
    <LanguageContext.Provider value={{ locale, setLocale, t: translations[locale] }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => useContext(LanguageContext);
