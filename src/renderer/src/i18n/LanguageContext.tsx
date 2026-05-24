import React, { createContext, useContext, useCallback } from 'react';
import { useAppStore } from '../store';
import type { Lang, LangKey } from './translations';
import { translations } from './translations';

interface LanguageContextType {
  lang: Lang;
  t: (key: LangKey) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  lang: 'ru',
  t: (key: LangKey) => translations[key].ru,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const lang = useAppStore((s) => s.lang);

  const t = useCallback(
    (key: LangKey): string => translations[key][lang],
    [lang],
  );

  return (
    <LanguageContext.Provider value={{ lang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useT(): (key: LangKey) => string {
  return useContext(LanguageContext).t;
}

export function useLang(): Lang {
  return useContext(LanguageContext).lang;
}
