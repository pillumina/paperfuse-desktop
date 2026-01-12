import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { listen } from '@tauri-apps/api/event';

interface FetchStatus {
  status: string;
  progress: number;
  current_step: string;
  papers_found: number;
  papers_analyzed: number;
  papers_saved: number;
  papers_filtered: number;
  papers_duplicates: number;
  papers_cache_hits: number;
  errors: string[];
  // Async mode specific fields (snake_case to match Rust backend)
  queue_size?: number;
  active_tasks?: number;
  completed_tasks?: number;
  failed_tasks?: number;
  async_mode?: boolean;
}

interface FetchError {
  error_type: string;
  message: string;
  is_retryable: boolean;
}

interface FetchCompletePayload {
  status: 'completed' | 'error' | 'cancelled';
  papers_fetched?: number;
  papers_analyzed?: number;
  papers_saved?: number;
  papers_filtered?: number;
  errors?: string[];
  error?: FetchError;
}

interface FetchProgressContextType {
  isFetching: boolean;
  isCompleting: boolean; // true when fetch is completing (showing completion message)
  hasError: boolean; // true when fetch completed with error
  errorInfo: FetchError | null; // error details from fetch-complete event
  fetchStatus: FetchStatus | null;
  fetchStartTime: number | null;
  startFetching: () => void;
  stopFetching: () => void;
  updateFetchStatus: (status: FetchStatus) => void;
  setStartTime: (time: number) => void;
  setCompleting: (completing: boolean) => void;
  setError: (hasError: boolean, errorInfo: FetchError | null) => void;
}

const FetchProgressContext = createContext<FetchProgressContextType | undefined>(undefined);

export function FetchProgressProvider({ children }: { children: ReactNode }) {
  const [isFetching, setIsFetching] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [errorInfo, setErrorInfo] = useState<FetchError | null>(null);
  const [fetchStatus, setFetchStatus] = useState<FetchStatus | null>(null);
  const [fetchStartTime, setFetchStartTime] = useState<number | null>(null);

  const startFetching = () => {
    setIsFetching(true);
    setIsCompleting(false);
    setHasError(false);
    setErrorInfo(null);
  };
  const stopFetching = () => {
    setIsFetching(false);
    setIsCompleting(false);
    setHasError(false);
    setErrorInfo(null);
  };
  const updateFetchStatus = (status: FetchStatus) => setFetchStatus(status);
  const setStartTime = (time: number) => setFetchStartTime(time);
  const setCompleting = (completing: boolean) => setIsCompleting(completing);
  const setError = (hasError: boolean, errorInfo: FetchError | null) => {
    setHasError(hasError);
    setErrorInfo(errorInfo);
  };

  // Global event listeners - these persist even when FetchDialog closes
  useEffect(() => {
    let completionTimer: NodeJS.Timeout | null = null;

    console.log('[FetchProgressProvider] Setting up global event listeners');

    // Listen to fetch progress events
    const unlistenProgress = listen<FetchStatus>('fetch-progress', (event) => {
      console.log('[FetchProgressProvider] fetch-progress event:', event.payload);
      updateFetchStatus(event.payload);
    });

    // Listen to fetch-started events
    const unlistenStart = listen<any>('fetch-started', () => {
      console.log('[FetchProgressProvider] fetch-started event');
      startFetching();
      setStartTime(Date.now());
      // Clear any pending completion timer when starting new fetch
      if (completionTimer) {
        console.log('[FetchProgressProvider] Clearing previous completion timer');
        clearTimeout(completionTimer);
        completionTimer = null;
      }
    });

    // Listen to fetch-complete events
    const unlistenComplete = listen<FetchCompletePayload>('fetch-complete', (event) => {
      console.log('[FetchProgressProvider] fetch-complete event:', event.payload);

      const payload = event.payload;

      // Check if fetch completed with error
      if (payload.status === 'error' && payload.error) {
        console.log('[FetchProgressProvider] Fetch failed with error:', payload.error);
        setError(true, payload.error);
        setCompleting(true);
        // Don't auto-hide error - let user see it
        return;
      }

      // Set completing state to show completion message
      console.log('[FetchProgressProvider] Setting isCompleting = true');
      setCompleting(true);

      // After 10 seconds, hide the progress bar (only for success/cancelled)
      console.log('[FetchProgressProvider] Setting 10s completion timer');
      completionTimer = setTimeout(() => {
        console.log('[FetchProgressProvider] Completion timer fired at', new Date().toISOString());
        stopFetching();
        setCompleting(false);
        updateFetchStatus({
          status: '',
          progress: 0,
          current_step: '',
          papers_found: 0,
          papers_analyzed: 0,
          papers_saved: 0,
          papers_filtered: 0,
          papers_duplicates: 0,
          papers_cache_hits: 0,
          errors: [],
        });
      }, 10000);
    });

    return () => {
      console.log('[FetchProgressProvider] Cleaning up global event listeners');
      if (completionTimer) {
        console.log('[FetchProgressProvider] Clearing completion timer on cleanup');
        clearTimeout(completionTimer);
      }
      unlistenProgress.then((u) => u());
      unlistenStart.then((u) => u());
      unlistenComplete.then((u) => u());
    };
  }, []); // Empty deps - set up listeners once on mount

  return (
    <FetchProgressContext.Provider
      value={{
        isFetching,
        isCompleting,
        hasError,
        errorInfo,
        fetchStatus,
        fetchStartTime,
        startFetching,
        stopFetching,
        updateFetchStatus,
        setStartTime,
        setCompleting,
        setError,
      }}
    >
      {children}
    </FetchProgressContext.Provider>
  );
}

export function useFetchProgress() {
  const context = useContext(FetchProgressContext);
  if (context === undefined) {
    throw new Error('useFetchProgress must be used within a FetchProgressProvider');
  }
  return context;
}

export type { FetchError, FetchCompletePayload };
