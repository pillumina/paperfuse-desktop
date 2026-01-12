import { useState, useEffect } from 'react';
import { RotateCcw } from 'lucide-react';
import { RetryConfig, DEFAULT_RETRY_CONFIG } from '../../lib/types';
import { useSettings, useSaveSettings } from '../../hooks/useSettings';
import { useLanguage } from '../../contexts/LanguageContext';

export function RetrySettingsSection() {
  const { t } = useLanguage();
  const { data: savedSettings, isLoading } = useSettings();
  const saveSettingsMutation = useSaveSettings();

  const [localConfig, setLocalConfig] = useState<RetryConfig>(DEFAULT_RETRY_CONFIG);
  const [inputValues, setInputValues] = useState<Record<string, string>>({});
  const [hasChanges, setHasChanges] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [initialized, setInitialized] = useState(false);

  // Helper to get display value for input
  const getInputValue = (key: keyof RetryConfig, defaultValue: number): string => {
    if (inputValues[key] !== undefined) {
      return inputValues[key];
    }
    return localConfig[key]?.toString() ?? defaultValue.toString();
  };

  // Helper to handle input change
  const handleInputChange = (key: keyof RetryConfig, value: string, defaultValue: number) => {
    setInputValues(prev => ({ ...prev, [key]: value }));

    // Only update config if value is not empty
    if (value === '') {
      setLocalConfig(prev => ({ ...prev, [key]: defaultValue }));
    } else {
      const numValue = parseFloat(value);
      setLocalConfig(prev => ({ ...prev, [key]: isNaN(numValue) ? defaultValue : numValue }));
    }
  };

  // Helper to handle input blur
  const handleInputBlur = (key: keyof RetryConfig) => {
    const inputValue = inputValues[key];
    if (inputValue === '' || inputValue === undefined) {
      // Reset to actual config value on blur if empty
      setInputValues(prev => {
        const newValues = { ...prev };
        delete newValues[key];
        return newValues;
      });
    }
  };

  // Initialize local config when saved settings load
  useEffect(() => {
    if (savedSettings?.retryConfig && !initialized) {
      setLocalConfig(savedSettings.retryConfig);
      setInputValues({});
      setInitialized(true);
    }
  }, [savedSettings, initialized]);

  // Track changes
  useEffect(() => {
    if (savedSettings?.retryConfig) {
      const changed = JSON.stringify(savedSettings.retryConfig) !== JSON.stringify(localConfig);
      setHasChanges(changed);
    } else if (initialized) {
      // If no saved config but we have initialized, check if local differs from default
      const changed = JSON.stringify(DEFAULT_RETRY_CONFIG) !== JSON.stringify(localConfig);
      setHasChanges(changed);
    }
  }, [localConfig, savedSettings, initialized]);

  const handleSave = async () => {
    if (!savedSettings) return;

    try {
      await saveSettingsMutation.mutateAsync({
        ...savedSettings,
        retryConfig: localConfig,
      });
      setHasChanges(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('[RetrySettingsSection] Failed to save:', error);
    }
  };

  const handleReset = () => {
    setLocalConfig(DEFAULT_RETRY_CONFIG);
    setInputValues({});
    setHasChanges(true);
  };

  const handleCancel = () => {
    if (savedSettings?.retryConfig) {
      setLocalConfig(savedSettings.retryConfig);
    } else {
      setLocalConfig(DEFAULT_RETRY_CONFIG);
    }
    setInputValues({});
    setHasChanges(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div>
      {/* Success Message */}
      {saveSuccess && (
        <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-center gap-3 animate-fadeIn">
          <div className="flex-shrink-0">
            <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-green-800 dark:text-green-200">
              {t('settings.llmRetry.saved')}
            </p>
          </div>
        </div>
      )}

      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
          {t('settings.llmRetry.title')}
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          {t('settings.llmRetry.description')}
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          {t('settings.llmRetry.retryLimits')}
        </h3>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('settings.llmRetry.maxRetries')}
            </label>
            <input
              type="number"
              min="0"
              max="10"
              value={getInputValue('maxRetries', 3)}
              onChange={(e) => handleInputChange('maxRetries', e.target.value, 3)}
              onBlur={() => handleInputBlur('maxRetries')}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {t('settings.llmRetry.maxRetriesHelp')}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('settings.llmRetry.maxRetryDuration')}
            </label>
            <input
              type="number"
              min="30"
              max="1800"
              step="30"
              value={getInputValue('maxRetryDurationSecs', 300)}
              onChange={(e) => handleInputChange('maxRetryDurationSecs', e.target.value, 300)}
              onBlur={() => handleInputBlur('maxRetryDurationSecs')}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {t('settings.llmRetry.maxRetryDurationHelp')}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          {t('settings.llmRetry.backoffStrategy')}
        </h3>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('settings.llmRetry.initialBackoff')}
            </label>
            <input
              type="number"
              min="100"
              max="10000"
              step="100"
              value={getInputValue('initialBackoffMs', 1000)}
              onChange={(e) => handleInputChange('initialBackoffMs', e.target.value, 1000)}
              onBlur={() => handleInputBlur('initialBackoffMs')}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {t('settings.llmRetry.initialBackoffHelp')}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('settings.llmRetry.maxBackoff')}
            </label>
            <input
              type="number"
              min="1000"
              max="120000"
              step="1000"
              value={getInputValue('maxBackoffMs', 30000)}
              onChange={(e) => handleInputChange('maxBackoffMs', e.target.value, 30000)}
              onBlur={() => handleInputBlur('maxBackoffMs')}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {t('settings.llmRetry.maxBackoffHelp')}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('settings.llmRetry.multiplier')}
            </label>
            <input
              type="number"
              min="1.0"
              max="5.0"
              step="0.1"
              value={getInputValue('backoffMultiplier', 2.0)}
              onChange={(e) => handleInputChange('backoffMultiplier', e.target.value, 2.0)}
              onBlur={() => handleInputBlur('backoffMultiplier')}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {t('settings.llmRetry.multiplierHelp')}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('settings.llmRetry.jitterFactor')}
            </label>
            <input
              type="number"
              min="0"
              max="0.5"
              step="0.05"
              value={getInputValue('jitterFactor', 0.1)}
              onChange={(e) => handleInputChange('jitterFactor', e.target.value, 0.1)}
              onBlur={() => handleInputBlur('jitterFactor')}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {t('settings.llmRetry.jitterFactorHelp')}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('settings.llmRetry.requestTimeout')}
            </label>
            <input
              type="number"
              min="30"
              max="600"
              step="10"
              value={getInputValue('requestTimeoutSecs', 120)}
              onChange={(e) => handleInputChange('requestTimeoutSecs', e.target.value, 120)}
              onBlur={() => handleInputBlur('requestTimeoutSecs')}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {t('settings.llmRetry.requestTimeoutHelp')}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          {t('settings.llmRetry.errorTypes')}
        </h3>

        <div className="space-y-3">
          <label className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900/20 rounded-lg cursor-pointer">
            <input
              type="checkbox"
              checked={localConfig.retryOnRateLimit}
              onChange={(e) => setLocalConfig({ ...localConfig, retryOnRateLimit: e.target.checked })}
              className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex-1">
              <div className="font-medium text-gray-900 dark:text-white">{t('settings.llmRetry.retryOnRateLimit')}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">{t('settings.llmRetry.retryOnRateLimitHelp')}</div>
            </div>
          </label>

          <label className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900/20 rounded-lg cursor-pointer">
            <input
              type="checkbox"
              checked={localConfig.retryOnServerError}
              onChange={(e) => setLocalConfig({ ...localConfig, retryOnServerError: e.target.checked })}
              className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex-1">
              <div className="font-medium text-gray-900 dark:text-white">{t('settings.llmRetry.retryOnServerError')}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">{t('settings.llmRetry.retryOnServerErrorHelp')}</div>
            </div>
          </label>

          <label className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900/20 rounded-lg cursor-pointer">
            <input
              type="checkbox"
              checked={localConfig.retryOnNetworkError}
              onChange={(e) => setLocalConfig({ ...localConfig, retryOnNetworkError: e.target.checked })}
              className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex-1">
              <div className="font-medium text-gray-900 dark:text-white">{t('settings.llmRetry.retryOnNetworkError')}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">{t('settings.llmRetry.retryOnNetworkErrorHelp')}</div>
            </div>
          </label>
        </div>

        <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <div className="flex gap-2">
            <RotateCcw className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800 dark:text-blue-200">
              {t('settings.llmRetry.note')}
            </div>
          </div>
        </div>
      </div>

      {/* Save/Cancel/Reset Buttons */}
      <div className="flex justify-between">
        <button
          type="button"
          onClick={handleReset}
          className="px-6 py-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
        >
          {t('settings.llmRetry.resetToDefaults')}
        </button>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleCancel}
            disabled={!hasChanges}
            className="px-6 py-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t('settings.llmRetry.cancel')}
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!hasChanges || saveSettingsMutation.isPending}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {saveSettingsMutation.isPending ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                {t('settings.llmRetry.saving')}
              </>
            ) : (
              t('settings.llmRetry.saveChanges')
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
