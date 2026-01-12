import { SkeletonCard } from './SkeletonCard';
import { SkeletonListItem } from './SkeletonListItem';

interface LoadingSkeletonProps {
  view?: 'list' | 'grid';
  count?: number;
}

export function LoadingSkeleton({ view = 'list', count = 6 }: LoadingSkeletonProps) {
  if (view === 'grid') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: Math.min(count, 6) }).map((_, i) => (
          <div
            key={i}
            className="animate-fade-in"
            style={{
              animationDelay: `${i * 50}ms`,
              animationFillMode: 'both',
            }}
          >
            <SkeletonCard />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="animate-fade-in"
          style={{
            animationDelay: `${i * 50}ms`,
            animationFillMode: 'both',
          }}
        >
          <SkeletonListItem />
        </div>
      ))}
    </div>
  );
}
