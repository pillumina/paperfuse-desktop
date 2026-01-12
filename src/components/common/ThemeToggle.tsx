import { Moon, Sun, Monitor } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

/**
 * ThemeToggle component allows users to switch between
 * light, dark, and system (auto) themes.
 */
export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
    setTheme(newTheme);
  };

  return (
    <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-1 border border-gray-300 dark:border-gray-600">
      <button
        onClick={() => handleThemeChange('light')}
        className={`p-2 rounded-md transition-colors ${
          theme === 'light'
            ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
        }`}
        title="Light theme"
      >
        <Sun className="w-4 h-4" />
      </button>
      <button
        onClick={() => handleThemeChange('dark')}
        className={`p-2 rounded-md transition-colors ${
          theme === 'dark'
            ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
        }`}
        title="Dark theme"
      >
        <Moon className="w-4 h-4" />
      </button>
      <button
        onClick={() => handleThemeChange('system')}
        className={`p-2 rounded-md transition-colors ${
          theme === 'system'
            ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
        }`}
        title="System theme"
      >
        <Monitor className="w-4 h-4" />
      </button>
    </div>
  );
}
