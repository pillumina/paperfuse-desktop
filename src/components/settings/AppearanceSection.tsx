import { ThemeToggle } from '../common/ThemeToggle';
import { LanguageToggle } from '../common/LanguageToggle';
import { useLanguage } from '../../contexts/LanguageContext';

export function AppearanceSection() {
  const { t } = useLanguage();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
          {t('settings.appearance.title')}
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          {t('settings.appearance.description')}
        </p>
      </div>

      {/* Theme Selection */}
      <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">
              {t('settings.appearance.theme.title')}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {t('settings.appearance.theme.description')}
            </p>
          </div>
          <ThemeToggle />
        </div>
      </div>

      {/* Language Selection */}
      <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">
              {t('settings.appearance.language.title')}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {t('settings.appearance.language.description')}
            </p>
          </div>
          <LanguageToggle />
        </div>
      </div>
    </div>
  );
}
