/**
 * SkeletonCard - Loading placeholder for PaperCard
 * Mimics the PaperCard layout with animated shimmer effect
 */

export function SkeletonCard() {
  return (
    <div className="relative p-6 pl-10 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
      {/* Selection Checkbox placeholder - always visible */}
      <div className="absolute top-3 left-3 w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-700 animate-pulse"></div>

      {/* Title */}
      <div className="mb-3 space-y-2">
        <div className="skeleton-element h-6 rounded w-3/4"></div>
        <div className="skeleton-element h-6 rounded w-1/2"></div>

        {/* Code Badge placeholder */}
        <div className="skeleton-element h-6 w-16 rounded-full mt-2"></div>

        {/* Topics placeholders */}
        <div className="mt-2 flex flex-wrap gap-1.5">
          <div className="skeleton-element h-6 w-20 rounded-full"></div>
          <div className="skeleton-element h-6 w-24 rounded-full"></div>
        </div>
      </div>

      {/* Metadata */}
      <div className="mb-3 space-y-1.5">
        <div className="skeleton-element h-4 rounded w-1/3"></div>
        <div className="skeleton-element h-4 rounded w-1/4"></div>
      </div>

      {/* Summary */}
      <div className="mb-4 space-y-2">
        <div className="skeleton-element h-4 rounded"></div>
        <div className="skeleton-element h-4 rounded w-5/6"></div>
        <div className="skeleton-element h-4 rounded w-4/6"></div>
      </div>

      {/* Tags */}
      <div className="mb-4 space-y-2">
        <div className="skeleton-element h-5 w-16 rounded-full"></div>
        <div className="skeleton-element h-5 w-20 rounded-full"></div>
        <div className="skeleton-element h-5 w-24 rounded-full"></div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-700">
        <div className="skeleton-element h-5 w-24 rounded-full"></div>
        <div className="skeleton-element h-8 w-16 rounded-full"></div>
      </div>
    </div>
  );
}
