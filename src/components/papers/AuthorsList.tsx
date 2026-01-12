import { Users, Building2, ChevronDown, ChevronUp } from 'lucide-react';
import type { AuthorInfo } from '../../lib/types';
import { useLanguage } from '../../contexts/LanguageContext';
import { useState } from 'react';

interface AuthorsListProps {
  authors: AuthorInfo[];
  compact?: boolean;
}

const SHOW_THRESHOLD = 5; // Show more than 5 authors collapsed by default

export function AuthorsList({ authors, compact = false }: AuthorsListProps) {
  const { t } = useLanguage();
  const [isExpanded, setIsExpanded] = useState(false);

  if (!authors || authors.length === 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
        <Users className="w-4 h-4" />
        <span className="italic">{t('papers.detail.metadata.unknownAuthors')}</span>
      </div>
    );
  }

  if (compact) {
    // Compact view: show only first few authors without affiliations
    const displayAuthors = authors.slice(0, 2);
    const remainingCount = authors.length - 2;

    return (
      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
        <Users className="w-4 h-4 flex-shrink-0" />
        <span className="truncate" title={authors.map(a => a.name).join(', ')}>
          {displayAuthors.map(a => a.name).join(', ')}
          {remainingCount > 0 && (
            <span className="ml-1">
              {t('papers.detail.metadata.moreAuthors', { count: remainingCount })}
            </span>
          )}
        </span>
      </div>
    );
  }

  // Full view: show authors with collapsible functionality
  const shouldCollapse = authors.length > SHOW_THRESHOLD;
  const displayAuthors = shouldCollapse && !isExpanded
    ? authors.slice(0, SHOW_THRESHOLD)
    : authors;
  const hiddenCount = shouldCollapse && !isExpanded
    ? authors.length - SHOW_THRESHOLD
    : 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
          <Users className="w-4 h-4" />
          <span>{authors.length} {authors.length === 1 ? 'Author' : 'Authors'}</span>
        </div>

        {shouldCollapse && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
          >
            {isExpanded ? (
              <>
                <span>Show less</span>
                <ChevronUp className="w-4 h-4" />
              </>
            ) : (
              <>
                <span>Show {hiddenCount} more</span>
                <ChevronDown className="w-4 h-4" />
              </>
            )}
          </button>
        )}
      </div>

      <div className="space-y-2">
        {displayAuthors.map((author, index) => (
          <div
            key={index}
            className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-750 transition-colors"
          >
            <div className="flex-shrink-0 w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
              <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="font-medium text-gray-900 dark:text-gray-100">
                {author.name}
              </div>

              {author.affiliation && (
                <div className="flex items-center gap-1.5 mt-1 text-sm text-gray-600 dark:text-gray-400">
                  <Building2 className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="truncate">{author.affiliation}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
