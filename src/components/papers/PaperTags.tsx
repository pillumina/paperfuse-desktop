import { Tag } from 'lucide-react';

interface PaperTagsProps {
  tags: string[];
  maxTags?: number;
  clickable?: boolean;
  onTagClick?: (tag: string) => void;
}

export function PaperTags({
  tags,
  maxTags = 3,
  clickable = false,
  onTagClick,
}: PaperTagsProps) {
  if (!tags || tags.length === 0) {
    return null;
  }

  const displayedTags = tags.slice(0, maxTags);
  const remainingCount = tags.length - maxTags;

  const getTagColor = (tag: string) => {
    // Generate consistent color based on tag string
    const colors = [
      'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
      'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300',
      'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
      'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300',
    ];

    let hash = 0;
    for (let i = 0; i < tag.length; i++) {
      hash = tag.charCodeAt(i) + ((hash << 5) - hash);
    }

    return colors[Math.abs(hash) % colors.length];
  };

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <Tag className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
      <div className="flex gap-1.5 flex-wrap">
        {displayedTags.map((tag, index) => (
          <span
            key={index}
            className={`px-2 py-0.5 rounded-full text-xs font-medium ${getTagColor(
              tag
            )} ${
              clickable
                ? 'cursor-pointer hover:opacity-80 transition-opacity'
                : ''
            }`}
            onClick={() => clickable && onTagClick?.(tag)}
          >
            {tag}
          </span>
        ))}
        {remainingCount > 0 && (
          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
            +{remainingCount}
          </span>
        )}
      </div>
    </div>
  );
}
