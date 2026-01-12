import { useState, useEffect } from 'react';
import { Loader2, Clock, X } from 'lucide-react';
import { useFetchProgress } from '../../contexts/FetchProgressContext';

export function FetchToast({ onOpenDialog }: { onOpenDialog: () => void }) {
  const { isFetching, fetchStatus, fetchStartTime } = useFetchProgress();
  const [dismissed, setDismissed] = useState(false);

  // Reset dismissed state when fetch starts
  useEffect(() => {
    if (isFetching) {
      setDismissed(false);
    }
  }, [isFetching]);

  // Don't render if not fetching or was dismissed
  if (!isFetching || dismissed) {
    return null;
  }

  const progress = fetchStatus ? Math.round(fetchStatus.progress * 100) : 0;
  const elapsedTime = fetchStartTime ? Date.now() - fetchStartTime : 0;

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
  };

  const formatStartTime = (time: number) => {
    const date = new Date(time);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="fixed top-4 right-4 z-50 animate-slide-in-from-right">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden min-w-[320px] max-w-md">
        {/* Header with dismiss button */}
        <div className="flex items-center justify-between px-4 py-2 bg-blue-50 dark:bg-blue-900/30 border-b border-blue-200 dark:border-blue-800">
          <div className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 text-blue-600 dark:text-blue-400 animate-spin" />
            <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
              Fetching Papers...
            </span>
          </div>
          <button
            onClick={() => setDismissed(true)}
            className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {/* Progress bar */}
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden mb-3">
            <div
              className="bg-blue-600 h-full transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Status text */}
          <p className="text-sm text-gray-700 dark:text-gray-300 mb-1">
            {fetchStatus?.current_step || 'Initializing...'}
          </p>

          {/* Time info */}
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>{formatTime(elapsedTime)}</span>
            </div>
            <span>started {formatStartTime(fetchStartTime!)}</span>
          </div>

          {/* Quick stats */}
          {fetchStatus && (
            <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
              <div className="text-center">
                <p className="text-lg font-semibold text-green-600 dark:text-green-400">
                  {fetchStatus.papers_saved}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Saved</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {fetchStatus.papers_found}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Found</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-semibold text-blue-600 dark:text-blue-400">
                  {progress}%
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Progress</p>
              </div>
            </div>
          )}

          {/* View details button */}
          <button
            onClick={onOpenDialog}
            className="w-full mt-3 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            View Details
          </button>
        </div>
      </div>

      {/* Animation keyframes */}
      <style>{`
        @keyframes slide-in-from-right {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        .animate-slide-in-from-right {
          animation: slide-in-from-right 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
