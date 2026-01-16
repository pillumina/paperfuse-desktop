import { useState, useMemo } from 'react';
import { Plus, X, Info, Check } from 'lucide-react';
import { useSettings } from '../../hooks/useSettings';
import { useLanguage } from '../../contexts/LanguageContext';

// Common ArXiv categories in AI/ML field (IDs only)
const COMMON_CATEGORIES = [
  'cs.AI', 'cs.LG', 'cs.CL', 'cs.CV', 'cs.RO', 'cs.NE',
  'cs.DC', 'cs.DB', 'cs.IR', 'stat.ML'
];

export function ArxivCategoriesSection() {
  const { t } = useLanguage();
  const { data: settings, isLoading } = useSettings();

  // Get localized category info
  const commonCategoriesInfo = useMemo(() => COMMON_CATEGORIES.map(catId => ({
    id: catId,
    name: catId,
    description: t(`settings.arxivCategories.categories.${catId}`)
  })), [t]);
  const [categories, setCategories] = useState<string[]>(
    settings?.arxivCategories || ['cs.AI', 'cs.LG', 'stat.ML']
  );
  const [newCategory, setNewCategory] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleAddCategory = () => {
    const trimmed = newCategory.trim();
    if (trimmed && !categories.includes(trimmed)) {
      setCategories([...categories, trimmed]);
      setNewCategory('');
    }
  };

  const handleRemoveCategory = (category: string) => {
    setCategories(categories.filter(c => c !== category));
  };

  const handleAddCommonCategory = (categoryId: string) => {
    if (!categories.includes(categoryId)) {
      setCategories([...categories, categoryId]);
    } else {
      setCategories(categories.filter(c => c !== categoryId));
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const updatedSettings = {
        ...(settings || {}),
        arxivCategories: categories,
      };
      await invoke('save_settings', { settings: updatedSettings });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (error) {
      console.error('Failed to save categories:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          {t('settings.arxivCategories.title')}
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {t('settings.arxivCategories.description')}
        </p>
      </div>

      {/* Current Categories */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {t('settings.arxivCategories.selectedCategories', { count: categories.length })}
        </label>
        <div className="flex flex-wrap gap-2 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 min-h-[60px]">
          {categories.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t('settings.arxivCategories.noCategoriesSelected')}
            </p>
          ) : (
            categories.map((category) => (
              <div
                key={category}
                className="flex items-center gap-2 px-3 py-1.5 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 rounded-lg"
              >
                <span className="text-sm font-mono">{category}</span>
                <button
                  onClick={() => handleRemoveCategory(category)}
                  className="p-0.5 hover:bg-blue-200 dark:hover:bg-blue-800 rounded transition-colors"
                  title={t('settings.arxivCategories.removeCategory')}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Add Custom Category */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {t('settings.arxivCategories.addCustomCategory')}
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
            placeholder={t('settings.arxivCategories.customCategoryPlaceholder')}
            className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
          />
          <button
            onClick={handleAddCategory}
            disabled={!newCategory.trim()}
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            {t('settings.arxivCategories.addButton')}
          </button>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          {t('settings.arxivCategories.customCategoryHelp')}
        </p>
      </div>

      {/* Common AI/ML Categories */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {t('settings.arxivCategories.commonCategories')}
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {commonCategoriesInfo.map((cat) => {
            const isSelected = categories.includes(cat.id);
            return (
              <button
                key={cat.id}
                onClick={() => handleAddCommonCategory(cat.id)}
                className={`text-left p-3 rounded-lg border-2 transition-all cursor-pointer ${
                  isSelected
                    ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-800'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono font-medium text-gray-900 dark:text-white">
                        {cat.name}
                      </span>
                      {isSelected && (
                        <span className="px-1.5 py-0.5 text-xs bg-blue-600 text-white rounded">{t('settings.arxivCategories.added')}</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{cat.description}</p>
                  </div>
                  {!isSelected && (
                    <Plus className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Info Box */}
      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg flex items-start gap-3">
        <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            <span className="font-medium">{t('settings.arxivCategories.infoBox.title')}</span>
          </p>
          <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
            {t('settings.arxivCategories.infoBox.description')}{' '}
            <a
              href="https://arxiv.org/category_taxonomy"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:no-underline"
            >
              {t('settings.arxivCategories.infoBox.linkText')}
            </a>
          </p>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end gap-2">
        <button
          onClick={handleSave}
          disabled={isSaving || isLoading}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {saveSuccess ? (
            <>
              <Check className="w-4 h-4" />
              {t('settings.arxivCategories.saved')}
            </>
          ) : isSaving ? (
            t('settings.arxivCategories.saving')
          ) : (
            t('settings.arxivCategories.saveCategories')
          )}
        </button>
      </div>
    </div>
  );
}
