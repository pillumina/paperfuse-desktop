import { useState, useEffect } from 'react';

const SEARCH_HISTORY_KEY = 'paperfuse_search_history';
const MAX_HISTORY_ITEMS = 10;

export interface SearchHistoryItem {
  query: string;
  timestamp: number;
}

export function useSearchHistory() {
  const [history, setHistory] = useState<SearchHistoryItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load history from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(SEARCH_HISTORY_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setHistory(parsed);
      }
    } catch (error) {
      console.error('Failed to load search history:', error);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // Save history to localStorage whenever it changes
  useEffect(() => {
    if (isLoaded) {
      try {
        localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(history));
      } catch (error) {
        console.error('Failed to save search history:', error);
      }
    }
  }, [history, isLoaded]);

  const addHistoryItem = (query: string) => {
    if (!query.trim()) return;

    setHistory(prev => {
      // Remove duplicates
      const filtered = prev.filter(item => item.query !== query);

      // Add new item at the beginning
      const newItem: SearchHistoryItem = {
        query,
        timestamp: Date.now(),
      };

      const newHistory = [newItem, ...filtered];

      // Keep only MAX_HISTORY_ITEMS
      return newHistory.slice(0, MAX_HISTORY_ITEMS);
    });
  };

  const removeHistoryItem = (query: string) => {
    setHistory(prev => prev.filter(item => item.query !== query));
  };

  const clearHistory = () => {
    setHistory([]);
  };

  return {
    history,
    addHistoryItem,
    removeHistoryItem,
    clearHistory,
    isLoaded,
  };
}
