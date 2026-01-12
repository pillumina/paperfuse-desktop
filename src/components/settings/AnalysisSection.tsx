import { useState, useEffect } from 'react';
import { Settings, DEFAULT_SETTINGS } from '../../lib/types';
import { useSettings, useSaveSettings } from '../../hooks/useSettings';
import { CheckCircle, Circle, Zap, BookOpen, Clock, HardDrive, Settings2 } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

export function AnalysisSection() {
  const { t } = useLanguage();
  const { data: savedSettings, isLoading } = useSettings();
  const saveSettingsMutation = useSaveSettings();

  // Local state for form editing
  const [localSettings, setLocalSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [selectedMode, setSelectedMode] = useState<'standard' | 'full' | null>(null); // Track currently selected mode for UI
  const [hasChanges, setHasChanges] = useState(false);
  const [initialized, setInitialized] = useState(false);

  // Initialize local settings when saved settings load (only once)
  useEffect(() => {
    if (savedSettings && !initialized) {
      setLocalSettings(savedSettings);
      setSelectedMode(savedSettings.deepAnalysisMode ?? 'standard');
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

  const handleSave = async () => {
    try {
      await saveSettingsMutation.mutateAsync(localSettings);
      setHasChanges(false);
    } catch (error) {
      console.error('[AnalysisSection] Failed to save settings:', error);
    }
  };

  const handleCancel = () => {
    if (savedSettings) {
      setLocalSettings(savedSettings);
      setSelectedMode(savedSettings.deepAnalysisMode ?? 'standard');
      setHasChanges(false);
    }
  };

  const handleModeSelect = (mode: 'standard' | 'full') => {
    // Update UI state immediately for instant feedback
    setSelectedMode(mode);
    // Update settings state
    setLocalSettings({ ...localSettings, deepAnalysisMode: mode });
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
      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
          {t('settings.deepAnalysis.title')}
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          {t('settings.deepAnalysis.description')}
        </p>
      </div>

      {/* Mode Selection */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Standard Mode */}
        <button
          type="button"
          onClick={() => handleModeSelect('standard')}
          className={`p-6 rounded-lg border-2 transition-all text-left ${
            selectedMode === 'standard'
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-md'
              : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
          }`}
        >
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 mt-1">
              {selectedMode === 'standard' ? (
                <CheckCircle className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              ) : (
                <Circle className="w-6 h-6 text-gray-400" />
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-3">
                <BookOpen className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {t('settings.deepAnalysis.standard.title')}
                </h3>
              </div>

              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('settings.deepAnalysis.standard.analyzes')}
                  </p>
                  <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                    <li>{t('settings.deepAnalysis.standard.item1')}</li>
                    <li>{t('settings.deepAnalysis.standard.item2')}</li>
                    <li>{t('settings.deepAnalysis.standard.item3')}</li>
                    <li>{t('settings.deepAnalysis.standard.item4')}</li>
                    <li>{t('settings.deepAnalysis.standard.item5')}</li>
                  </ul>
                </div>

                <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <Zap className="w-4 h-4 text-yellow-600" />
                    <span className="font-medium">{t('settings.deepAnalysis.standard.bestFor')}</span>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    {t('settings.deepAnalysis.standard.bestForDesc')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </button>

        {/* Full Mode */}
        <button
          type="button"
          onClick={() => handleModeSelect('full')}
          className={`p-6 rounded-lg border-2 transition-all text-left ${
            selectedMode === 'full'
              ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 shadow-md'
              : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
          }`}
        >
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 mt-1">
              {selectedMode === 'full' ? (
                <CheckCircle className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              ) : (
                <Circle className="w-6 h-6 text-gray-400" />
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-3">
                <HardDrive className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {t('settings.deepAnalysis.full.title')}
                </h3>
              </div>

              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('settings.deepAnalysis.full.analyzes')}
                  </p>
                  <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                    <li>{t('settings.deepAnalysis.full.item1')}</li>
                    <li>{t('settings.deepAnalysis.full.item2')}</li>
                    <li>{t('settings.deepAnalysis.full.item3')}</li>
                    <li>{t('settings.deepAnalysis.full.item4')}</li>
                  </ul>
                </div>

                <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <Clock className="w-4 h-4 text-orange-600" />
                    <span className="font-medium">{t('settings.deepAnalysis.full.bestFor')}</span>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    {t('settings.deepAnalysis.full.bestForDesc')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </button>
      </div>

      {/* Async Mode Configuration */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <Settings2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {t('settings.asyncAnalysis.title')}
          </h3>
        </div>

        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          {t('settings.asyncAnalysis.description')}
        </p>

        {/* Sync/Async Toggle */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            {t('settings.asyncAnalysis.modeLabel')}
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Sync Mode */}
            <button
              type="button"
              onClick={() => setLocalSettings({ ...localSettings, asyncAnalysisMode: 'sync' })}
              className={`p-4 rounded-lg border-2 transition-all text-left ${
                localSettings.asyncAnalysisMode === 'sync'
                  ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  {localSettings.asyncAnalysisMode === 'sync' ? (
                    <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                  ) : (
                    <Circle className="w-5 h-5 text-gray-400" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="w-4 h-4 text-green-600 dark:text-green-400" />
                    <h4 className="font-medium text-gray-900 dark:text-white">
                      {t('settings.asyncAnalysis.syncMode')}
                    </h4>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    {t('settings.asyncAnalysis.syncModeDesc')}
                  </p>
                </div>
              </div>
            </button>

            {/* Async Mode */}
            <button
              type="button"
              onClick={() => setLocalSettings({ ...localSettings, asyncAnalysisMode: 'async' })}
              className={`p-4 rounded-lg border-2 transition-all text-left ${
                localSettings.asyncAnalysisMode === 'async'
                  ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  {localSettings.asyncAnalysisMode === 'async' ? (
                    <CheckCircle className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  ) : (
                    <Circle className="w-5 h-5 text-gray-400" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <h4 className="font-medium text-gray-900 dark:text-white">
                      {t('settings.asyncAnalysis.asyncMode')}
                    </h4>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    {t('settings.asyncAnalysis.asyncModeDesc')}
                  </p>
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Concurrency Slider (only shown in async mode) */}
        {localSettings.asyncAnalysisMode === 'async' && (
          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              {t('settings.asyncAnalysis.concurrencyLabel')}
            </label>
            <div className="space-y-4">
              <input
                type="range"
                min="1"
                max="5"
                step="1"
                value={localSettings.maxConcurrentAnalyses ?? 1}
                onChange={(e) => setLocalSettings({ ...localSettings, maxConcurrentAnalyses: parseInt(e.target.value) })}
                className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
              <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
                <span>1 (safer)</span>
                <span className="px-3 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-full font-medium">
                  {localSettings.maxConcurrentAnalyses ?? 1} {localSettings.maxConcurrentAnalyses === 1 ? 'paper' : 'papers'}
                </span>
                <span>5 (faster)</span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                {t('settings.asyncAnalysis.concurrencyWarning')}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Comparison Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden mb-6">
        <div className="p-4 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
          <h3 className="font-semibold text-gray-900 dark:text-white">{t('settings.deepAnalysis.comparison.title')}</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300">{t('settings.deepAnalysis.comparison.feature')}</th>
                <th className="px-4 py-3 text-center font-medium text-blue-700 dark:text-blue-300">{t('settings.deepAnalysis.comparison.standard')}</th>
                <th className="px-4 py-3 text-center font-medium text-purple-700 dark:text-purple-300">{t('settings.deepAnalysis.comparison.full')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              <tr>
                <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{t('settings.deepAnalysis.comparison.contentAnalyzed')}</td>
                <td className="px-4 py-3 text-center text-gray-600 dark:text-gray-400">{t('settings.deepAnalysis.comparison.contentStandard')}</td>
                <td className="px-4 py-3 text-center text-gray-600 dark:text-gray-400">{t('settings.deepAnalysis.comparison.contentFull')}</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{t('settings.deepAnalysis.comparison.novelty')}</td>
                <td className="px-4 py-3 text-center"><CheckCircle className="w-5 h-5 text-green-600 mx-auto" /></td>
                <td className="px-4 py-3 text-center"><CheckCircle className="w-5 h-5 text-green-600 mx-auto" /></td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{t('settings.deepAnalysis.comparison.effectiveness')}</td>
                <td className="px-4 py-3 text-center"><CheckCircle className="w-5 h-5 text-green-600 mx-auto" /></td>
                <td className="px-4 py-3 text-center"><CheckCircle className="w-5 h-5 text-green-600 mx-auto" /></td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{t('settings.deepAnalysis.comparison.codeDetection')}</td>
                <td className="px-4 py-3 text-center"><CheckCircle className="w-5 h-5 text-green-600 mx-auto" /></td>
                <td className="px-4 py-3 text-center"><CheckCircle className="w-5 h-5 text-green-600 mx-auto" /></td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{t('settings.deepAnalysis.comparison.engineeringNotes')}</td>
                <td className="px-4 py-3 text-center"><CheckCircle className="w-5 h-5 text-green-600 mx-auto" /></td>
                <td className="px-4 py-3 text-center"><CheckCircle className="w-5 h-5 text-green-600 mx-auto" /></td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{t('settings.deepAnalysis.comparison.experimentAssessment')}</td>
                <td className="px-4 py-3 text-center text-gray-400 dark:text-gray-600">—</td>
                <td className="px-4 py-3 text-center"><CheckCircle className="w-5 h-5 text-green-600 mx-auto" /></td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{t('settings.deepAnalysis.comparison.algorithmFlowchart')}</td>
                <td className="px-4 py-3 text-center text-gray-400 dark:text-gray-600">—</td>
                <td className="px-4 py-3 text-center"><CheckCircle className="w-5 h-5 text-green-600 mx-auto" /></td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{t('settings.deepAnalysis.comparison.complexityAnalysis')}</td>
                <td className="px-4 py-3 text-center text-gray-400 dark:text-gray-600">—</td>
                <td className="px-4 py-3 text-center"><CheckCircle className="w-5 h-5 text-green-600 mx-auto" /></td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{t('settings.deepAnalysis.comparison.apiCost')}</td>
                <td className="px-4 py-3 text-center text-gray-600 dark:text-gray-400">{t('settings.deepAnalysis.comparison.apiCostLow')}</td>
                <td className="px-4 py-3 text-center text-gray-600 dark:text-gray-400">{t('settings.deepAnalysis.comparison.apiCostHigh')}</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{t('settings.deepAnalysis.comparison.processingTime')}</td>
                <td className="px-4 py-3 text-center text-gray-600 dark:text-gray-400">{t('settings.deepAnalysis.comparison.processingTimeFast')}</td>
                <td className="px-4 py-3 text-center text-gray-600 dark:text-gray-400">{t('settings.deepAnalysis.comparison.processingTimeSlow')}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Note */}
      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 mb-6">
        <p className="text-sm text-blue-800 dark:text-blue-300">
          {t('settings.deepAnalysis.recommendation')}
        </p>
      </div>

      {/* Save/Cancel Buttons */}
      {hasChanges && (
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={handleCancel}
            className="px-6 py-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
          >
            {t('settings.deepAnalysis.cancel')}
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saveSettingsMutation.isPending}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {saveSettingsMutation.isPending ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                {t('settings.deepAnalysis.saving')}
              </>
            ) : (
              t('settings.deepAnalysis.saveChanges')
            )}
          </button>
        </div>
      )}
    </div>
  );
}
