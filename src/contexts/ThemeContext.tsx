import { createContext, useContext, useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: 'light' | 'dark';
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const THEME_STORAGE_KEY = 'theme_preference';

/**
 * Get the initial theme from settings or localStorage
 */
async function getInitialTheme(): Promise<Theme> {
  try {
    // Try to get from database settings first
    const themeSetting = await invoke<string | null>('get_setting', { key: 'theme' });
    if (themeSetting) {
      return themeSetting as Theme;
    }
  } catch (error) {
    console.error('Failed to get theme from settings:', error);
  }

  // Fall back to localStorage
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  if (stored) {
    return stored as Theme;
  }

  return 'system';
}

/**
 * Save theme preference to settings and localStorage
 */
async function saveTheme(theme: Theme): Promise<void> {
  // Save to database
  try {
    await invoke('set_setting', {
      key: 'theme',
      value: theme,
    });
  } catch (error) {
    console.error('Failed to save theme to settings:', error);
  }

  // Also save to localStorage as fallback
  localStorage.setItem(THEME_STORAGE_KEY, theme);
}

/**
 * Get the resolved theme (light or dark) based on preference and system
 */
function getResolvedTheme(theme: Theme): 'light' | 'dark' {
  if (theme === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  // Explicit cast: theme is 'light' | 'dark' when not 'system'
  return (theme === 'light' || theme === 'dark') ? theme : 'light';
}

/**
 * Theme Provider context
 * Manages theme preference and applies it to the document
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('system');
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>(() =>
    getResolvedTheme('system')
  );

  // Load initial theme on mount
  useEffect(() => {
    getInitialTheme().then((initialTheme) => {
      setThemeState(initialTheme);
      setResolvedTheme(getResolvedTheme(initialTheme));
    });
  }, []);

  // Listen for system theme changes when using 'system' preference
  useEffect(() => {
    if (theme !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      setResolvedTheme(e.matches ? 'dark' : 'light');
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  // Apply theme to document
  useEffect(() => {
    const root = document.documentElement;
    if (resolvedTheme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [resolvedTheme]);

  const setTheme = async (newTheme: Theme) => {
    setThemeState(newTheme);
    setResolvedTheme(getResolvedTheme(newTheme));
    await saveTheme(newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

/**
 * useTheme hook to access theme context
 */
export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}
