import { useState, useEffect } from 'react';
import { Filter, X, ChevronDown, ChevronUp, Search, Building2 } from 'lucide-react';
import { getTopicColor } from '../../lib/topics';
import type { TopicConfig, TagWithCount } from '../../lib/types';
import { useLanguage } from '../../contexts/LanguageContext';

interface AffiliationWithCount {
  affiliation: string;
  count: number;
}

interface PaperFiltersProps {
  selectedTag: string | null;
  onTagChange: (tag: string | null) => void;
  selectedTopic: string | null;
  onTopicChange: (topic: string | null) => void;
  selectedAffiliation: string | null;
  onAffiliationChange: (affiliation: string | null) => void;
  minScore: number | null;
  onScoreChange: (score: number | null) => void;
  dateRange: 'today' | '7days' | '30days' | 'all' | null;
  onDateRangeChange: (range: 'today' | '7days' | '30days' | 'all' | null) => void;
  fetchedDateRange: 'today' | '7days' | '30days' | 'all' | null;
  onFetchedDateRangeChange: (range: 'today' | '7days' | '30days' | 'all' | null) => void;
  topics: TopicConfig[];
  tagsWithCounts?: TagWithCount[];
  affiliationsWithCounts?: AffiliationWithCount[];
  tagsLoading?: boolean;
}

