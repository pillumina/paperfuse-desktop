import { X } from 'lucide-react';
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useLanguage } from '../../contexts/LanguageContext';

export type AnalysisMode = 'standard' | 'full';
export type AnalysisLanguage = 'zh' | 'en';

interface AnalysisModeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (mode: AnalysisMode, language: AnalysisLanguage) => void;
  paperCount?: number;
}

export function AnalysisModeDialog({
  isOpen,
  onClose,
  onConfirm,
  paperCount = 1
}: AnalysisModeDialogProps) {
  const { t } = useLanguage();
  const [selectedMode, setSelectedMode] = useState<AnalysisMode>('standard');
  const [selectedLanguage, setSelectedLanguage] = useState<AnalysisLanguage>('zh');

  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm(selectedMode, selectedLanguage);
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg border border-gray-200 dark:border-gray-700 animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {t('analysis.selectMode.title')}
          </h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {paperCount > 1 && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              {t('analysis.selectMode.analyzingPapers', { count: paperCount })}
            </p>
          )}

          {/* Language Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              {t('analysis.selectMode.languageLabel')}
            </label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setSelectedLanguage('zh')}
                className={`flex-1 px-4 py-2.5 text-sm font-medium rounded-lg border-2 transition-all ${
                  selectedLanguage === 'zh'
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                    : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                中文
              </button>
              <button
                type="button"
                onClick={() => setSelectedLanguage('en')}
                className={`flex-1 px-4 py-2.5 text-sm font-medium rounded-lg border-2 transition-all ${
                  selectedLanguage === 'en'
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                    : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                English
              </button>
            </div>
          </div>

          {/* Analysis Mode Selection */}
          <div className="space-y-3">
            {/* Standard Mode */}
            <button
              type="button"
              onClick={() => setSelectedMode('standard')}
              className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                selectedMode === 'standard'
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-5 h-5 mt-0.5 rounded-full border-2 flex items-center justify-center ${
                  selectedMode === 'standard'
                    ? 'border-blue-500 bg-blue-500'
                    : 'border-gray-300 dark:border-gray-600'
                }`}>
                  {selectedMode === 'standard' && (
                    <div className="w-2.5 h-2.5 bg-white rounded-full" />
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                    {t('analysis.selectMode.standard.title')}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {t('analysis.selectMode.standard.description')}
                  </p>
                  <ul className="mt-2 text-xs text-gray-500 dark:text-gray-500 space-y-1">
                    <li>• {t('analysis.selectMode.standard.feature1')}</li>
                    <li>• {t('analysis.selectMode.standard.feature2')}</li>
                    <li>• {t('analysis.selectMode.standard.feature3')}</li>
                  </ul>
                </div>
              </div>
            </button>

            {/* Full Mode */}
            <button
              type="button"
              onClick={() => setSelectedMode('full')}
              className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                selectedMode === 'full'
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-5 h-5 mt-0.5 rounded-full border-2 flex items-center justify-center ${
                  selectedMode === 'full'
                    ? 'border-blue-500 bg-blue-500'
                    : 'border-gray-300 dark:border-gray-600'
                }`}>
                  {selectedMode === 'full' && (
                    <div className="w-2.5 h-2.5 bg-white rounded-full" />
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                    {t('analysis.selectMode.full.title')}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {t('analysis.selectMode.full.description')}
                  </p>
                  <ul className="mt-2 text-xs text-gray-500 dark:text-gray-500 space-y-1">
                    <li>• {t('analysis.selectMode.full.feature1')}</li>
                    <li>• {t('analysis.selectMode.full.feature2')}</li>
                    <li>• {t('analysis.selectMode.full.feature3')}</li>
                    <li>• {t('analysis.selectMode.full.feature4')}</li>
                  </ul>
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            {t('common.cancel')}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
          >
            {t('analysis.selectMode.confirm')}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
