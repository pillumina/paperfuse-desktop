import { useState, useEffect } from 'react';
import { Trash2, Eye, EyeOff } from 'lucide-react';
import { Settings, DEFAULT_SETTINGS } from '../../lib/types';
import { useSettings, useSaveSettings } from '../../hooks/useSettings';
import { useLanguage } from '../../contexts/LanguageContext';

export function ApiKeysSection() {
  const { t } = useLanguage();
  const { data: savedSettings, isLoading } = useSettings();
  const saveSettingsMutation = useSaveSettings();

  // Local state for form editing
  const [localSettings, setLocalSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [showGlmKey, setShowGlmKey] = useState(false);
  const [showClaudeKey, setShowClaudeKey] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [initialized, setInitialized] = useState(false);

  // Separate state for which config panel is currently VIEWING (not necessarily the active provider)
  const [viewingProvider, setViewingProvider] = useState<'glm' | 'claude'>('glm');

  // Initialize local settings when saved settings load (only once)
  useEffect(() => {
    if (savedSettings && !initialized) {
      console.log('[ApiKeysSection] Initializing localSettings from savedSettings:', {
        provider: savedSettings.llmProvider,
        hasGlmKey: !!savedSettings.glmApiKey,
        hasClaudeKey: !!savedSettings.claudeApiKey,
      });
      setLocalSettings(savedSettings);
      setViewingProvider(savedSettings.llmProvider);
      setInitialized(true);
    }
  }, [savedSettings, initialized]);

  // Track if there are unsaved changes
  useEffect(() => {
    if (savedSettings) {
      const changed = JSON.stringify(savedSettings) !== JSON.stringify(localSettings);
      setHasChanges(changed);
    }
  }, [localSettings, savedSettings]);

  // Switch which config panel to VIEW (doesn't change the active provider)
  const handleSwitchView = (provider: 'glm' | 'claude') => {
    console.log(`[ApiKeysSection] Switching view to ${provider} (not changing active provider yet)`);
    setViewingProvider(provider);
  };

  // Actually change the active provider (when user clicks "Use This Provider")
  const handleSetProvider = async (newProvider: 'glm' | 'claude') => {
    console.log(`[ApiKeysSection] Setting active provider to ${newProvider}`);

    const updatedSettings = {
      ...localSettings,
      llmProvider: newProvider,
    };

    setLocalSettings(updatedSettings);

    // Auto-save when changing provider
    try {
      await saveSettingsMutation.mutateAsync(updatedSettings);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('[ApiKeysSection] Failed to save provider change:', error);
    }
  };

  const handleDeleteKey = async (provider: 'glm' | 'claude') => {
    if (!confirm(t('settings.apiKeys.deleteKeyConfirm', { provider: provider.toUpperCase() }).replace('{{provider}}', provider.toUpperCase()))) {
      return;
    }

    console.log(`[ApiKeysSection] Deleting ${provider} API key`);

    const updatedSettings = {
      ...localSettings,
      ...(provider === 'glm'
        ? { glmApiKey: undefined, glmQuickModel: undefined, glmDeepModel: undefined }
        : { claudeApiKey: undefined, claudeQuickModel: undefined, claudeDeepModel: undefined }
      ),
    };

    setLocalSettings(updatedSettings);

    // Auto-save after deletion
    try {
      await saveSettingsMutation.mutateAsync(updatedSettings);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('[ApiKeysSection] Failed to save after deletion:', error);
    }
  };

  const handleSave = async () => {
    console.log('[ApiKeysSection] Saving settings...');
    try {
      await saveSettingsMutation.mutateAsync(localSettings);
      console.log('[ApiKeysSection] Settings saved successfully');
      setHasChanges(false);
      setSaveSuccess(true);

      // Hide success message after 3 seconds
      setTimeout(() => {
        setSaveSuccess(false);
      }, 3000);
    } catch (error) {
      console.error('[ApiKeysSection] Failed to save settings:', error);
    }
  };

  const handleCancel = () => {
    console.log('[ApiKeysSection] Canceling, resetting to saved settings');
    if (savedSettings) {
      setLocalSettings(savedSettings);
      setViewingProvider(savedSettings.llmProvider);
      setHasChanges(false);
    }
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
              {t('settings.apiKeys.saved')}
            </p>
            <p className="text-xs text-green-700 dark:text-green-300 mt-0.5">
              {t('settings.apiKeys.savedDescription')}
            </p>
          </div>
        </div>
      )}

      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
          {t('settings.apiKeys.title')}
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          {t('settings.apiKeys.description')}
        </p>
      </div>

      {/* LLM Provider Selection Cards - for VIEWING configs */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          {t('settings.apiKeys.provider')}
        </label>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
          {t('settings.apiKeys.providerHelp')}
        </p>

        <div className="grid grid-cols-2 gap-4">
          {/* GLM Card */}
          <div
            className={`p-4 rounded-lg border-2 transition-colors text-left cursor-pointer ${
              viewingProvider === 'glm'
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
            onClick={() => handleSwitchView('glm')}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="font-semibold text-gray-900 dark:text-white">
                {t('settings.apiKeys.glm.name')}
              </div>
              {/* Active indicator */}
              {localSettings.llmProvider === 'glm' && (
                <span className="text-xs font-medium px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full">
                  {t('settings.apiKeys.active')}
                </span>
              )}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              {t('settings.apiKeys.glm.description')}
            </div>
            {/* Key status */}
            <div className="text-xs text-gray-500 dark:text-gray-500">
              {localSettings.glmApiKey ? (
                <span className="text-green-600 dark:text-green-400">✓ {t('settings.apiKeys.keyConfigured')}</span>
              ) : (
                <span>{t('settings.apiKeys.keyNotConfigured')}</span>
              )}
            </div>
          </div>

          {/* Claude Card */}
          <div
            className={`p-4 rounded-lg border-2 transition-colors text-left cursor-pointer ${
              viewingProvider === 'claude'
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
            onClick={() => handleSwitchView('claude')}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="font-semibold text-gray-900 dark:text-white">
                {t('settings.apiKeys.claude.name')}
              </div>
              {/* Active indicator */}
              {localSettings.llmProvider === 'claude' && (
                <span className="text-xs font-medium px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full">
                  {t('settings.apiKeys.active')}
                </span>
              )}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              {t('settings.apiKeys.claude.description')}
            </div>
            {/* Key status */}
            <div className="text-xs text-gray-500 dark:text-gray-500">
              {localSettings.claudeApiKey ? (
                <span className="text-green-600 dark:text-green-400">✓ {t('settings.apiKeys.keyConfigured')}</span>
              ) : (
                <span>{t('settings.apiKeys.keyNotConfigured')}</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Config Panel - shows the provider being VIEWED */}
      {viewingProvider === 'glm' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              {t('settings.apiKeys.glm.configTitle')}
            </h3>
            {/* Use This Provider button */}
            {localSettings.llmProvider !== 'glm' && localSettings.glmApiKey && (
              <button
                type="button"
                onClick={() => handleSetProvider('glm')}
                disabled={saveSettingsMutation.isPending}
                className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t('settings.apiKeys.useThisProvider')}
              </button>
            )}
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('settings.apiKeys.glm.apiKey')}
              </label>
              <div className="flex gap-2">
                <input
                  type={showGlmKey ? 'text' : 'password'}
                  value={localSettings.glmApiKey || ''}
                  onChange={(e) => setLocalSettings({ ...localSettings, glmApiKey: e.target.value || undefined })}
                  placeholder={t('settings.apiKeys.glm.apiKeyPlaceholder')}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
                <button
                  type="button"
                  onClick={() => setShowGlmKey(!showGlmKey)}
                  className="px-3 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white border border-gray-300 dark:border-gray-600 rounded-lg"
                  title={showGlmKey ? t('settings.apiKeys.hideKey') : t('settings.apiKeys.showKey')}
                >
                  {showGlmKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
                {localSettings.glmApiKey && (
                  <button
                    type="button"
                    onClick={() => handleDeleteKey('glm')}
                    className="px-3 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-lg"
                    title={t('settings.apiKeys.deleteKey')}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                {t('settings.apiKeys.glm.apiKeyHelp')}{' '}
                <a
                  href="https://open.bigmodel.cn/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 dark:text-blue-400 hover:underline"
                >
                  open.bigmodel.cn
                </a>
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('settings.apiKeys.glm.quickModel')}
                </label>
                <input
                  type="text"
                  value={localSettings.glmQuickModel || 'glm-4.5-flash'}
                  onChange={(e) => setLocalSettings({ ...localSettings, glmQuickModel: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {t('settings.apiKeys.glm.quickModelHelp')}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('settings.apiKeys.glm.deepModel')}
                </label>
                <input
                  type="text"
                  value={localSettings.glmDeepModel || 'glm-4.7'}
                  onChange={(e) => setLocalSettings({ ...localSettings, glmDeepModel: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {t('settings.apiKeys.glm.deepModelHelp')}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {viewingProvider === 'claude' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              {t('settings.apiKeys.claude.configTitle')}
            </h3>
            {/* Use This Provider button */}
            {localSettings.llmProvider !== 'claude' && localSettings.claudeApiKey && (
              <button
                type="button"
                onClick={() => handleSetProvider('claude')}
                disabled={saveSettingsMutation.isPending}
                className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t('settings.apiKeys.useThisProvider')}
              </button>
            )}
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('settings.apiKeys.claude.apiKey')}
              </label>
              <div className="flex gap-2">
                <input
                  type={showClaudeKey ? 'text' : 'password'}
                  value={localSettings.claudeApiKey || ''}
                  onChange={(e) => setLocalSettings({ ...localSettings, claudeApiKey: e.target.value || undefined })}
                  placeholder={t('settings.apiKeys.claude.apiKeyPlaceholder')}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
                <button
                  type="button"
                  onClick={() => setShowClaudeKey(!showClaudeKey)}
                  className="px-3 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white border border-gray-300 dark:border-gray-600 rounded-lg"
                  title={showClaudeKey ? t('settings.apiKeys.hideKey') : t('settings.apiKeys.showKey')}
                >
                  {showClaudeKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
                {localSettings.claudeApiKey && (
                  <button
                    type="button"
                    onClick={() => handleDeleteKey('claude')}
                    className="px-3 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-lg"
                    title={t('settings.apiKeys.deleteKey')}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                {t('settings.apiKeys.claude.apiKeyHelp')}{' '}
                <a
                  href="https://console.anthropic.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 dark:text-blue-400 hover:underline"
                >
                  console.anthropic.com
                </a>
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('settings.apiKeys.claude.quickModel')}
                </label>
                <input
                  type="text"
                  value={localSettings.claudeQuickModel || 'claude-haiku'}
                  onChange={(e) => setLocalSettings({ ...localSettings, claudeQuickModel: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {t('settings.apiKeys.claude.quickModelHelp')}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('settings.apiKeys.claude.deepModel')}
                </label>
                <input
                  type="text"
                  value={localSettings.claudeDeepModel || 'claude-sonnet'}
                  onChange={(e) => setLocalSettings({ ...localSettings, claudeDeepModel: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {t('settings.apiKeys.claude.deepModelHelp')}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Save/Cancel Buttons */}
      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={handleCancel}
          disabled={!hasChanges}
          className="px-6 py-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {t('settings.apiKeys.cancel')}
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
              {t('settings.apiKeys.saving')}
            </>
          ) : (
            t('settings.apiKeys.saveChanges')
          )}
        </button>
      </div>
    </div>
  );
}
