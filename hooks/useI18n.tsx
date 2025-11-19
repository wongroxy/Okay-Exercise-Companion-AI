import React, { createContext, useState, useContext, useEffect, ReactNode, useCallback } from 'react';
import { Language } from '../types';

// ====================================================================================
// HOW TO CHANGE APP TEXT
//
// To change or add text translations for the app, edit the JSON files
// in the `locales` directory. Each file corresponds to a language:
//
// - `locales/en.json`: English
// - `locales/zh-CN.json`: Simplified Chinese (简体中文)
// - `locales/zh-TW.json`: Traditional Chinese (繁體中文)
//
// You can add new key-value pairs to these files and then use the `t()` function
// from this hook to display them in your components.
//
// Example:
// 1. Add `"myComponent.newText": "My new text"` to `en.json`.
// 2. In your component, use `const { t } = useI18n();` and then `{t('myComponent.newText')}`
//    to display the text.
// ====================================================================================

const getInitialLanguage = (): Language => {
  const storedLang = localStorage.getItem('app-language') as Language;
  // Check if the stored language is one of the supported languages
  if (storedLang && ['en', 'zh-TW', 'zh-CN'].includes(storedLang)) {
    return storedLang;
  }
  // Default to Traditional Chinese
  return 'zh-TW';
};

interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export const I18nProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(getInitialLanguage);
  const [translations, setTranslations] = useState<Record<Language, Record<string, string>> | null>(null);

  useEffect(() => {
    const fetchTranslations = async () => {
      try {
        const [en, zhTW, zhCN] = await Promise.all([
          fetch('./locales/en.json').then(res => {
            if (!res.ok) throw new Error(`Failed to fetch en.json: ${res.statusText}`);
            return res.json();
          }),
          fetch('./locales/zh-TW.json').then(res => {
            if (!res.ok) throw new Error(`Failed to fetch zh-TW.json: ${res.statusText}`);
            return res.json();
          }),
          fetch('./locales/zh-CN.json').then(res => {
            if (!res.ok) throw new Error(`Failed to fetch zh-CN.json: ${res.statusText}`);
            return res.json();
          })
        ]);
        setTranslations({
          'en': en,
          'zh-TW': zhTW,
          'zh-CN': zhCN,
        });
      } catch (error) {
        console.error("Failed to load translation files:", error);
      }
    };
    fetchTranslations();
  }, []); // Run only once on mount

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('app-language', lang);
  };

  const t = useCallback((key: string, params: Record<string, string | number> = {}) => {
    if (!translations) {
      // Return the key as a fallback while translations are loading
      return key;
    }
    let translation = translations[language][key] || key;
    for (const paramKey in params) {
        translation = translation.replace(`{${paramKey}}`, String(params[paramKey]));
    }
    return translation;
  }, [language, translations]);

  const value = { language, setLanguage, t };

  return (
    <I18nContext.Provider value={value}>
      {children}
    </I18nContext.Provider>
  );
};

export const useI18n = (): I18nContextType => {
  const context = useContext(I18nContext);
  if (context === undefined) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
};