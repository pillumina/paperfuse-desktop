import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Power } from 'lucide-react';
import { TopicConfig } from '../../lib/types';
import { getTopics, setTopics as cacheTopics } from '../../lib/topics';
import { TOPIC_COLORS } from '../../lib/constants';
import { useSettings, useSaveSettings } from '../../hooks/useSettings';
import { useLanguage } from '../../contexts/LanguageContext';

export function TopicsSection() {
  const { t } = useLanguage();
  const { data: savedSettings, isLoading } = useSettings();
  const saveSettingsMutation = useSaveSettings();

  // Local state for topics editing
  const [topics, setTopics] = useState<TopicConfig[]>(getTopics());
  const [editingTopic, setEditingTopic] = useState<TopicConfig | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [initialized, setInitialized] = useState(false);

  // Initialize topics from saved settings (only once)
  useEffect(() => {
    if (savedSettings && !initialized) {
      const savedTopics = savedSettings.topics && savedSettings.topics.length > 0
        ? savedSettings.topics
        : getTopics();
      console.log('[TopicsSection] Initializing topics from savedSettings:', savedTopics);
      setTopics(savedTopics);
      cacheTopics(savedTopics);
      setInitialized(true);
    }
  }, [savedSettings, initialized]);

  // Track if there are unsaved changes
  useEffect(() => {
    if (savedSettings && initialized) {
      const changed = JSON.stringify(savedSettings.topics || []) !== JSON.stringify(topics);
      setHasChanges(changed);
    }
  }, [topics, savedSettings, initialized]);

  // Save topics to settings
  const handleSave = async () => {
    if (!savedSettings) return;

    console.log('[TopicsSection] Saving topics...', topics);
    try {
      const updatedSettings = {
        ...savedSettings,
        topics: topics,
      };
      await saveSettingsMutation.mutateAsync(updatedSettings);
      console.log('[TopicsSection] Topics saved successfully');
      cacheTopics(topics);
      setHasChanges(false);
      setSaveSuccess(true);

      // Hide success message after 3 seconds
      setTimeout(() => {
        setSaveSuccess(false);
      }, 3000);
    } catch (error) {
      console.error('[TopicsSection] Failed to save topics:', error);
    }
  };

  // Cancel changes
  const handleCancel = () => {
    console.log('[TopicsSection] Canceling, resetting to saved settings');
    if (savedSettings) {
      const savedTopics = savedSettings.topics && savedSettings.topics.length > 0
        ? savedSettings.topics
        : getTopics();
      setTopics(savedTopics);
      setHasChanges(false);
    }
  };

  const handleDelete = (key: string) => {
    if (topics.length <= 1) {
      alert(t('settings.topics.mustHaveOne'));
      return;
    }
    setTopics(topics.filter(t => t.key !== key));
  };

  const handleToggleEnabled = (key: string) => {
    setTopics(topics.map(t => {
      if (t.key === key) {
        // Toggle: if currently enabled (undefined or true), set to false; if false, set to true
        const isEnabled = t.enabled !== false;
        return { ...t, enabled: !isEnabled };
      }
      return t;
    }));
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
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
            {t('settings.topics.title')}
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            {t('settings.topics.description')}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          {t('settings.topics.addTopic')}
        </button>
      </div>

      {/* Topics List */}
      <div className="space-y-4">
        {topics.map((topic) => (
          <div
            key={topic.key}
            className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6"
          >
            {editingTopic?.key === topic.key ? (
              <TopicForm
                topic={topic}
                onSave={(updated) => {
                  setTopics(topics.map(t => t.key === topic.key ? updated : t));
                  setEditingTopic(null);
                }}
                onCancel={() => setEditingTopic(null)}
              />
            ) : (
              <TopicItem
                topic={topic}
                onEdit={() => setEditingTopic(topic)}
                onDelete={() => handleDelete(topic.key)}
                onToggleEnabled={() => handleToggleEnabled(topic.key)}
              />
            )}
          </div>
        ))}

        {isAdding && (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <TopicForm
              topic={{
                key: '',
                label: '',
                description: '',
                color: TOPIC_COLORS[0],
              }}
              onSave={(newTopic) => {
                setTopics([...topics, { ...newTopic, key: newTopic.key.toLowerCase().replace(/\s+/g, '-') }]);
                setIsAdding(false);
              }}
              onCancel={() => setIsAdding(false)}
            />
          </div>
        )}
      </div>

      {/* Success Message */}
      {saveSuccess && (
        <div className="mt-6 mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-center gap-3 animate-fadeIn">
          <div className="flex-shrink-0">
            <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-green-800 dark:text-green-200">
              {t('settings.topics.saved')}
            </p>
            <p className="text-xs text-green-700 dark:text-green-300 mt-0.5">
              {t('settings.topics.savedDescription')}
            </p>
          </div>
        </div>
      )}

      {/* Save/Cancel Buttons */}
      <div className="flex justify-end gap-3 pt-6 border-t border-gray-200 dark:border-gray-700">
        <button
          type="button"
          onClick={handleCancel}
          disabled={!hasChanges}
          className="px-6 py-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {t('settings.topics.cancel')}
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
              {t('settings.topics.saving')}
            </>
          ) : (
            t('settings.topics.saveChanges')
          )}
        </button>
      </div>
    </div>
  );
}

