import { X, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useLanguage } from '../../contexts/LanguageContext';

interface AnalysisProgressDialogProps {
  isOpen: boolean;
  onClose: () => void;
  current: number;
  total: number;
  currentPaperTitle: string;
  status: 'analyzing' | 'completed' | 'error';
  failed?: number;
  onCancel?: () => void;
}

export function AnalysisProgressDialog({
  isOpen,
  onClose,
  current,
  total,
  currentPaperTitle,
  status,
  failed = 0,
  onCancel
}: AnalysisProgressDialogProps) {
  const { t } = useLanguage();

  if (!isOpen) return null;

  const progress = total > 0 ? (current / total) * 100 : 0;
  const isComplete = status === 'completed' || current === total;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md border border-gray-200 dark:border-gray-700 animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {t('analysis.progress.title')}
          </h2>
          {isComplete && (
            <button
              onClick={onClose}
              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Status Icon */}
          <div className="flex justify-center mb-6">
            {status === 'analyzing' && (
              <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-blue-600 dark:text-blue-400 animate-spin" />
              </div>
            )}
            {status === 'completed' && (
              <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
            )}
            {status === 'error' && (
              <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <XCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
              </div>
            )}
          </div>

          {/* Progress Text */}
          <div className="text-center mb-6">
            {status === 'analyzing' && (
              <>
                <p className="text-lg font-medium text-gray-900 dark:text-white mb-1">
                  {t('analysis.progress.analyzing')}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {current} / {total} {t('analysis.progress.papers')}
                </p>
              </>
            )}
            {status === 'completed' && (
              <>
                <p className="text-lg font-medium text-gray-900 dark:text-white mb-1">
                  {t('analysis.progress.completed')}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {t('analysis.progress.summary', {
                    analyzed: total - failed,
                    failed,
                    total
                  })}
                </p>
              </>
            )}
            {status === 'error' && (
              <>
                <p className="text-lg font-medium text-red-600 dark:text-red-400 mb-1">
                  {t('analysis.progress.error')}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {t('analysis.progress.summary', {
                    analyzed: current - failed,
                    failed,
                    total
                  })}
                </p>
              </>
            )}
          </div>

          {/* Current Paper (only show while analyzing) */}
          {status === 'analyzing' && currentPaperTitle && (
            <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                {t('analysis.progress.currentPaper')}
              </p>
              <p className="text-sm text-gray-900 dark:text-white line-clamp-2">
                {currentPaperTitle}
              </p>
            </div>
          )}

          {/* Progress Bar */}
          <div className="mb-2">
            <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  status === 'completed'
                    ? 'bg-green-500'
                    : status === 'error'
                    ? 'bg-red-500'
                    : 'bg-blue-500'
                }`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
            {Math.round(progress)}%
          </p>
        </div>

        {/* Footer */}
        <div className="flex justify-end p-6 border-t border-gray-200 dark:border-gray-700 gap-3">
          {status === 'analyzing' && onCancel && (
            <button
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
            >
              {t('analysis.progress.cancel')}
            </button>
          )}
          {isComplete && (
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
            >
              {t('common.done')}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
