import { useMemo } from 'react';
import { useFetchProgress } from '../../contexts/FetchProgressContext';

/**
 * 顶部细条进度条 - 只有 2px 高，不遮挡任何按钮
 * 类似 Chrome/Safari 的加载进度条
 */
export function SlimProgressBar() {
  const { isFetching, isCompleting, fetchStatus, hasError } = useFetchProgress();

  // 计算进度百分比
  const progress = useMemo(() => {
    if (!fetchStatus) return 0;
    return Math.round(fetchStatus.progress * 100);
  }, [fetchStatus]);

  // 判断是否应该显示
  const shouldShow = isFetching || isCompleting;

  // 不在 fetching 时不渲染
  if (!shouldShow) {
    return null;
  }

  // 根据状态选择颜色
  const getColorClass = () => {
    if (hasError) return 'bg-red-500';
    if (isCompleting) return 'bg-green-500';
    return 'bg-blue-500';
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-50 pointer-events-none">
      {/* 2px 高的细条进度 */}
      <div className="w-full h-0.5 bg-gray-200 dark:bg-gray-700">
        <div
          className={`h-full transition-all duration-300 ease-out ${getColorClass()}`}
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* 进度文字 - 可选的小标签 */}
      {progress > 0 && progress < 100 && (
        <div className="absolute top-1 right-4">
          <span className={`text-xs font-medium ${hasError ? 'text-red-600 dark:text-red-400' : isCompleting ? 'text-green-600 dark:text-green-400' : 'text-blue-600 dark:text-blue-400'}`}>
            {progress}%
          </span>
        </div>
      )}
    </div>
  );
}
