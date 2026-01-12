import { useState, useEffect, useCallback, useRef, memo, forwardRef } from 'react';
import { Search, X, Loader2, Clock, Trash2, Hash, Tag as TagIcon } from 'lucide-react';
import { useSearchHistory } from '../../hooks/useSearchHistory';
import { useSearchSuggestions, SuggestionItem } from '../../hooks/useSearchSuggestions';
import { useLanguage } from '../../contexts/LanguageContext';

interface PaperSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  isSearching?: boolean;
}

const PaperSearchBarComponent = forwardRef<HTMLInputElement, PaperSearchBarProps>(({
  value,
  onChange,
  isSearching = false,
}, ref) => {
  const { t } = useLanguage();
  const [localValue, setLocalValue] = useState(value);
  const [showHistory, setShowHistory] = useState(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const hadFocusRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const { history, addHistoryItem, removeHistoryItem, clearHistory } = useSearchHistory();
  const suggestions = useSearchSuggestions(localValue, 5);

  // Forward ref logic
  useEffect(() => {
    if (typeof ref === 'function') {
      ref(inputRef.current);
    } else if (ref) {
      ref.current = inputRef.current;
    }
  }, [ref]);

  // Track focus state
  const handleFocus = () => {
    hadFocusRef.current = true;
    setShowHistory(true);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    // Delay hiding history to allow clicking on history items
    setTimeout(() => {
      if (!containerRef.current?.contains(document.activeElement)) {
        setShowHistory(false);
        hadFocusRef.current = false;
      }
    }, 200);

    // Only allow blur if user is explicitly clicking outside the search area
    // This prevents programmatic blur during re-renders
    const relatedTarget = e.relatedTarget as HTMLElement;

    // If blur happens without a related target (programmatic blur during re-render)
    // and user was actively using the input, restore focus immediately
    if (!relatedTarget && hadFocusRef.current && !showHistory) {
      e.preventDefault();
      setTimeout(() => {
        if (hadFocusRef.current && inputRef.current) {
          inputRef.current.focus();
        }
      }, 0);
      return;
    }

    // User clicked somewhere else (has relatedTarget), allow blur
    if (!relatedTarget || !containerRef.current?.contains(relatedTarget)) {
      hadFocusRef.current = false;
    }
  };

  // Track previous parent value to detect external changes
  const previousValueRef = useRef(value);

  // Only sync from parent when value changes externally (e.g., clear from outside)
  // This prevents overwriting user's input while parent's value hasn't updated yet
  useEffect(() => {
    // If parent value changed externally (not through our typing)
    if (value !== previousValueRef.current) {
      // Only sync if user is not currently typing
      // (localValue matches what we expect from previous parent value)
      if (localValue === previousValueRef.current || localValue === '') {
        setLocalValue(value);
      }
      previousValueRef.current = value;
    }
  }, [value, localValue]);

  // Aggressively restore focus after any re-render
  // This runs after EVERY render (no dependency array)
  useEffect(() => {
    if (hadFocusRef.current && inputRef.current && document.activeElement !== inputRef.current) {
      // Use setTimeout to ensure this runs after React finishes rendering
      const timeoutId = setTimeout(() => {
        if (hadFocusRef.current && inputRef.current) {
          inputRef.current.focus();
        }
      }, 0);
      return () => clearTimeout(timeoutId);
    }
  });

  // Debounced onChange with 300ms delay
  const debouncedOnChange = useCallback((newValue: string) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      onChange(newValue);
    }, 300); // 300ms debounce delay
  }, [onChange]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const handleChange = (newValue: string) => {
    setLocalValue(newValue);
    debouncedOnChange(newValue);
  };

  const handleClear = () => {
    setLocalValue('');
    onChange(''); // Clear immediately without debounce
    inputRef.current?.focus(); // Keep focus on input after clearing
  };

  const handleHistoryItemClick = (query: string) => {
    setLocalValue(query);
    onChange(query); // Trigger search immediately
    addHistoryItem(query); // Add to history
    setShowHistory(false);
    inputRef.current?.focus();
  };

  const handleSuggestionClick = (suggestion: SuggestionItem) => {
    let searchQuery = suggestion.text;

    // For tag search, prepend "tag:"
    if (suggestion.type === 'tag') {
      searchQuery = `tag:${suggestion.text}`;
    }

    setLocalValue(searchQuery);
    onChange(searchQuery);
    addHistoryItem(searchQuery);
    setShowHistory(false);
    inputRef.current?.focus();
  };

  const getSuggestionIcon = (type: SuggestionItem['type']) => {
    switch (type) {
      case 'tag':
        return <TagIcon className="w-4 h-4 text-green-500" />;
      case 'topic':
        return <Hash className="w-4 h-4 text-purple-500" />;
      case 'recent':
      case 'popular':
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getSuggestionTypeLabel = (type: SuggestionItem['type']) => {
    switch (type) {
      case 'tag':
        return t('papers.searchBar.typeTag');
      case 'topic':
        return t('papers.searchBar.typeTopic');
      case 'recent':
        return t('papers.searchBar.typeRecent');
      case 'popular':
        return t('papers.searchBar.typePopular');
      default:
        return '';
    }
  };

  const handleHistoryItemDelete = (e: React.MouseEvent, query: string) => {
    e.stopPropagation();
    removeHistoryItem(query);
  };

  const handleClearHistory = () => {
    clearHistory();
  };

  // Add to history when search is submitted (Enter key)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && localValue.trim()) {
      addHistoryItem(localValue.trim());
      setShowHistory(false);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          ref={inputRef}
          type="text"
          value={localValue}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder={t('papers.searchBar.placeholder')}
          lang="en"
          spellCheck={false}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          className="w-full pl-10 pr-24 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
          <kbd className="hidden sm:inline-block px-2 py-0.5 text-xs font-mono text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-600 rounded">
            /
          </kbd>
          {localValue && (
            <button
              onClick={handleClear}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-0.5 rounded hover:bg-gray-100 dark:hover:bg-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        {isSearching && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
          </div>
        )}
      </div>
      {localValue && !isSearching && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5 flex items-center gap-1">
          <span>{t('papers.searchBar.searchingAutomatically')}</span>
        </p>
      )}
      {isSearching && (
        <p className="text-xs text-blue-600 dark:text-blue-400 mt-1.5 flex items-center gap-1">
          <span>{t('papers.searchBar.searching')}</span>
        </p>
      )}

      {/* Search History/Suggestions Dropdown */}
      {showHistory && ((history.length > 0 && !localValue) || (localValue && suggestions.length > 0)) && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 rounded-xl shadow-card-hover border border-gray-200 dark:border-gray-700 z-50 animate-slide-in-top">
          {!localValue && history.length > 0 && (
            <>
              {/* History Header */}
              <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  <Clock className="w-4 h-4" />
                  <span>{t('papers.searchBar.recentSearches')}</span>
                </div>
                {history.length > 0 && (
                  <button
                    onClick={handleClearHistory}
                    className="text-xs text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 transition-colors flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" />
                    {t('papers.searchBar.clearAll')}
                  </button>
                )}
              </div>

              {/* History Items */}
              <div className="max-h-64 overflow-y-auto py-1">
                {history.map((item, index) => (
                  <div
                    key={`${item.query}-${index}`}
                    className="group flex items-center gap-2 px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                    onClick={() => handleHistoryItemClick(item.query)}
                  >
                    <Clock className="w-4 h-4 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 flex-shrink-0" />
                    <span className="flex-1 text-sm text-gray-700 dark:text-gray-300 truncate">
                      {item.query}
                    </span>
                    <button
                      onClick={(e) => handleHistoryItemDelete(e, item.query)}
                      className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-all p-1"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}

          {localValue && suggestions.length > 0 && (
            <>
              {/* Suggestions Header */}
              <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t('papers.searchBar.suggestions')}
                </div>
              </div>

              {/* Suggestion Items */}
              <div className="max-h-64 overflow-y-auto py-1">
                {suggestions.map((suggestion) => (
                  <div
                    key={suggestion.id}
                    className="group flex items-center gap-2 px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                    onClick={() => handleSuggestionClick(suggestion)}
                  >
                    {getSuggestionIcon(suggestion.type)}
                    <span className="flex-1 text-sm text-gray-700 dark:text-gray-300 truncate">
                      {suggestion.text}
                    </span>
                    <div className="flex items-center gap-2">
                      {suggestion.count !== undefined && (
                        <span className="text-xs text-gray-400 dark:text-gray-500">
                          {suggestion.count}
                        </span>
                      )}
                      <span className="text-xs text-gray-400 dark:text-gray-500">
                        {getSuggestionTypeLabel(suggestion.type)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
});

// Memoize component to reduce unnecessary re-renders
// Combined with aggressive focus restoration to maintain focus
export const PaperSearchBar = memo(PaperSearchBarComponent);
PaperSearchBar.displayName = 'PaperSearchBar';
