import { useState, useMemo } from 'react';
import { Clock, Loader2, Square, ChevronDown, ChevronUp, CheckCircle, Circle, AlertCircle, RotateCcw } from 'lucide-react';
import { useFetchProgress } from '../../contexts/FetchProgressContext';
import { invoke } from '@tauri-apps/api/core';

export function TopFetchProgressBar() {
  const { isFetching, isCompleting, hasError, errorInfo, fetchStatus, fetchStartTime, stopFetching, setError } = useFetchProgress();
  const [isExpanded, setIsExpanded] = useState(false);

  // Move useMemo here before any early returns
  const progress = fetchStatus ? fetchStatus.progress * 100 : 0;
  const elapsedTime = fetchStartTime ? Date.now() - fetchStartTime : 0;

  const isCompleted = isCompleting || (fetchStatus && fetchStatus.status === 'completed');
  const hasErrored = hasError;

  // Calculate estimated remaining time
  const estimatedTimeRemaining = useMemo(() => {
    if (!fetchStartTime || progress <= 0 || progress >= 100 || isCompleted || hasErrored) return null;
    const elapsed = Date.now() - fetchStartTime;
    const progressFraction = progress / 100;
    const totalEstimated = elapsed / progressFraction;
    const remaining = totalEstimated - elapsed;
    return remaining;
  }, [fetchStartTime, progress, isCompleted, hasErrored]);

  const handleCancel = async () => {
    try {
      await invoke('cancel_fetch');
    } catch (err) {
      console.error('Failed to cancel fetch:', err);
    }
  };

  // Event listeners are now handled globally by FetchProgressProvider
  // This component only displays the current state from context

  // Debug: log render state
  console.log('[TopFetchProgressBar] Render state:', {
    isFetching,
    isCompleting,
    hasFetchStatus: !!fetchStatus,
    willRender: !!(isFetching || isCompleting) && !!fetchStatus
  });

  // Don't render if not fetching AND not completing
  if (!isFetching && !isCompleting) {
    console.log('[TopFetchProgressBar] Not rendering: not fetching and not completing');
    return null;
  }

  // Don't render if no fetch status (fetch just started)
  if (!fetchStatus) {
    console.log('[TopFetchProgressBar] Not rendering: no fetch status');
    return null;
  }

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
    <div className={`fixed top-0 left-0 right-0 z-40 border-b shadow-lg transition-all duration-300 ${
      hasErrored
        ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
        : isCompleted
        ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
        : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
    }`}>
      {/* Compact bar - always visible */}
      <div className="px-4 py-2">
        <div className="flex items-center justify-between">
          {/* Left: Icon + Status + Progress */}
          <div className="flex items-center gap-3">
            {hasErrored ? (
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
            ) : isCompleted ? (
              <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
            ) : (
              <Loader2 className="w-5 h-5 text-blue-600 dark:text-blue-400 animate-spin flex-shrink-0" />
            )}

            <span className="text-sm font-semibold text-gray-900 dark:text-white">
              {hasErrored ? (
                'Failed'
              ) : isCompleted ? (
                'Completed'
              ) : (
                'Fetching'
              )}
            </span>

            {/* Progress percentage - prominent */}
            <span className={`text-lg font-bold ${
              hasErrored
                ? 'text-red-600 dark:text-red-400'
                : isCompleted
                ? 'text-green-600 dark:text-green-400'
                : 'text-blue-600 dark:text-blue-400'
            }`}>
              {Math.round(progress)}%
            </span>

            {/* Quick stats - inline */}
            {!hasErrored && (
              <span className="text-xs text-gray-600 dark:text-gray-400 hidden sm:inline">
                {fetchStatus.papers_saved} saved · {fetchStatus.papers_found} found
              </span>
            )}
          </div>

          {/* Right: Details toggle + Cancel button */}
          <div className="flex items-center gap-2">
            {/* Show Cancel button only when actively fetching */}
            {!isCompleted && !hasErrored && (
              <button
                onClick={handleCancel}
                className="px-3 py-1 text-xs font-medium bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center gap-1.5"
              >
                <Square className="w-3 h-3" />
                <span className="hidden sm:inline">Cancel</span>
              </button>
            )}

            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className={`text-xs font-semibold hover:opacity-80 transition-colors flex items-center gap-1 px-2 py-1 rounded-lg ${
                hasErrored
                  ? 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30'
                  : isCompleted
                  ? 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30'
                  : 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30'
              }`}
            >
              {isExpanded ? (
                <>
                  <span>Hide</span>
                  <ChevronUp className="w-4 h-4" />
                </>
              ) : (
                <>
                  <span>Details</span>
                  <ChevronDown className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>

        {/* Slim progress bar - always visible */}
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden mt-2">
          <div
            className={`h-full transition-all duration-300 ease-out ${
              hasErrored
                ? 'bg-red-600 dark:bg-red-500'
                : isCompleted
                ? 'bg-green-600 dark:bg-green-500'
                : 'bg-blue-600 dark:bg-blue-500'
            }`}
            style={{ width: `${hasErrored ? 100 : isCompleted ? 100 : progress}%` }}
          />
        </div>
      </div>

      {/* Expanded details panel */}
      {isExpanded && (
        <div className="px-4 pb-4 border-t border-gray-200 dark:border-gray-700">
          <div className="py-3 space-y-3 text-sm">

            {/* Error summary */}
            {hasErrored && errorInfo && (
              <div className="p-3 bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium text-sm text-red-900 dark:text-red-100">
                      {errorInfo.message || 'An error occurred while fetching papers'}
                    </p>
                    {errorInfo.error_type && (
                      <p className="text-xs text-red-700 dark:text-red-300 mt-1">
                        Error type: {errorInfo.error_type}
                      </p>
                    )}
                  </div>
                  {errorInfo.is_retryable && (
                    <button
                      onClick={async () => {
                        stopFetching();
                        setError(false, null);
                        setIsExpanded(false);
                        window.location.href = '/?openFetchDialog=true';
                      }}
                      className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 flex-shrink-0"
                    >
                      <RotateCcw className="w-3 h-3" />
                      Retry
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Completion summary */}
            {isCompleted && !hasErrored && (
              <div className="p-3 bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                  <p className="font-medium text-sm text-green-900 dark:text-green-100">
                    {fetchStatus.papers_saved > 0
                      ? `Successfully saved ${fetchStatus.papers_saved} paper${fetchStatus.papers_saved > 1 ? 's' : ''}!`
                      : 'No new papers to save'
                    }
                  </p>
                  {(fetchStatus.papers_duplicates > 0 || fetchStatus.papers_cache_hits > 0 || fetchStatus.papers_filtered > 0) && (
                    <p className="text-xs text-green-700 dark:text-green-300">
                      ({fetchStatus.papers_duplicates > 0 && `${fetchStatus.papers_duplicates} duplicates`}
                      {fetchStatus.papers_duplicates > 0 && fetchStatus.papers_cache_hits > 0 && ', '}
                      {fetchStatus.papers_cache_hits > 0 && `${fetchStatus.papers_cache_hits} cached`}
                      {((fetchStatus.papers_duplicates > 0 || fetchStatus.papers_cache_hits > 0) && fetchStatus.papers_filtered > 0) && ', '}
                      {fetchStatus.papers_filtered > 0 && `${fetchStatus.papers_filtered} filtered`})
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Progress steps - grid layout for better readability */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="flex items-center gap-2 text-xs text-green-600 dark:text-green-400">
                <CheckCircle className="w-4 h-4 flex-shrink-0" />
                <span><strong>{fetchStatus.papers_found}</strong> papers fetched</span>
              </div>

              {fetchStatus.papers_analyzed > 0 && (
                <div className={`flex items-center gap-2 text-xs ${
                  isCompleted
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-blue-600 dark:text-blue-400'
                }`}>
                  {isCompleted ? (
                    <CheckCircle className="w-4 h-4 flex-shrink-0" />
                  ) : (
                    <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />
                  )}
                  <span><strong>{isCompleted ? 'Analyzed' : 'Analyzing'}</strong> {fetchStatus.papers_analyzed}/{fetchStatus.papers_found}</span>
                </div>
              )}

              {fetchStatus.papers_saved > 0 && (
                <div className="flex items-center gap-2 text-xs text-green-600 dark:text-green-400">
                  <CheckCircle className="w-4 h-4 flex-shrink-0" />
                  <span><strong>{fetchStatus.papers_saved}</strong> saved</span>
                </div>
              )}

              {fetchStatus.papers_filtered > 0 && (
                <div className="flex items-center gap-2 text-xs text-orange-600 dark:text-orange-400">
                  <Circle className="w-4 h-4 flex-shrink-0" />
                  <span><strong>{fetchStatus.papers_filtered}</strong> filtered</span>
                </div>
              )}

              {fetchStatus.papers_duplicates > 0 && (
                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                  <Circle className="w-4 h-4 flex-shrink-0" />
                  <span><strong>{fetchStatus.papers_duplicates}</strong> duplicates</span>
                </div>
              )}

              {fetchStatus.papers_cache_hits > 0 && (
                <div className="flex items-center gap-2 text-xs text-purple-600 dark:text-purple-400">
                  <Circle className="w-4 h-4 flex-shrink-0" />
                  <span><strong>{fetchStatus.papers_cache_hits}</strong> cached</span>
                </div>
              )}

              {fetchStatus.async_mode && fetchStatus.active_tasks !== undefined && (
                <div className="flex items-center gap-2 text-xs text-purple-600 dark:text-purple-400">
                  <Circle className="w-4 h-4 flex-shrink-0" />
                  <span><strong>{fetchStatus.active_tasks}</strong> active workers</span>
                </div>
              )}

              {fetchStatus.errors.length > 0 && (
                <div className="flex items-center gap-2 text-xs text-yellow-600 dark:text-yellow-400">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span><strong>{fetchStatus.errors.length}</strong> errors</span>
                </div>
              )}
            </div>

            {/* Time info */}
            <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400 pt-2 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>Elapsed: <strong>{formatTime(elapsedTime)}</strong></span>
                </div>
                {estimatedTimeRemaining && (
                  <>
                    <span className="text-gray-400">|</span>
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>ETA: <strong>{formatTime(estimatedTimeRemaining)}</strong></span>
                    </div>
                  </>
                )}
                <span className="text-gray-400">·</span>
                <span>Started: {formatStartTime(fetchStartTime!)}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
