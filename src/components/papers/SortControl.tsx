import { Calendar, Clock, Star, Type, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

interface SortControlProps {
  sortBy: 'date' | 'fetchedDate' | 'score' | 'title';
  sortOrder: 'asc' | 'desc';
  onSortByChange: (sortBy: 'date' | 'fetchedDate' | 'score' | 'title') => void;
  onSortOrderChange: (sortOrder: 'asc' | 'desc') => void;
}

export function SortControl({
  sortBy,
  sortOrder,
  onSortByChange,
  onSortOrderChange,
}: SortControlProps) {
  const { t } = useLanguage();

  const sortOptions = [
    { value: 'date' as const, label: t('papers.sortControl.publishedDate'), icon: Calendar },
    { value: 'fetchedDate' as const, label: t('papers.sortControl.fetchedDate'), icon: Clock },
    { value: 'score' as const, label: t('papers.sortControl.score'), icon: Star },
    { value: 'title' as const, label: t('papers.sortControl.title'), icon: Type },
  ];

  return (
    <div className="flex items-center gap-3 flex-wrap">
      {/* Sort By Label */}
      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
        <ArrowUpDown className="w-4 h-4" />
        <span className="font-medium">{t('papers.sortControl.sortBy')}</span>
      </div>

      {/* Sort Options - Button Group */}
      <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
        {sortOptions.map((option) => {
          const Icon = option.icon;
          const isActive = sortBy === option.value;

          return (
            <button
              key={option.value}
              onClick={() => onSortByChange(option.value)}
              className={`
                flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                ${isActive
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }
              `}
            >
              <Icon className="w-4 h-4" />
              <span>{option.label}</span>
            </button>
          );
        })}
      </div>

      {/* Sort Order Toggle */}
      <button
        onClick={() => onSortOrderChange(sortOrder === 'asc' ? 'desc' : 'asc')}
        className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        title={sortOrder === 'desc' ? t('papers.sortControl.descendingTooltip') : t('papers.sortControl.ascendingTooltip')}
      >
        {sortOrder === 'desc' ? (
          <>
            <ArrowDown className="w-4 h-4" />
            <span>{t('papers.sortControl.descending')}</span>
          </>
        ) : (
          <>
            <ArrowUp className="w-4 h-4" />
            <span>{t('papers.sortControl.ascending')}</span>
          </>
        )}
      </button>
    </div>
  );
}