interface TopicItemProps {
  topic: TopicConfig;
  onEdit: () => void;
  onDelete: () => void;
  onToggleEnabled: () => void;
}

function TopicItem({ topic, onEdit, onDelete, onToggleEnabled }: TopicItemProps) {
  const { t } = useLanguage();
  const isEnabled = topic.enabled !== false; // Default to enabled if undefined

  return (
    <div className={`flex items-start justify-between ${!isEnabled ? 'opacity-60' : ''}`}>
      <div className="flex-1">
        <div className="flex items-center gap-3 mb-2">
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${topic.color} ${!isEnabled ? 'grayscale' : ''}`}>
            {topic.label}
          </span>
          <code className="text-xs text-gray-500 dark:text-gray-400">
            {topic.key}
          </code>
          {!isEnabled && (
            <span className="px-2 py-0.5 text-xs font-medium bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded">
              {t('settings.topics.disabled')}
            </span>
          )}
        </div>
        <p className={`text-sm ${!isEnabled ? 'text-gray-500' : 'text-gray-600 dark:text-gray-400'}`}>
          {topic.description}
        </p>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onToggleEnabled}
          className={`p-2 rounded-lg transition-colors ${
            isEnabled
              ? 'text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20'
              : 'text-gray-500 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
          title={isEnabled ? t('settings.topics.disable') : t('settings.topics.enable')}
        >
          <Power className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={onEdit}
          className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
        >
          <Pencil className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="p-2 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

interface TopicFormProps {
  topic: TopicConfig;
  onSave: (topic: TopicConfig) => void;
  onCancel: () => void;
}

function TopicForm({ topic, onSave, onCancel }: TopicFormProps) {
  const { t } = useLanguage();
  const [formData, setFormData] = useState<TopicConfig>(topic);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t('settings.topics.key')}
          </label>
          <input
            type="text"
            value={formData.key}
            onChange={(e) => setFormData({ ...formData, key: e.target.value })}
            placeholder={t('settings.topics.keyPlaceholder')}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {t('settings.topics.keyHelp')}
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t('settings.topics.label')}
          </label>
          <input
            type="text"
            value={formData.label}
            onChange={(e) => setFormData({ ...formData, label: e.target.value })}
            placeholder={t('settings.topics.labelPlaceholder')}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {t('settings.topics.labelHelp')}
          </p>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {t('settings.topics.topicDescription')}
        </label>
        <textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder={t('settings.topics.descriptionPlaceholder')}
          rows={3}
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        />
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          {t('settings.topics.descriptionHelp')}
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {t('settings.topics.badgeColor')}
        </label>
        <div className="grid grid-cols-4 gap-2">
          {TOPIC_COLORS.map((color) => (
            <button
              key={color}
              type="button"
              onClick={() => setFormData({ ...formData, color })}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                formData.color === color
                  ? 'ring-2 ring-blue-500 ring-offset-2'
                  : 'hover:opacity-80'
              } ${color}`}
            >
              {formData.color === color && '✓'}
            </button>
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
        >
          {t('settings.topics.cancel')}
        </button>
        <button
          type="button"
          onClick={() => onSave(formData)}
          disabled={!formData.key || !formData.label || !formData.description}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {t('settings.topics.saveTopic')}
        </button>
      </div>
    </div>
  );
}
