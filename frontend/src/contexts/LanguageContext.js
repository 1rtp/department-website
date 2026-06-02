import React, { createContext, useContext, useState } from 'react';
import { translations } from '../utils/translations';

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
  const [language, setLanguageState] = useState(
    () => localStorage.getItem('app_lang') || 'ua'
  );

  const setLanguage = (lang) => {
    localStorage.setItem('app_lang', lang);
    setLanguageState(lang);
  };

  const t = (key) => {
    const keys = key.split('.');
    let value = translations[language];
    for (const k of keys) {
      if (value && value[k] !== undefined) {
        value = value[k];
      } else {
        return key;
      }
    }
    return typeof value === 'string' ? value : key;
  };

  const toggleLanguage = () => {
    const next = language === 'ua' ? 'en' : 'ua';
    setLanguage(next);
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
};