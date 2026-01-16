import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { TopicConfig } from '../../lib/types';
import { TOPIC_COLORS } from '../../lib/constants';
import { useLanguage } from '../../contexts/LanguageContext';
import '../../styles/animations.css';

interface TopicDialogProps {
  isOpen: boolean;
  topic: TopicConfig | null;
  onSave: (topic: TopicConfig) => void;
  onCancel: () => void;
}

export function TopicDialog({ isOpen, topic, onSave, onCancel }: TopicDialogProps) {
  const { t } = useLanguage();
  const [formData, setFormData] = useState<TopicConfig>(topic || {
    key: '',
    label: '',
    description: '',
    color: TOPIC_COLORS[0],
  });

  // Reset form when topic changes or dialog opens
  useEffect(() => {
    if (topic) {
      setFormData(topic);
    }
  }, [topic]);

  if (!isOpen) return null;

  const isEditing = !!topic?.key;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-enhanced"
        onClick={onCancel}
      />

      {/* Dialog */}
      <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden modal-content">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {isEditing ? t('settings.topics.editTopic') : t('settings.topics.addTopic')}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              {isEditing ? t('settings.topics.editTopicDescription') : t('settings.topics.addTopicDescription')}
            </p>
          </div>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 btn-interactive"
            title={t('common.buttons.close')}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          <div className="space-y-6">
            {/* Key and Label */}
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
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  autoFocus={!isEditing}
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
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  autoFocus={isEditing}
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {t('settings.topics.labelHelp')}
                </p>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('settings.topics.topicDescription')}
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder={t('settings.topics.descriptionPlaceholder')}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {t('settings.topics.descriptionHelp')}
              </p>
            </div>

            {/* Color Selection */}
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
                    className={`px-3 py-3 rounded-lg text-sm font-medium transition-all btn-interactive ${
                      formData.color === color
                        ? 'ring-2 ring-blue-500 ring-offset-2 scale-105'
                        : 'hover:opacity-80 hover:scale-105'
                    } ${color}`}
                  >
                    {formData.color === color ? '✓ ' : ''}
                    {color.split('-')[1]?.toUpperCase() || color}
                  </button>
                ))}
              </div>
            </div>

            {/* Preview */}
            {formData.label && (
              <div className="p-4 bg-gray-50 dark:bg-gray-900/30 rounded-lg border border-gray-200 dark:border-gray-700">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                  {t('settings.topics.preview')}
                </p>
                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${formData.color}`}>
                    {formData.label || t('settings.topics.label')}
                  </span>
                  <code className="text-xs text-gray-500 dark:text-gray-400">
                    {formData.key || 'key'}
                  </code>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30">
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 btn-interactive"
          >
            {t('settings.topics.cancel')}
          </button>
          <button
            type="button"
            onClick={() => onSave(formData)}
            disabled={!formData.key || !formData.label || !formData.description}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 btn-interactive"
          >
            {isEditing ? t('settings.topics.saveTopic') : t('settings.topics.addTopic')}
          </button>
        </div>
      </div>
    </div>
  );
}
