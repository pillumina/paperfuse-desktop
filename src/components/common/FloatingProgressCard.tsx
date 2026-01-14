import { useState } from 'react';
import { Clock, Loader2, X, ChevronDown, ChevronUp, CheckCircle, AlertCircle, RotateCcw, Square } from 'lucide-react';
import { useFetchProgress } from '../../contexts/FetchProgressContext';
import { invoke } from '@tauri-apps/api/core';

/**
 * 右下角浮动进度卡片
 * 显示详细的 fetch 进度信息，不占用顶部空间
 */
export function FloatingProgressCard() {
  const { isFetching, isCompleting, hasError, errorInfo, fetchStatus, fetchStartTime, stopFetching, setError } = useFetchProgress();
  const [isExpanded, setIsExpanded] = useState(false);

  // 计算进度和时间
  const progress = fetchStatus ? fetchStatus.progress * 100 : 0;
  const elapsedTime = fetchStartTime ? Date.now() - fetchStartTime : 0;
  const isCompleted = isCompleting || (fetchStatus && fetchStatus.status === 'completed');

  // 不在 fetching 时不渲染
  if (!isFetching && !isCompleting) {
    return null;
  }

  if (!fetchStatus) {
    return null;
  }

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
  };

  const handleCancel = async () => {
    console.log('[FloatingProgressCard] Cancel button clicked');
    try {
      await invoke('cancel_fetch');
      console.log('[FloatingProgressCard] cancel_fetch command succeeded');
    } catch (err) {
      console.error('[FloatingProgressCard] Failed to cancel fetch:', err);
    }
  };

  const handleDismiss = () => {
    // 完成后用户可以关闭卡片
    stopFetching();
  };

  // 根据状态确定颜色
  const getStatusColor = () => {
    if (hasError) return 'red';
    if (isCompleted) return 'green';
    return 'blue';
  };

  const color = getStatusColor();

  return (
    <div className="fixed bottom-6 right-6 z-40 animate-slide-up-fade">
      <div className={`
        bg-white dark:bg-gray-800 rounded-xl shadow-2xl border-2
        transition-all duration-300
        ${color === 'red' ? 'border-red-200 dark:border-red-800' : ''}
        ${color === 'green' ? 'border-green-200 dark:border-green-800' : ''}
        ${color === 'blue' ? 'border-blue-200 dark:border-blue-800' : ''}
        w-80
      `}>
        {/* Compact Header - Always Visible */}
        <div className="p-4">
          <div className="flex items-start justify-between mb-3">
            {/* Left: Icon + Status */}
            <div className="flex items-center gap-3">
              {hasError ? (
                <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                </div>
              ) : isCompleted ? (
                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
              ) : (
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <Loader2 className="w-5 h-5 text-blue-600 dark:text-blue-400 animate-spin" />
                </div>
              )}

              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  {hasError ? 'Fetch Failed' : isCompleted ? 'Fetch Complete' : 'Fetching Papers'}
                </p>
                <p className={`text-2xl font-bold ${color === 'red' ? 'text-red-600 dark:text-red-400' : color === 'green' ? 'text-green-600 dark:text-green-400' : 'text-blue-600 dark:text-blue-400'}`}>
                  {Math.round(progress)}%
                </p>
              </div>
            </div>

            {/* Right: Cancel/Expand buttons */}
            <div className="flex items-center gap-2">
              {!isCompleted && !hasError && (
                <button
                  onClick={handleCancel}
                  className="px-2.5 py-1.5 text-xs font-medium bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
                  title="Cancel"
                >
                  <Square className="w-3 h-3" />
                  <span>Cancel</span>
                </button>
              )}
              {(isCompleted || hasError) && (
                <button
                  onClick={handleDismiss}
                  className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  title="Dismiss"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden mb-3">
            <div
              className={`h-full transition-all duration-300 ease-out ${
                color === 'red' ? 'bg-red-500' : color === 'green' ? 'bg-green-500' : 'bg-blue-500'
              }`}
              style={{ width: `${hasError ? 100 : isCompleted ? 100 : progress}%` }}
            />
          </div>

          {/* Quick Stats - Always Visible */}
          {!hasError && (
            <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
              <span>
                <span className="font-semibold text-gray-900 dark:text-white">{fetchStatus.papers_saved}</span> saved
              </span>
              <span>·</span>
              <span>
                <span className="font-semibold text-gray-900 dark:text-white">{fetchStatus.papers_found}</span> found
              </span>
              <span>·</span>
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>{formatTime(elapsedTime)}</span>
              </div>
            </div>
          )}
        </div>

        {/* Expanded Details */}
        {isExpanded && (
          <div className="px-4 pb-4 border-t border-gray-200 dark:border-gray-700">
            <div className="pt-4 space-y-3 text-sm">

              {/* Error Message */}
              {hasError && errorInfo && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
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

              {/* Success Message */}
              {isCompleted && !hasError && (
                <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                    <p className="font-medium text-sm text-green-900 dark:text-green-100">
                      {fetchStatus.papers_saved > 0
                        ? `Successfully saved ${fetchStatus.papers_saved} paper${fetchStatus.papers_saved > 1 ? 's' : ''}!`
                        : 'No new papers to save'
                      }
                    </p>
                  </div>
                </div>
              )}

              {/* Detailed Stats */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-600 dark:text-gray-400">Papers Fetched</span>
                  <span className="font-semibold text-green-600 dark:text-green-400">{fetchStatus.papers_found}</span>
                </div>

                {fetchStatus.papers_analyzed > 0 && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-600 dark:text-gray-400">Analyzed</span>
                    <div className="flex items-center gap-2">
                      {isCompleted ? (
                        <CheckCircle className="w-3 h-3 text-green-600" />
                      ) : (
                        <Loader2 className="w-3 h-3 text-blue-600 animate-spin" />
                      )}
                      <span className={`font-semibold ${isCompleted ? 'text-green-600' : 'text-blue-600'}`}>
                        {fetchStatus.papers_analyzed}/{fetchStatus.papers_found}
                      </span>
                    </div>
                  </div>
                )}

                {fetchStatus.papers_saved > 0 && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-600 dark:text-gray-400">Saved</span>
                    <span className="font-semibold text-green-600 dark:text-green-400">{fetchStatus.papers_saved}</span>
                  </div>
                )}

                {fetchStatus.papers_filtered > 0 && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-600 dark:text-gray-400">Filtered</span>
                    <span className="font-semibold text-orange-600 dark:text-orange-400">{fetchStatus.papers_filtered}</span>
                  </div>
                )}

                {fetchStatus.papers_duplicates > 0 && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-600 dark:text-gray-400">Duplicates</span>
                    <span className="font-semibold text-gray-500 dark:text-gray-400">{fetchStatus.papers_duplicates}</span>
                  </div>
                )}

                {fetchStatus.papers_cache_hits > 0 && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-600 dark:text-gray-400">Cache Hits</span>
                    <span className="font-semibold text-purple-600 dark:text-purple-400">{fetchStatus.papers_cache_hits}</span>
                  </div>
                )}
              </div>

              {/* Error Count */}
              {fetchStatus.errors.length > 0 && (
                <div className="flex items-center justify-between text-xs pt-2 border-t border-gray-200 dark:border-gray-700">
                  <span className="text-gray-600 dark:text-gray-400">Errors</span>
                  <span className="font-semibold text-yellow-600 dark:text-yellow-400">{fetchStatus.errors.length}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
