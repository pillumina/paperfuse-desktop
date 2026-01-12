import { createContext, useContext, useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { loadTranslations, getNestedValue, interpolate, getSystemLanguage, type Language } from '../lib/i18n';

type LanguageOption = 'en' | 'zh' | 'system';

interface LanguageContextValue {
  language: LanguageOption;
  setLanguage: (lang: LanguageOption) => void;
  resolvedLanguage: Language;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

const LANGUAGE_STORAGE_KEY = 'language_preference';

/**
 * Get the initial language from settings or localStorage
 */
async function getInitialLanguage(): Promise<LanguageOption> {
  try {
    // Try to get from database settings first
    const langSetting = await invoke<string | null>('get_setting', { key: 'language' });
    if (langSetting) {
      return langSetting as LanguageOption;
    }
  } catch (error) {
    console.error('Failed to get language from settings:', error);
  }

  // Fall back to localStorage
  const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
  if (stored) {
    return stored as LanguageOption;
  }

  return 'system';
}

/**
 * Save language preference to settings and localStorage
 */
async function saveLanguage(language: LanguageOption): Promise<void> {
  // Save to database
  try {
    await invoke('set_setting', {
      key: 'language',
      value: language,
    });
  } catch (error) {
    console.error('Failed to save language to settings:', error);
  }

  // Also save to localStorage as fallback
  localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
}

/**
 * Get the resolved language (en or zh) based on preference and system
 */
function getResolvedLanguage(language: LanguageOption): Language {
  if (language === 'system') {
    return getSystemLanguage();
  }
  // Explicit cast: language is 'en' | 'zh' when not 'system'
  return (language === 'en' || language === 'zh') ? language : 'en';
}

/**
 * Language Provider context
 * Manages language preference and provides translation function
 */
export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<LanguageOption>('system');
  const [resolvedLanguage, setResolvedLanguage] = useState<Language>(() => getSystemLanguage());
  const [translations, setTranslations] = useState<Record<string, any>>({});

  // Load initial language on mount
  useEffect(() => {
    getInitialLanguage().then((initialLang) => {
      setLanguageState(initialLang);
      const resolved = getResolvedLanguage(initialLang);
      setResolvedLanguage(resolved);
      loadTranslations(resolved).then(setTranslations);
    });
  }, []);

  const setLanguage = async (newLang: LanguageOption) => {
    setLanguageState(newLang);
    const resolved = getResolvedLanguage(newLang);
    setResolvedLanguage(resolved);
    await saveLanguage(newLang);
    loadTranslations(resolved).then(setTranslations);
  };

  /**
   * Translation function
   * @param key - Translation key using dot notation (e.g., 'papers.card.deletePaper')
   * @param params - Optional parameters for interpolation
   * @returns Translated string or the key if not found
   */
  const t = (key: string, params?: Record<string, string | number>): string => {
    const value = getNestedValue(translations, key);

    if (typeof value !== 'string') {
      // Missing translation - log warning in development
      if (process.env.NODE_ENV === 'development') {
        console.warn(`[i18n] Missing translation: ${key}`);
      }
      return key;
    }

    return interpolate(value, params);
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, resolvedLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

/**
 * useLanguage hook to access language context
 */
export function useLanguage(): LanguageContextValue {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
}