export function PaperFilters({
  selectedTag,
  onTagChange,
  selectedTopic,
  onTopicChange,
  selectedAffiliation,
  onAffiliationChange,
  minScore,
  onScoreChange,
  dateRange,
  onDateRangeChange,
  fetchedDateRange,
  onFetchedDateRangeChange,
  topics,
  tagsWithCounts = [],
  affiliationsWithCounts = [],
  tagsLoading = false,
}: PaperFiltersProps) {
  const { t } = useLanguage();
  const [isExpanded, setIsExpanded] = useState(false);
  const [tagSearchQuery, setTagSearchQuery] = useState('');
  const [localMinScore, setLocalMinScore] = useState(minScore ?? 0);

  // Debounce score changes
  useEffect(() => {
    const timer = setTimeout(() => {
      onScoreChange(localMinScore === 0 ? null : localMinScore);
    }, 300); // 300ms debounce

    return () => clearTimeout(timer);
  }, [localMinScore, onScoreChange]);

  // Update local score when prop changes
  useEffect(() => {
    setLocalMinScore(minScore ?? 0);
  }, [minScore]);

  // Filter tags by search query
  const filteredTags = tagsWithCounts
    .filter(tagWithCount =>
      tagSearchQuery === '' ||
      tagWithCount.tag.toLowerCase().includes(tagSearchQuery.toLowerCase())
    )
    .slice(0, isExpanded ? undefined : 5);

  // Filter topics to only show enabled ones
  const enabledTopics = topics.filter(topic => topic.enabled !== false);

  const hasActiveFilters = selectedTag || selectedTopic || selectedAffiliation || minScore !== null || dateRange || fetchedDateRange;

  const handleClearAll = () => {
    onTagChange(null);
    onTopicChange(null);
    onAffiliationChange(null);
    onScoreChange(null);
    onDateRangeChange(null);
    onFetchedDateRangeChange(null);
  };

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-500" />
          <h3 className="font-medium text-gray-900 dark:text-white">{t('papers.filters.title')}</h3>
          {hasActiveFilters && (
            <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 text-xs font-medium rounded-full">
              {t('papers.filters.active')}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {hasActiveFilters && (
            <button
              onClick={handleClearAll}
              className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 cursor-pointer transition-colors duration-200"
            >
              {t('papers.filters.clearAll')}
            </button>
          )}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 cursor-pointer transition-colors duration-200"
          >
            {isExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Filters (always visible summary, full details when expanded) */}
      <div className="space-y-4">
        {/* Topics Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t('papers.filters.topics')}
          </label>
          {selectedTopic ? (
            <div className="flex items-center gap-2 p-2.5 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg">
              <code className={`text-sm px-2 py-0.5 rounded font-medium ${
                getTopicColor(selectedTopic)
              }`}>
                {selectedTopic}
              </code>
              <button
                onClick={() => onTopicChange(null)}
                className="text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-300"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : enabledTopics.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {enabledTopics.map((topic) => (
                <button
                  key={topic.key}
                  onClick={() => onTopicChange(topic.key)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-mono transition-all duration-200 cursor-pointer ${getTopicColor(topic.key)} hover:opacity-80 active:scale-95`}
                  title={topic.label}
                >
                  {topic.key}
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400 italic">
              {t('papers.filters.noTopicsConfigured')}
            </p>
          )}
        </div>

        {/* Tag Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t('papers.filters.tags')}
            {!selectedTag && tagsWithCounts.length > 0 && (
              <span className="text-xs text-gray-500 dark:text-gray-400 font-normal ml-2">
                {t('papers.filters.total', { count: tagsWithCounts.length })}
              </span>
            )}
          </label>
          {selectedTag ? (
            <div className="flex items-center gap-2 p-2.5 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <span className="text-sm text-blue-800 dark:text-blue-300">{selectedTag}</span>
              <button
                onClick={() => onTagChange(null)}
                className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <>
              {/* Search input for tags */}
              <div className="relative mb-2">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder={t('papers.filters.searchTags')}
                  value={tagSearchQuery}
                  onChange={(e) => setTagSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200"
                />
                {tagSearchQuery && (
                  <button
                    onClick={() => setTagSearchQuery('')}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Tags list */}
              {tagsLoading ? (
                <div className="flex items-center gap-2 py-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400"></div>
                  <span className="text-sm text-gray-500 dark:text-gray-400">{t('papers.filters.loadingTags')}</span>
                </div>
              ) : filteredTags.length > 0 ? (
                <>
                  <div className={`space-y-1 ${!isExpanded && tagSearchQuery === '' ? 'max-h-32 overflow-hidden' : ''}`}>
                    {filteredTags.map((tagWithCount) => (
                      <button
                        key={tagWithCount.tag}
                        onClick={() => onTagChange(tagWithCount.tag)}
                        className="block w-full text-left px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors flex items-center justify-between cursor-pointer"
                      >
                        <span>{tagWithCount.tag}</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {tagWithCount.count}
                        </span>
                      </button>
                    ))}
                  </div>

                  {/* Show more/less when not searching */}
                  {tagSearchQuery === '' && tagsWithCounts.length > 5 && (
                    <button
                      onClick={() => setIsExpanded(!isExpanded)}
                      className="mt-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 cursor-pointer transition-colors duration-200"
                    >
                      {isExpanded ? t('papers.filters.showLess') : t('papers.filters.showAll', { count: tagsWithCounts.length })}
                    </button>
                  )}

                  {/* Show search result count */}
                  {tagSearchQuery && (
                    <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                      {t('papers.filters.tagsFound', { count: filteredTags.length, plural: filteredTags.length !== 1 ? 's' : '' }).replace('{{plural}}', filteredTags.length !== 1 ? 's' : '')}
                    </p>
                  )}
                </>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                  {tagSearchQuery ? t('papers.filters.noMatchingTags') : t('papers.filters.noTagsAvailable')}
                </p>
              )}
            </>
          )}
        </div>

        {/* Score Filter (only when expanded) */}
        {isExpanded && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('papers.filters.minimumRelevanceScore')}
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="0"
                max="10"
                step="1"
                value={localMinScore}
                onChange={(e) => setLocalMinScore(Number(e.target.value))}
                className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
              />
              <span className="text-sm font-medium text-gray-900 dark:text-white w-12 text-center">
                {localMinScore === 0 ? t('papers.filters.all') : localMinScore}
              </span>
            </div>
            {localMinScore !== (minScore ?? 0) && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {t('papers.filters.updatingFilters')}
              </p>
            )}
          </div>
        )}

        {/* Date Range Filter (only when expanded) */}
        {isExpanded && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('papers.filters.dateRange')}
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: 'today', label: t('papers.filters.today') },
                { value: '7days', label: t('papers.filters.last7Days') },
                { value: '30days', label: t('papers.filters.last30Days') },
                { value: 'all', label: t('papers.filters.allTime') },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() =>
                    onDateRangeChange(dateRange === option.value ? null : option.value as any)
                  }
                  className={`px-3 py-2 text-sm rounded-lg border transition-all duration-200 cursor-pointer ${
                    dateRange === option.value
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                      : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Fetched Date Range Filter (only when expanded) */}
        {isExpanded && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('papers.filters.fetchedDateRange')}
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: 'today', label: t('papers.filters.fetchedToday') },
                { value: '7days', label: t('papers.filters.fetchedLast7Days') },
                { value: '30days', label: t('papers.filters.fetchedLast30Days') },
                { value: 'all', label: t('papers.filters.fetchedAllTime') },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() =>
                    onFetchedDateRangeChange(fetchedDateRange === option.value ? null : option.value as any)
                  }
                  className={`px-3 py-2 text-sm rounded-lg border transition-all duration-200 cursor-pointer ${
                    fetchedDateRange === option.value
                      ? 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                      : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Affiliation Filter (only when expanded) */}
        {isExpanded && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <Building2 className="inline w-4 h-4 mr-1" />
              {t('papers.filters.affiliation')}
            </label>
            {selectedAffiliation ? (
              <div className="flex items-center gap-2 p-2 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
                <span className="text-sm text-orange-800 dark:text-orange-300">{selectedAffiliation}</span>
                <button
                  onClick={() => onAffiliationChange(null)}
                  className="text-orange-600 hover:text-orange-800 dark:text-orange-400 dark:hover:text-orange-300"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <>
                {affiliationsWithCounts && affiliationsWithCounts.length > 0 ? (
                  <div className={`space-y-1 ${!isExpanded ? 'max-h-32 overflow-hidden' : ''}`}>
                    {affiliationsWithCounts.slice(0, isExpanded ? undefined : 5).map((affiliationWithCount) => (
                      <button
                        key={affiliationWithCount.affiliation}
                        onClick={() => onAffiliationChange(affiliationWithCount.affiliation)}
                        className="block w-full text-left px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors flex items-center justify-between cursor-pointer"
                      >
                        <div className="flex items-center gap-2 truncate flex-1">
                          <Building2 className="w-3.5 h-3.5 flex-shrink-0 text-gray-400" />
                          <span className="truncate">{affiliationWithCount.affiliation}</span>
                        </div>
                        <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                          {affiliationWithCount.count}
                        </span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                    {t('papers.filters.noAffiliationsAvailable')}
                  </p>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
