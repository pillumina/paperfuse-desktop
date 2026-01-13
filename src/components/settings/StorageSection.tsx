import { useState, useEffect } from 'react';
import { FolderOpen, Info, ExternalLink, Trash2, Database, FileText } from 'lucide-react';
import { Settings, DEFAULT_SETTINGS } from '../../lib/types';
import { useSettings, useSaveSettings, useCacheStats, useClearCache } from '../../hooks/useSettings';
import { open } from '@tauri-apps/plugin-dialog';
import { Command } from '@tauri-apps/plugin-shell';
import { useLanguage } from '../../contexts/LanguageContext';

export function StorageSection() {
  const { t } = useLanguage();
  const { data: savedSettings, isLoading } = useSettings();
  const saveSettingsMutation = useSaveSettings();
  const { data: cacheStats } = useCacheStats();
  const clearCacheMutation = useClearCache();

  // Local state for form editing
  const [localSettings, setLocalSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [hasChanges, setHasChanges] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [initialized, setInitialized] = useState(false);

  // Initialize local settings when saved settings load (only once)
  useEffect(() => {
    if (savedSettings && !initialized) {
      console.log('[StorageSection] Initializing localSettings from savedSettings');
      setLocalSettings(savedSettings);
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

  // Get the effective path (configured or default)
  const getEffectiveLatexPath = (): string => {
    if (localSettings.latexDownloadPath) {
      return localSettings.latexDownloadPath;
    }
    // Default path
    return '~/Documents/PaperFuse/latex';
  };

  const getEffectivePdfPath = (): string => {
    if (localSettings.pdfDownloadPath) {
      return localSettings.pdfDownloadPath;
    }
    // Default path
    return '~/Documents/PaperFuse/pdfs';
  };

  const isUsingDefaultLatexPath = !localSettings.latexDownloadPath;
  const isUsingDefaultPdfPath = !localSettings.pdfDownloadPath;

  const handleSelectLatexFolder = async () => {
    try {
      console.log('[StorageSection] Opening folder selection dialog');
      const selected = await open({
        directory: true,
        multiple: false,
        title: 'Select LaTeX Download Directory',
      });

      console.log('[StorageSection] Dialog returned:', selected);

      // Handle the return value properly
      if (selected !== null && selected !== undefined) {
        // In Tauri 2.0, dialog returns a string or array of strings
        const path = Array.isArray(selected) ? selected[0] : selected;
        console.log('[StorageSection] Selected directory:', path);
        setLocalSettings({ ...localSettings, latexDownloadPath: path });
      } else {
        console.log('[StorageSection] Dialog was cancelled');
      }
    } catch (error) {
      console.error('[StorageSection] Failed to select directory:', error);
    }
  };

  const handleSelectPdfFolder = async () => {
    try {
      console.log('[StorageSection] Opening folder selection dialog for PDF');
      const selected = await open({
        directory: true,
        multiple: false,
        title: 'Select PDF Download Directory',
      });

      console.log('[StorageSection] Dialog returned:', selected);

      // Handle the return value properly
      if (selected !== null && selected !== undefined) {
        // In Tauri 2.0, dialog returns a string or array of strings
        const path = Array.isArray(selected) ? selected[0] : selected;
        console.log('[StorageSection] Selected directory:', path);
        setLocalSettings({ ...localSettings, pdfDownloadPath: path });
      } else {
        console.log('[StorageSection] Dialog was cancelled');
      }
    } catch (error) {
      console.error('[StorageSection] Failed to select directory:', error);
    }
  };

  const handleClearLatexPath = () => {
    console.log('[StorageSection] Clearing LaTeX download path (will use default)');
    setLocalSettings({ ...localSettings, latexDownloadPath: undefined });
  };

  const handleClearPdfPath = () => {
    console.log('[StorageSection] Clearing PDF download path (will use default)');
    setLocalSettings({ ...localSettings, pdfDownloadPath: undefined });
  };

  const handleOpenLatexDirectory = async () => {
    try {
      const path = getEffectiveLatexPath();
      console.log('[StorageSection] Opening LaTeX directory:', path);

      // Convert ~/ to home directory
      const expandedPath = path.replace(/^~/, process.env.HOME || '');

      // Use Command to open the directory in Finder
      const command = Command.create('open', [expandedPath]);
      await command.execute();
    } catch (error) {
      console.error('[StorageSection] Failed to open directory:', error);
    }
  };

  const handleOpenPdfDirectory = async () => {
    try {
      const path = getEffectivePdfPath();
      console.log('[StorageSection] Opening PDF directory:', path);

      // Convert ~/ to home directory
      const expandedPath = path.replace(/^~/, process.env.HOME || '');

      // Use Command to open the directory in Finder
      const command = Command.create('open', [expandedPath]);
      await command.execute();
    } catch (error) {
      console.error('[StorageSection] Failed to open directory:', error);
    }
  };

  const handleSave = async () => {
    console.log('[StorageSection] Saving settings...');
    try {
      await saveSettingsMutation.mutateAsync(localSettings);
      console.log('[StorageSection] Settings saved successfully');
      setHasChanges(false);
      setSaveSuccess(true);

      // Hide success message after 3 seconds
      setTimeout(() => {
        setSaveSuccess(false);
      }, 3000);
    } catch (error) {
      console.error('[StorageSection] Failed to save settings:', error);
    }
  };

  const handleCancel = () => {
    console.log('[StorageSection] Canceling, resetting to saved settings');
    if (savedSettings) {
      setLocalSettings(savedSettings);
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
              {t('settings.storage.saved')}
            </p>
            <p className="text-xs text-green-700 dark:text-green-300 mt-0.5">
              {t('settings.storage.savedDescription')}
            </p>
          </div>
        </div>
      )}

      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
          {t('settings.storage.title')}
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          {t('settings.storage.description')}
        </p>
      </div>

      {/* LaTeX Download Path */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          {t('settings.storage.latex.title')}
        </h3>

        <div className="space-y-4">
          {/* Info Box */}
          <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                <strong>{t('settings.storage.latex.infoTitle')}</strong> {t('settings.storage.latex.infoDesc')}
              </p>
            </div>
          </div>

          {/* Current Path Display */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('settings.storage.latex.downloadDirectory')}
              {isUsingDefaultLatexPath && (
                <span className="ml-2 text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full">
                  {t('settings.storage.latex.defaultBadge')}
                </span>
              )}
            </label>
            <div className="flex gap-2">
              <div className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white flex items-center gap-2">
                <FolderOpen className="w-4 h-4 text-gray-500 dark:text-gray-400 flex-shrink-0" />
                <span className="truncate" title={getEffectiveLatexPath()}>
                  {getEffectiveLatexPath()}
                </span>
              </div>
              <button
                type="button"
                onClick={handleSelectLatexFolder}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                <FolderOpen className="w-4 h-4" />
                {t('settings.storage.latex.browse')}
              </button>
              <button
                type="button"
                onClick={handleOpenLatexDirectory}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg flex items-center gap-2"
                title={t('settings.storage.latex.openTooltip')}
              >
                <ExternalLink className="w-4 h-4" />
                {t('settings.storage.latex.open')}
              </button>
              {!isUsingDefaultLatexPath && (
                <button
                  type="button"
                  onClick={handleClearLatexPath}
                  className="px-4 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-lg"
                  title={t('settings.storage.latex.resetTooltip')}
                >
                  {t('settings.storage.latex.reset')}
                </button>
              )}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 flex items-center justify-between">
              <span>
                {isUsingDefaultLatexPath
                  ? t('settings.storage.latex.defaultPathDesc')
                  : t('settings.storage.latex.customPathDesc')}
              </span>
            </p>
          </div>

          {/* Status Badge */}
          <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm text-green-800 dark:text-green-200 font-medium">
              {t('settings.storage.latex.statusEnabled')}
            </span>
          </div>
        </div>
      </div>

      {/* PDF Download Path */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5" />
          {t('settings.storage.pdf.title')}
        </h3>

        <div className="space-y-4">
          {/* Info Box */}
          <div className="flex items-start gap-3 p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
            <Info className="w-5 h-5 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-orange-800 dark:text-orange-200">
                <strong>{t('settings.storage.pdf.infoTitle')}</strong> {t('settings.storage.pdf.infoDesc')}
              </p>
            </div>
          </div>

          {/* Current Path Display */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('settings.storage.pdf.downloadDirectory')}
              {isUsingDefaultPdfPath && (
                <span className="ml-2 text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full">
                  {t('settings.storage.pdf.defaultBadge')}
                </span>
              )}
            </label>
            <div className="flex gap-2">
              <div className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white flex items-center gap-2">
                <FolderOpen className="w-4 h-4 text-gray-500 dark:text-gray-400 flex-shrink-0" />
                <span className="truncate" title={getEffectivePdfPath()}>
                  {getEffectivePdfPath()}
                </span>
              </div>
              <button
                type="button"
                onClick={handleSelectPdfFolder}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                <FolderOpen className="w-4 h-4" />
                {t('settings.storage.pdf.browse')}
              </button>
              <button
                type="button"
                onClick={handleOpenPdfDirectory}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg flex items-center gap-2"
                title={t('settings.storage.pdf.openTooltip')}
              >
                <ExternalLink className="w-4 h-4" />
                {t('settings.storage.pdf.open')}
              </button>
              {!isUsingDefaultPdfPath && (
                <button
                  type="button"
                  onClick={handleClearPdfPath}
                  className="px-4 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-lg"
                  title={t('settings.storage.pdf.resetTooltip')}
                >
                  {t('settings.storage.pdf.reset')}
                </button>
              )}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 flex items-center justify-between">
              <span>
                {isUsingDefaultPdfPath
                  ? t('settings.storage.pdf.defaultPathDesc')
                  : t('settings.storage.pdf.customPathDesc')}
              </span>
            </p>
          </div>

          {/* Status Badge */}
          <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm text-green-800 dark:text-green-200 font-medium">
              {t('settings.storage.pdf.statusEnabled')}
            </span>
          </div>
        </div>
      </div>

      {/* Relevance Cache Management */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Database className="w-5 h-5" />
          {t('settings.storage.cache.title')}
        </h3>

        <div className="space-y-4">
          {/* Info Box */}
          <div className="flex items-start gap-3 p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg">
            <Info className="w-5 h-5 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-purple-800 dark:text-purple-200">
                <strong>{t('settings.storage.cache.infoTitle')}</strong> {t('settings.storage.cache.infoDesc')}
              </p>
            </div>
          </div>

          {/* Cache Stats */}
          {cacheStats && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('settings.storage.cache.totalEntries')}</div>
                <div className="text-lg font-semibold text-gray-900 dark:text-white">{cacheStats.total_entries}</div>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('settings.storage.cache.uniquePapers')}</div>
                <div className="text-lg font-semibold text-gray-900 dark:text-white">{cacheStats.unique_papers}</div>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('settings.storage.cache.configurations')}</div>
                <div className="text-lg font-semibold text-gray-900 dark:text-white">{cacheStats.unique_configs}</div>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('settings.storage.cache.status')}</div>
                <div className="text-sm font-medium text-green-600 dark:text-green-400">
                  {cacheStats.total_entries > 0 ? t('settings.storage.cache.statusActive') : t('settings.storage.cache.statusEmpty')}
                </div>
              </div>
            </div>
          )}

          {/* Clear Cache Button */}
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
            <div>
              <div className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                {t('settings.storage.cache.clearCache')}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {cacheStats && cacheStats.total_entries > 0
                  ? t('settings.storage.cache.clearCacheDesc', { count: cacheStats.total_entries }).replace('{{count}}', cacheStats.total_entries.toString())
                  : t('settings.storage.cache.clearCacheEmpty')}
              </div>
            </div>
            <button
              type="button"
              onClick={() => clearCacheMutation.mutate()}
              disabled={!cacheStats || cacheStats.total_entries === 0 || clearCacheMutation.isPending}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {clearCacheMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  {t('settings.storage.cache.clearing')}
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  {t('settings.storage.cache.clearAll')}
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Save/Cancel Buttons */}
      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={handleCancel}
          disabled={!hasChanges}
          className="px-6 py-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {t('settings.storage.cancel')}
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
              {t('settings.storage.saving')}
            </>
          ) : (
            t('settings.storage.saveChanges')
          )}
        </button>
      </div>
    </div>
  );
}
