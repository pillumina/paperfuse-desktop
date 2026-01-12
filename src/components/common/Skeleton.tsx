interface SkeletonProps {
  className?: string;
}

/**
 * Base Skeleton component with shimmer animation
 */
export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded ${className}`}
      aria-hidden="true"
    />
  );
}

/**
 * SkeletonCard - mimics a card layout
 */
export function SkeletonCard({ className = '' }: SkeletonProps) {
  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 ${className}`}
      aria-hidden="true"
    >
      <Skeleton className="h-4 w-3/4 mb-3" />
      <Skeleton className="h-3 w-1/2 mb-2" />
      <Skeleton className="h-3 w-full mb-2" />
      <Skeleton className="h-3 w-2/3" />
    </div>
  );
}

/**
 * SkeletonText - mimics text lines
 */
export function SkeletonText({
  lines = 3,
  className = '',
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <div className={`space-y-2 ${className}`} aria-hidden="true">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={`h-4 ${i === lines - 1 ? 'w-2/3' : 'w-full'}`}
        />
      ))}
    </div>
  );
}

/**
 * SkeletonList - mimics a list of items
 */
export function SkeletonList({
  items = 5,
  className = '',
}: {
  items?: number;
  className?: string;
}) {
  return (
    <div className={`space-y-3 ${className}`} aria-hidden="true">
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
          <Skeleton className="h-10 w-10 flex-shrink-0 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * SkeletonTable - mimics a table structure
 */
export function SkeletonTable({
  rows = 5,
  columns = 4,
  className = '',
}: {
  rows?: number;
  columns?: number;
  className?: string;
}) {
  return (
    <div className={`space-y-3 ${className}`} aria-hidden="true">
      {/* Header */}
      <div className="flex gap-3">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={`h-${i}`} className="h-8 flex-1" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={`r-${rowIndex}`} className="flex gap-3">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton key={`c-${colIndex}`} className="h-12 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

/**
 * LoadingSpinner - a centered loading spinner
 */
export function LoadingSpinner({
  size = 'md',
  className = '',
}: {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  return (
    <div
      className={`flex items-center justify-center ${className}`}
      aria-hidden="true"
    >
      <div
        className={`border-4 border-gray-200 dark:border-gray-700 border-t-blue-600 dark:border-t-blue-400 rounded-full ${sizeClasses[size]} animate-spin`}
      />
    </div>
  );
}

/**
 * PageLoading - full page loading state
 */
export function PageLoading() {
  return (
    <div className="flex items-center justify-center min-h-[50vh]" aria-hidden="true">
      <LoadingSpinner size="lg" />
    </div>
  );
}
