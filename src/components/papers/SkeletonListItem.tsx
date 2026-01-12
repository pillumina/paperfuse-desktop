/**
 * SkeletonListItem - Loading placeholder for PaperListItem
 * Mimics the PaperListItem layout with animated shimmer effect
 */

export function SkeletonListItem() {
  return (
    <div className="border rounded-xl bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 p-4">
      <div className="flex items-start gap-4">
        {/* Chevron placeholder */}
        <div className="skeleton-element flex-shrink-0 mt-1 w-5 h-5 rounded"></div>

        {/* Checkbox placeholder */}
        <div className="skeleton-element flex-shrink-0 mt-1 w-5 h-5 rounded"></div>

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-2">
          {/* Title */}
          <div className="skeleton-element h-5 rounded w-3/4"></div>
          <div className="skeleton-element h-5 rounded w-1/2"></div>

          {/* Metadata */}
          <div className="skeleton-element h-4 rounded w-1/3 mt-2"></div>
          <div className="skeleton-element h-4 rounded w-1/4"></div>

          {/* Topics */}
          <div className="mt-2 flex flex-wrap gap-1.5">
            <div className="skeleton-element h-6 w-20 rounded-full"></div>
            <div className="skeleton-element h-6 w-24 rounded-full"></div>
          </div>

          {/* Tags */}
          <div className="mt-2 flex flex-wrap gap-2">
            <div className="skeleton-element h-5 w-16 rounded-full"></div>
            <div className="skeleton-element h-5 w-20 rounded-full"></div>
            <div className="skeleton-element h-5 w-24 rounded-full"></div>
          </div>
        </div>

        {/* Actions placeholder */}
        <div className="skeleton-element flex-shrink-0 w-8 h-8 rounded"></div>
      </div>
    </div>
  );
}
