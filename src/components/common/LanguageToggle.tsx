import { useLanguage } from '../../contexts/LanguageContext';

/**
 * LanguageToggle component - Compact segmented control design
 * Supports English, Chinese, and System (auto) language detection
 */
export function LanguageToggle() {
  const { language, setLanguage } = useLanguage();

  const handleLanguageChange = (newLanguage: 'en' | 'zh' | 'system') => {
    setLanguage(newLanguage);
  };

  const options = [
    { value: 'en' as const, label: 'EN' },
    { value: 'zh' as const, label: '中文' },
    { value: 'system' as const, label: 'Auto' },
  ];

  return (
    <div
      className="relative inline-flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1 border border-gray-200 dark:border-gray-700"
      role="group"
      aria-label="Language selection"
    >
      {options.map((option) => {
        const isActive = language === option.value;

        return (
          <button
            key={option.value}
            onClick={() => handleLanguageChange(option.value)}
            className={`
              relative px-2.5 py-1.5 rounded-md text-xs font-medium transition-all duration-200 ease-out
              ${isActive
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }
            `}
            title={option.label}
            aria-pressed={isActive}
            aria-label={`Switch to ${option.label}`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
