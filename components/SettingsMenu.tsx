import React, { useState, useRef, useEffect } from 'react';
import { Language } from '../types';
import { useI18n } from '../hooks/useI18n';
import { MenuIcon } from './icons';
import { useTheme, Theme } from '../hooks/useTheme';

export const SettingsMenu: React.FC = () => {
  const { language, setLanguage, t } = useI18n();
  const { theme, setTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const languages: { code: Language, name: string }[] = [
    { code: 'zh-TW', name: '繁體' },
    { code: 'zh-CN', name: '简体' },
    { code: 'en', name: 'EN' },
  ];
  
  const themes: { code: Theme, name: string }[] = [
    { code: 'system', name: t('settings.theme.system') },
    { code: 'light', name: t('settings.theme.light') },
    { code: 'dark', name: t('settings.theme.dark') },
  ];

  const handleLanguageSelect = (langCode: Language) => {
    setLanguage(langCode);
    setIsOpen(false);
  };
  
  const handleThemeSelect = (themeCode: Theme) => {
    setTheme(themeCode);
    setIsOpen(false);
  };

  // Close menu if clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="rounded-full p-2 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
        aria-label={t('nav.settingsMenu')}
      >
        <MenuIcon className="w-6 h-6 text-gray-600 dark:text-gray-300" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg py-1 z-50 border border-gray-200 dark:border-gray-700">
          <div className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
            {t('settings.language')}
          </div>
          {languages.map(lang => (
            <button
              key={lang.code}
              onClick={() => handleLanguageSelect(lang.code)}
              className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                language === lang.code
                  ? 'bg-blue-50 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 font-semibold'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              {lang.name}
            </button>
          ))}
          <div className="border-t border-gray-200 dark:border-gray-700 my-1"></div>
          <div className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
            {t('settings.theme')}
          </div>
          {themes.map(th => (
             <button
              key={th.code}
              onClick={() => handleThemeSelect(th.code)}
              className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                theme === th.code
                  ? 'bg-blue-50 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 font-semibold'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              {th.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};