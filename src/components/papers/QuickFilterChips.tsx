import { Calendar, Clock, Star, Code2, TrendingUp, Bookmark } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

interface QuickFilterChipsProps {
  onFilterChange: (filter: {
    dateRange?: 'today' | '7days' | '30days' | 'all' | null;
    fetchedDateRange?: 'today' | '7days' | '30days' | 'all' | null;
    minScore?: number | null;
    codeAvailable?: boolean | null;
    inCollection?: boolean | null;
  }) => void;
  currentFilters: {
    dateRange: 'today' | '7days' | '30days' | 'all' | null;
    fetchedDateRange: 'today' | '7days' | '30days' | 'all' | null;
    minScore: number | null;
    onlyWithCode: boolean;
    onlyInCollection: boolean;
  };
}

type QuickFilter = {
  id: string;
  label: string;
  icon: React.ReactNode;
  filter: {
    dateRange?: 'today' | '7days' | '30days' | 'all' | null;
    fetchedDateRange?: 'today' | '7days' | '30days' | 'all' | null;
    minScore?: number | null;
    codeAvailable?: boolean | null;
    inCollection?: boolean | null;
  };
  isActive: (current: QuickFilterChipsProps['currentFilters']) => boolean;
};

export function QuickFilterChips({ onFilterChange, currentFilters }: QuickFilterChipsProps) {
  const { t } = useLanguage();

  const quickFilters: QuickFilter[] = [
    {
      id: 'recent',
      label: t('papers.quickFilters.recent'),
      icon: <TrendingUp className="w-4 h-4" />,
      filter: { dateRange: '7days' },
      isActive: (current) => current.dateRange === '7days',
    },
    {
      id: 'today',
      label: t('papers.quickFilters.today'),
      icon: <Calendar className="w-4 h-4" />,
      filter: { dateRange: 'today' },
      isActive: (current) => current.dateRange === 'today',
    },
    {
      id: 'fetched-recent',
      label: t('papers.quickFilters.fetchedRecent'),
      icon: <Clock className="w-4 h-4" />,
      filter: { fetchedDateRange: '7days' },
      isActive: (current) => current.fetchedDateRange === '7days',
    },
    {
      id: 'fetched-today',
      label: t('papers.quickFilters.fetchedToday'),
      icon: <Clock className="w-4 h-4" />,
      filter: { fetchedDateRange: 'today' },
      isActive: (current) => current.fetchedDateRange === 'today',
    },
    {
      id: 'high-score',
      label: t('papers.quickFilters.highScore'),
      icon: <Star className="w-4 h-4" />,
      filter: { minScore: 70 },
      isActive: (current) => current.minScore !== null && current.minScore >= 70,
    },
    {
      id: 'with-code',
      label: t('papers.quickFilters.hasCode'),
      icon: <Code2 className="w-4 h-4" />,
      filter: { codeAvailable: true },
      isActive: (current) => current.onlyWithCode,
    },
    {
      id: 'in-collection',
      label: t('papers.quickFilters.inCollection'),
      icon: <Bookmark className="w-4 h-4" />,
      filter: { inCollection: true },
      isActive: (current) => current.onlyInCollection,
    },
  ];

  const handleFilterClick = (filter: QuickFilter) => {
    // Check if clicking the already active filter
    if (filter.isActive(currentFilters)) {
      // Deactivate: clear the filter
      if (filter.id === 'recent') {
        onFilterChange({ dateRange: null, minScore: null });
      } else if (filter.id === 'today') {
        onFilterChange({ dateRange: null, minScore: null });
      } else if (filter.id === 'fetched-recent') {
        onFilterChange({ fetchedDateRange: null });
      } else if (filter.id === 'fetched-today') {
        onFilterChange({ fetchedDateRange: null });
      } else if (filter.id === 'high-score') {
        onFilterChange({
          dateRange: (currentFilters.dateRange === 'today' || currentFilters.dateRange === '7days') ? currentFilters.dateRange : null,
          minScore: null
        });
      } else if (filter.id === 'with-code') {
        onFilterChange({ codeAvailable: false });
      } else if (filter.id === 'in-collection') {
        onFilterChange({ inCollection: false });
      }
    } else {
      // Activate: apply the filter
      if (filter.id === 'with-code') {
        onFilterChange({ codeAvailable: true });
      } else if (filter.id === 'in-collection') {
        onFilterChange({ inCollection: true });
      } else if (filter.id.startsWith('fetched-')) {
        // Set fetchedDateRange only
        onFilterChange({
          fetchedDateRange: filter.filter.fetchedDateRange,
        });
      } else {
        // Set dateRange and minScore without clearing fetchedDateRange
        onFilterChange({
          dateRange: filter.filter.dateRange ?? (filter.id === 'high-score' && currentFilters.dateRange !== 'all' ? currentFilters.dateRange : null),
          minScore: filter.filter.minScore ?? currentFilters.minScore,
        });
      }
    }
  };

  return (
    <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-2">
      <span className="text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
        {t('papers.quickFilters.title')}
      </span>
      <div className="flex gap-2">
        {quickFilters.map((filter) => {
          const isActive = filter.isActive(currentFilters);

          return (
            <button
              key={filter.id}
              onClick={() => handleFilterClick(filter)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-200 ease-out ${
                isActive
                  ? 'bg-blue-600 text-white shadow-md hover:bg-blue-700 scale-105'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 hover:scale-[1.02]'
              }`}
            >
              {filter.icon}
              <span>{filter.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
