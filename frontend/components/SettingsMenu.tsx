import React, { useState, useRef, useEffect } from 'react';
import { Language } from '../types';
import { useI18n } from '../hooks/useI18n';
import {
  SunIcon,
  MoonIcon,
  TranslationIcon,
  FileTextIcon,
  ShieldIcon,
  LogOutIcon
} from './icons';
import { GoogleLogin } from '@react-oauth/google';
import { useTheme } from '../hooks/useTheme';
import { useAuth } from '../context/AuthContext';

export const SettingsMenu: React.FC = () => {
  const { language, setLanguage, t } = useI18n();
  const { theme, setTheme } = useTheme();
  const { user, isAuthenticated, login, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const languages: { code: Language, name: string }[] = [
    { code: 'zh-TW', name: '繁體中文' },
    { code: 'zh-CN', name: '简体中文' },
    { code: 'en', name: 'English' },
  ];

  const handleLanguageSelect = (langCode: Language) => {
    setLanguage(langCode);
    setIsOpen(false);
  };

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
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
        className="rounded-full p-1 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
        aria-label={t('nav.settingsMenu')}
      >
        {isAuthenticated && user?.avatarUrl ? (
          <img
            src={user.avatarUrl}
            alt={user.name}
            className="w-8 h-8 rounded-full object-cover"
          />
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 56 56"
            className="w-8 h-8 text-gray-600 dark:text-gray-300"
          >
            <path
              fill="currentColor"
              d="M28 51.906c13.055 0 23.906-10.828 23.906-23.906c0-13.055-10.875-23.906-23.93-23.906C14.899 4.094 4.095 14.945 4.095 28c0 13.078 10.828 23.906 23.906 23.906m0-3.984C16.937 47.922 8.1 39.062 8.1 28c0-11.04 8.813-19.922 19.876-19.922c11.039 0 19.921 8.883 19.945 19.922c.023 11.063-8.883 19.922-19.922 19.922m0-21.234c3.398.023 6.117-2.883 6.117-6.704c0-3.562-2.719-6.539-6.117-6.539s-6.117 2.977-6.117 6.54c0 3.82 2.718 6.68 6.117 6.703M17.078 39.977h21.82c.938 0 1.407-.633 1.407-1.477c0-2.625-3.938-9.398-12.305-9.398S15.695 35.875 15.695 38.5c0 .844.469 1.477 1.383 1.477"
            />
          </svg>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-gray-800 rounded-xl shadow-xl py-2 z-50 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200">

          {/* User Info Section & Logout */}
          {isAuthenticated && user ? (
            <div className="border-b border-gray-200 dark:border-gray-700">
              <div className="px-4 py-3 flex items-center gap-3">
                <img
                  src={user.avatarUrl}
                  alt={user.name}
                  className="w-10 h-10 rounded-full object-cover"
                />
                <div className="overflow-hidden">
                  <div className="font-bold text-base truncate">{user.name}</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400 truncate">{user.email}</div>
                </div>
              </div>
              <button
                onClick={() => { logout(); setIsOpen(false); }}
                className="w-full px-4 py-3 flex items-center gap-3 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-red-600 dark:text-red-400"
              >
                <LogOutIcon className="w-5 h-5" />
                <span className="font-medium">{t('auth.logout')}</span>
              </button>
            </div>
          ) : (
            <div className="border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex justify-center">
              <GoogleLogin
                onSuccess={async (credentialResponse) => {
                  if (credentialResponse.credential) {
                    await login(credentialResponse.credential);
                    setIsOpen(false);
                  }
                }}
                onError={() => {
                  console.log('Login Failed');
                }}
                theme={theme === 'dark' ? 'filled_black' : 'outline'}
                width="250"
              />
            </div>
          )}

          {/* Theme Toggle */}
          <div className="px-4 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
            <div className="flex items-center gap-3">
              <SunIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              <span className="font-medium">{t('settings.theme')}</span>
            </div>
            <button
              onClick={toggleTheme}
              className="flex items-center bg-yellow-100 dark:bg-gray-700 rounded-full p-1 cursor-pointer"
            >
              <div className={`p-1 rounded-full ${theme !== 'dark' ? 'bg-yellow-400 text-white shadow-sm' : 'text-gray-400'}`}>
                <SunIcon className="w-4 h-4" />
              </div>
              <div className={`p-1 rounded-full ${theme === 'dark' ? 'bg-indigo-500 text-white shadow-sm' : 'text-gray-400'}`}>
                <MoonIcon className="w-4 h-4" />
              </div>
            </button>
          </div>

          {/* Language Selector */}
          <div className="px-4 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
            <div className="flex items-center gap-3">
              <TranslationIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              <span className="font-medium">{t('settings.language')}</span>
            </div>
            <div className="relative group">
              <select
                value={language}
                onChange={(e) => handleLanguageSelect(e.target.value as Language)}
                className="appearance-none bg-gray-100 dark:bg-gray-700 border-none rounded-lg py-1 pl-3 pr-8 text-sm font-medium focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                {languages.map(lang => (
                  <option key={lang.code} value={lang.code}>{lang.name}</option>
                ))}
              </select>
              <div className="absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none">
                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700 my-1"></div>

          {/* Links */}
          <a href="#" className="px-4 py-3 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors text-gray-700 dark:text-gray-200">
            <FileTextIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            <span className="font-medium">{t('settings.terms')}</span>
          </a>
          <a href="#" className="px-4 py-3 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors text-gray-700 dark:text-gray-200">
            <ShieldIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            <span className="font-medium">{t('settings.privacy')}</span>
          </a>


        </div>
      )}
    </div>
  );
};