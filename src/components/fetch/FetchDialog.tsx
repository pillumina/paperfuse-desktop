import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Loader2, CheckCircle2, AlertCircle, Info, Play, FileText, Plus, Square, RotateCcw, Clock, Settings2, Sparkles } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { useQueryClient } from '@tanstack/react-query';
import { useSettings } from '../../hooks/useSettings';
import { useFetchProgress } from '../../contexts/FetchProgressContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { FetchOptions, type FetchStatus } from '../../lib/types';
import {
  showFetchCompleteNotification,
} from '../../lib/notifications';
import '../../styles/animations.css';
import '../../styles/transitions.css';

interface FetchDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

interface FetchErrorInfo {
  error_type: string;
  message: string;
  is_retryable: boolean;
}

export default function FetchDialog({
  isOpen,
  onClose,
}: FetchDialogProps) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: settings } = useSettings();
  const {
    isFetching: globalIsFetching,
    isCompleting: globalIsCompleting,
    fetchStatus: globalFetchStatus,
    fetchStartTime: globalFetchStartTime,
  } = useFetchProgress();

  const [isFetching, setIsFetching] = useState(false);
  const [fetchStatus, setFetchStatus] = useState<FetchStatus | null>(null);
  const [error, setError] = useState<FetchErrorInfo | null>(null);
  const [result, setResult] = useState<{
    papers_saved: number;
    papers_filtered: number;
  } | null>(null);
  const [fetchStartTime, setFetchStartTime] = useState<number>(0);
  const progressIntervalRef = useRef<number | null>(null);

  // Use global fetch status if available, otherwise use local
  const displayIsFetching = globalIsFetching || isFetching;
  const displayFetchStatus = globalIsFetching ? globalFetchStatus : fetchStatus;
  const displayFetchStartTime = globalIsFetching ? globalFetchStartTime : fetchStartTime;

  // Check API key availability first (before useState hooks that need it)
  const hasAnyApiKey = Boolean(
    (settings?.glmApiKey && settings.glmApiKey.length > 0)
    || (settings?.claudeApiKey && settings.claudeApiKey.length > 0)
  );

  // Fetch options form state
  const [provider, setProvider] = useState<'glm' | 'claude'>(
    settings?.llmProvider || 'glm'
  );
  const [maxPapers, setMaxPapers] = useState(10);
  const [customMaxPapers, setCustomMaxPapers] = useState('');
  const [daysBack, setDaysBack] = useState<number | null>(() => {
    const saved = localStorage.getItem('fetch_daysBack');
    return saved !== null ? (saved === 'null' ? null : Number(saved)) : 7;
  });
  const [dateRangeMode, setDateRangeMode] = useState<'preset' | 'custom'>(() => {
    const saved = localStorage.getItem('fetch_dateRangeMode');
    return (saved === 'custom' ? 'custom' : 'preset') as 'preset' | 'custom';
  });
  const [dateFrom, setDateFrom] = useState<string>(() => {
    return localStorage.getItem('fetch_dateFrom') || '';
  });
  const [dateTo, setDateTo] = useState<string>(() => {
    return localStorage.getItem('fetch_dateTo') || '';
  });
  const [minRelevance, setMinRelevance] = useState(() => {
    // Load from localStorage or use default
    const saved = localStorage.getItem('fetch_minRelevance');
    return saved ? Number(saved) : 60;
  });
  const [deepAnalysis, setDeepAnalysis] = useState<boolean>(() => {
    // Load from localStorage, default to true if API key is configured
    const saved = localStorage.getItem('fetch_deepAnalysis');
    if (saved !== null) {
      return saved === 'true';
    }
    // No saved value: default to true if user has API key configured
    return hasAnyApiKey;
  });
  const [deepAnalysisThreshold, setDeepAnalysisThreshold] = useState(() => {
    // Load from localStorage or use default
    const saved = localStorage.getItem('fetch_deepAnalysisThreshold');
    return saved ? Number(saved) : 70;
  });
  const [asyncMode, setAsyncMode] = useState<'sync' | 'async'>(() => {
    // Load from localStorage or use default from settings
    const saved = localStorage.getItem('fetch_asyncMode');
    if (saved) return saved as 'sync' | 'async';
    return settings?.asyncAnalysisMode || 'sync';
  });
  const [maxConcurrent, setMaxConcurrent] = useState(() => {
    // Load from localStorage or use default from settings
    const saved = localStorage.getItem('fetch_maxConcurrent');
    if (saved) return Number(saved);
    return settings?.maxConcurrentAnalyses || 1;
  });
  const [language, setLanguage] = useState<'en' | 'zh'>(() => {
    // Load from localStorage or use default (en)
    const saved = localStorage.getItem('fetch_language');
    if (saved) return saved as 'en' | 'zh';
    return 'en';
  });
  // Fetch mode: 'category' (search by category) or 'id' (fetch by arXiv ID)
  const [fetchMode, setFetchMode] = useState<'category' | 'id'>(() => {
    const saved = localStorage.getItem('fetch_mode');
    return (saved === 'id' ? 'id' : 'category') as 'category' | 'id';
  });
  const [arxivIdsInput, setArxivIdsInput] = useState(() => {
    return localStorage.getItem('fetch_arxivIds') || '';
  });

  // Tab state for sidebar navigation
  const [activeTab, setActiveTab] = useState<'basic' | 'ai' | 'analysis'>('basic');

  // Validate API key from settings based on current provider
  const apiKey = provider === 'glm' ? settings?.glmApiKey : settings?.claudeApiKey;
  const hasApiKey = apiKey && apiKey.length > 0;

  // Update provider when settings change
  useEffect(() => {
    if (settings?.llmProvider) {
      setProvider(settings.llmProvider);
    }
  }, [settings?.llmProvider]);

  // Save date range preferences to localStorage
  useEffect(() => {
    localStorage.setItem('fetch_dateRangeMode', dateRangeMode);
  }, [dateRangeMode]);

  useEffect(() => {
    localStorage.setItem('fetch_daysBack', String(daysBack));
  }, [daysBack]);

  useEffect(() => {
    localStorage.setItem('fetch_dateFrom', dateFrom);
  }, [dateFrom]);

  useEffect(() => {
    localStorage.setItem('fetch_dateTo', dateTo);
  }, [dateTo]);

  // Update deepAnalysis when API key status changes (only if not manually set)
  useEffect(() => {
    const saved = localStorage.getItem('fetch_deepAnalysis');
    if (saved === null) {
      setDeepAnalysis(hasAnyApiKey);
    }
  }, [hasAnyApiKey]);

  // Save preferences to localStorage when they change
  useEffect(() => {
    localStorage.setItem('fetch_minRelevance', String(minRelevance));
  }, [minRelevance]);

  useEffect(() => {
    localStorage.setItem('fetch_deepAnalysis', String(deepAnalysis));
  }, [deepAnalysis]);

  useEffect(() => {
    localStorage.setItem('fetch_deepAnalysisThreshold', String(deepAnalysisThreshold));
  }, [deepAnalysisThreshold]);

  useEffect(() => {
    localStorage.setItem('fetch_asyncMode', asyncMode);
  }, [asyncMode]);

  useEffect(() => {
    localStorage.setItem('fetch_maxConcurrent', String(maxConcurrent));
  }, [maxConcurrent]);

  useEffect(() => {
    localStorage.setItem('fetch_language', language);
  }, [language]);

  useEffect(() => {
    localStorage.setItem('fetch_mode', fetchMode);
  }, [fetchMode]);

  useEffect(() => {
    localStorage.setItem('fetch_arxivIds', arxivIdsInput);
  }, [arxivIdsInput]);

  // Check if user can start fetch
  // If deep analysis is requested, need API key for the selected provider
  const canStartFetch = !deepAnalysis || (deepAnalysis && hasApiKey);

  // Reset local state when dialog closes AND fetch is not running
  useEffect(() => {
    if (!isOpen && !globalIsFetching) {
      // Only reset local state if fetch is not running
      setFetchStatus(null);
      setError(null);
      setResult(null);
      setFetchStartTime(0);
      setIsFetching(false);
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
    }
  }, [isOpen, globalIsFetching]);

  // When dialog opens, reset local state if fetch is not running globally
  useEffect(() => {
    if (isOpen && !globalIsFetching) {
      // Reset local state to match global state (not fetching)
      setIsFetching(false);
      setFetchStatus(null);
      setError(null);
      setResult(null);
    }
  }, [isOpen, globalIsFetching]);

  // Listen to fetch progress events (for detailed progress display while dialog is open)
  useEffect(() => {
    if (!isOpen) return;

    console.log('[FetchDialog] Setting up progress event listener');

    const unlistenProgress = listen<FetchStatus>('fetch-progress', (event) => {
      console.log('[FetchDialog] fetch-progress event:', event.payload);
      setFetchStatus(event.payload);
    });

    return () => {
      console.log('[FetchDialog] Cleaning up progress event listener');
      unlistenProgress.then((u) => u());
    };
  }, [isOpen]);

  // Watch global completing state to reset dialog when fetch completes
  useEffect(() => {
    // When fetch completes, reset dialog state so it returns to form
    if (globalIsCompleting && isOpen) {
      console.log('[FetchDialog] Fetch completed, resetting dialog state');
      setResult(null);
      setIsFetching(false);

      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }

      // Show completion notification and refresh papers
      showFetchCompleteNotification(
        fetchStatus?.papers_saved || 0,
        fetchStatus?.papers_filtered || 0
      );
      queryClient.invalidateQueries({ queryKey: ['papers'] });
      queryClient.invalidateQueries({ queryKey: ['paperCount'] });
    }
  }, [globalIsCompleting, isOpen, fetchStatus]);

  const handleStartFetch = async () => {
    console.log('[FetchDialog] Starting fetch with options:', {
      provider,
      fetchMode,
      maxPapers,
      daysBack,
      minRelevance,
      deepAnalysis,
      hasApiKey,
      topicsCount: settings?.topics?.length || 0,
    });
    console.log('[FetchDialog] Full settings object:', settings);
    console.log('[FetchDialog] settings.topics:', settings?.topics);

    // Validate: deep analysis requires API key
    if (deepAnalysis && !hasApiKey) {
      console.error('[FetchDialog] Deep analysis requested but no API key');
      setError({
        error_type: 'config',
        message: `Deep analysis requires a ${provider} API key. Please configure one in Settings or disable deep analysis.`,
        is_retryable: false,
      });
      return;
    }

    // Validate: fetch by ID mode requires at least one arXiv ID
    if (fetchMode === 'id') {
      const ids = arxivIdsInput.split(',').map(id => id.trim()).filter(id => id);
      if (ids.length === 0) {
        console.error('[FetchDialog] Fetch by ID mode but no IDs provided');
        setError({
          error_type: 'config',
          message: t('fetch.errors.noIds'),
          is_retryable: false,
        });
        return;
      }

      // Validate arXiv ID format: YYMM.NNNNN or YYMM.NNNNNvV
      const validateArxivId = (id: string): boolean => {
        return /^\d{4}\.\d{4,5}(v\d+)?$/.test(id.trim());
      };

      const invalidIds = ids.filter(id => !validateArxivId(id));
      if (invalidIds.length > 0) {
        console.error('[FetchDialog] Invalid arXiv IDs:', invalidIds);
        setError({
          error_type: 'config',
          message: t('fetch.errors.invalidIds', { ids: invalidIds.join(', ') }),
          is_retryable: false,
        });
        return;
      }
    }

    setResult(null);
    setIsFetching(true);
    setFetchStartTime(Date.now());

    // Don't auto-close the dialog - keep it open so user can see progress
    // and immediately fetch again when complete
    // Note: Global state (startFetching, setStartTime) will be updated by
    // the fetch-started event from the backend

    // Use global ArXiv categories from settings, with fallback to defaults
    const categories = settings?.arxivCategories && settings.arxivCategories.length > 0
      ? settings.arxivCategories
      : ['cs.AI', 'cs.LG'];

    console.log('[FetchDialog] Categories to fetch:', categories);

    const options: FetchOptions = {
      api_key: apiKey || '',
      llm_provider: provider,
      quick_model: provider === 'glm' ? settings?.glmQuickModel : settings?.claudeQuickModel,
      deep_model: provider === 'glm' ? settings?.glmDeepModel : settings?.claudeDeepModel,
      categories: categories,
      max_papers: maxPapers,
      days_back: dateRangeMode === 'preset' ? (daysBack ?? undefined) : undefined,
      date_from: dateRangeMode === 'custom' && dateFrom ? dateFrom : undefined,
      date_to: dateRangeMode === 'custom' && dateTo ? dateTo : undefined,
      min_relevance: minRelevance,
      deep_analysis: deepAnalysis,
      deep_analysis_threshold: deepAnalysis ? deepAnalysisThreshold : undefined,
      analysis_mode: settings?.deepAnalysisMode,
      async_mode: asyncMode,
      max_concurrent: asyncMode === 'async' ? maxConcurrent : undefined,
      language: language,
      // Fetch by ID mode
      fetch_by_id: fetchMode === 'id',
      arxiv_ids: fetchMode === 'id'
        ? arxivIdsInput.split(',').map(id => id.trim()).filter(id => id)
        : undefined,
    };

    console.log('[FetchDialog] Invoking start_fetch Tauri command with:', options);

    // Filter to only send enabled topics to backend
    const enabledTopics = (settings?.topics || []).filter(topic => topic.enabled !== false);
    console.log('[FetchDialog] Total topics:', settings?.topics?.length || 0);
    console.log('[FetchDialog] Enabled topics to send:', enabledTopics.length);
    console.log('[FetchDialog] Topics to send:', enabledTopics);

    try {
      await invoke('start_fetch', {
        options,
        topics: enabledTopics,
      });
      console.log('[FetchDialog] start_fetch command invoked successfully');

      // Auto-close dialog after fetch starts (user can see progress in TopFetchProgressBar)
      setTimeout(() => {
        if (isOpen) {
          console.log('[FetchDialog] Auto-closing dialog after fetch started');
          onClose();
        }
      }, 500);
    } catch (err) {
      console.error('[FetchDialog] start_fetch command failed:', err);
      setIsFetching(false);
      setError({
        error_type: 'system',
        message: err instanceof Error ? err.message : 'Failed to start fetch',
        is_retryable: true,
      });
    }
  };

  const handleCancelFetch = async () => {
    try {
      await invoke('cancel_fetch');
    } catch (err) {
      console.error('Failed to cancel fetch:', err);
    }
  };

  // Calculate ETA based on progress
  const getETA = () => {
    if (!displayFetchStatus || !displayFetchStartTime || displayFetchStatus.progress <= 0) return null;
    const elapsed = Date.now() - displayFetchStartTime;
    const estimatedTotal = elapsed / displayFetchStatus.progress;
    const remaining = estimatedTotal - elapsed;
    return remaining;
  };

  const formatETA = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
  };

  const getErrorTitle = () => {
    if (!error) return '';
    switch (error.error_type) {
      case 'llm_rate_limit': return t('fetch.errors.rateLimited');
      case 'llm_auth': return t('fetch.errors.authFailed');
      case 'network': return t('fetch.errors.networkError');
      case 'cancelled': return t('fetch.errors.cancelled');
      case 'warning': return t('fetch.errors.notice');
      default: return t('fetch.errors.error');
    }
  };

  const getErrorStyle = () => {
    if (!error) return '';
    switch (error.error_type) {
      case 'warning':
        return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800';
      default:
        return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
    }
  };

  const getErrorIconColor = () => {
    if (!error) return '';
    switch (error.error_type) {
      case 'warning':
        return 'text-blue-600 dark:text-blue-400';
      default:
        return 'text-red-600 dark:text-red-400';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-enhanced flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden modal-content">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {displayIsFetching ? t('fetch.titleFetching') : t('fetch.title')}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              {displayIsFetching
                ? t('fetch.descriptionFetching')
                : t('fetch.description')}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 btn-interactive"
            title={displayIsFetching ? t('fetch.closeContinue') : t('fetch.close')}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Main content area with sidebar tabs */}
        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar navigation */}
          {!displayIsFetching && !result && (
            <div className="w-48 border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30 p-3 space-y-1">
              <button
                onClick={() => setActiveTab('basic')}
                className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium transition-all btn-interactive ${
                  activeTab === 'basic'
                    ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-white/50 dark:hover:bg-gray-800/50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Settings2 className="w-4 h-4" />
                  <span>{t('fetch.basicOptions')}</span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab('ai')}
                className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium transition-all btn-interactive ${
                  activeTab === 'ai'
                    ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-white/50 dark:hover:bg-gray-800/50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  <span>AI Settings</span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab('analysis')}
                className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium transition-all btn-interactive ${
                  activeTab === 'analysis'
                    ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-white/50 dark:hover:bg-gray-800/50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  <span>{t('fetch.deepAnalysis.label')}</span>
                </div>
              </button>
            </div>
          )}

          {/* Content area */}
          <div className="flex-1 overflow-y-auto p-6">
            {/* Error/Warning Message */}
            {error && (
              <div className={`mb-6 p-4 border rounded-lg flex items-start gap-3 ${getErrorStyle()}`}>
                {error.error_type === 'warning' ? (
                  <Info className={`w-5 h-5 flex-shrink-0 mt-0.5 ${getErrorIconColor()}`} />
                ) : (
                  <AlertCircle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${getErrorIconColor()}`} />
                )}
                <div className="flex-1">
                  <p className={`text-sm font-medium ${
                    error.error_type === 'warning'
                      ? 'text-blue-800 dark:text-blue-200'
                      : 'text-red-800 dark:text-red-200'
                  }`}>
                    {getErrorTitle()}
                  </p>
                  <p className={`text-sm mt-1 ${
                    error.error_type === 'warning'
                      ? 'text-blue-700 dark:text-blue-300'
                      : 'text-red-700 dark:text-red-300'
                  }`}>{error.message}</p>
                </div>
                {error.is_retryable && (
                  <button
                    onClick={handleStartFetch}
                    className="px-3 py-1.5 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 flex items-center gap-1.5"
                  >
                    <RotateCcw className="w-4 h-4" />
                    {t('fetch.errors.retry')}
                  </button>
                )}
              </div>
            )}

            {/* Success Result */}
            {result && !displayIsFetching && (
              <div className="mb-6 p-5 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl">
                <div className="flex items-start gap-3 mb-4">
                  <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-base font-semibold text-green-900 dark:text-green-100">
                      {t('fetch.success.title')}
                    </p>
                    <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                      {t('fetch.success.message', { saved: result.papers_saved, filtered: result.papers_filtered })
                        .replace('{{saved}}', result.papers_saved.toString())
                        .replace('{{filtered}}', result.papers_filtered.toString())}
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      onClose();
                      navigate('/papers');
                    }}
                    className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 flex items-center gap-2"
                  >
                    <FileText className="w-4 h-4" />
                    {t('fetch.success.viewPapers')}
                  </button>
                  <button
                    onClick={() => {
                      setResult(null);
                    }}
                    className="px-4 py-2 bg-white dark:bg-gray-700 text-green-700 dark:text-green-300 text-sm font-medium rounded-lg border border-green-300 dark:border-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    {t('fetch.success.fetchMore')}
                  </button>
                </div>
              </div>
            )}

            {/* Fetch Progress */}
            {displayIsFetching && displayFetchStatus && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    {displayFetchStatus.current_step}
                  </span>
                  <div className="flex items-center gap-3">
                    {getETA() && (
                      <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {t('fetch.progress.eta')}: {formatETA(getETA()!)}
                      </span>
                    )}
                    <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                      {Math.round(displayFetchStatus.progress * 100)}%
                    </span>
                  </div>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-blue-600 h-full transition-all duration-300 ease-out"
                    style={{ width: `${displayFetchStatus.progress * 100}%` }}
                  />
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4 mt-5">
                  <div className="text-center p-3 bg-gray-50 dark:bg-gray-900/20 rounded-lg">
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {displayFetchStatus.papers_found}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t('fetch.progress.found')}</p>
                  </div>
                  <div className="text-center p-3 bg-gray-50 dark:bg-gray-900/20 rounded-lg">
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {displayFetchStatus.papers_analyzed}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t('fetch.progress.analyzed')}</p>
                  </div>
                  <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {displayFetchStatus.papers_saved}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t('fetch.progress.saved')}</p>
                  </div>
                </div>

                {/* Additional Stats */}
                {(displayFetchStatus.papers_filtered > 0 ||
                  displayFetchStatus.papers_cache_hits > 0 ||
                  displayFetchStatus.papers_duplicates > 0 ||
                  displayFetchStatus.async_mode) && (
                  <div className="grid grid-cols-4 gap-2 mt-3">
                    {(displayFetchStatus.papers_duplicates > 0 || displayFetchStatus.papers_filtered > 0) && (
                      <div className="text-center p-2 bg-gray-50 dark:bg-gray-900/20 rounded-lg">
                        <p className="text-lg font-semibold text-gray-600 dark:text-gray-400">
                          {displayFetchStatus.papers_duplicates + displayFetchStatus.papers_filtered}
                        </p>
                        <p className="text-xs text-gray-700 dark:text-gray-300">{t('fetch.progress.skipped')}</p>
                      </div>
                    )}
                    {displayFetchStatus.papers_cache_hits > 0 && (
                      <div className="text-center p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <p className="text-lg font-semibold text-blue-600 dark:text-blue-400">
                          {displayFetchStatus.papers_cache_hits}
                        </p>
                        <p className="text-xs text-blue-700 dark:text-blue-300">{t('fetch.progress.fromCache')}</p>
                      </div>
                    )}
                    {displayFetchStatus.async_mode && (
                      <div className="text-center p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                        <p className="text-lg font-semibold text-purple-600 dark:text-purple-400">
                          {displayFetchStatus.active_tasks || 0}
                        </p>
                        <p className="text-xs text-purple-700 dark:text-purple-300">{t('fetch.progress.activeWorkers')}</p>
                      </div>
                    )}
                  </div>
                )}

                {displayFetchStatus.errors.length > 0 && (
                  <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                    <p className="text-xs font-medium text-yellow-800 dark:text-yellow-200">
                      {t('fetch.progress.errors', { count: displayFetchStatus.errors.length }).replace('{{count}}', displayFetchStatus.errors.length.toString())}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Configuration Form - with tabs */}
            {!displayIsFetching && !result && (
              <>
                {/* Basic Tab */}
                {activeTab === 'basic' && (
                  <div className="space-y-6 tab-content">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                        {t('fetch.basicOptions')}
                      </h3>

                      {/* Fetch Mode Toggle */}
                      <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                          {t('fetch.fetchMode.label')}
                        </label>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setFetchMode('category')}
                            className={`flex-1 px-4 py-2.5 text-sm font-medium rounded-lg border-2 transition-all ${
                              fetchMode === 'category'
                                ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                                : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500'
                            }`}
                          >
                            {t('fetch.fetchMode.category')}
                          </button>
                          <button
                            type="button"
                            onClick={() => setFetchMode('id')}
                            className={`flex-1 px-4 py-2.5 text-sm font-medium rounded-lg border-2 transition-all ${
                              fetchMode === 'id'
                                ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                                : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500'
                            }`}
                          >
                            {t('fetch.fetchMode.byId')}
                          </button>
                        </div>
                      </div>

                      {/* arXiv IDs Input - only show in ID mode */}
                      {fetchMode === 'id' && (
                        <div className="mb-6">
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                            {t('fetch.arxivIds.label')}
                          </label>
                          <textarea
                            value={arxivIdsInput}
                            onChange={(e) => setArxivIdsInput(e.target.value)}
                            placeholder={t('fetch.arxivIds.placeholder')}
                            rows={3}
                            className="w-full px-4 py-3 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none"
                          />
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                            {t('fetch.arxivIds.help')}
                          </p>
                        </div>
                      )}

                      {/* Max Papers - only show in category mode */}
                      {fetchMode === 'category' && (
                      <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                          {t('fetch.maxPapers.label')}
                        </label>

                        {/* Quick select buttons */}
                        <div className="grid grid-cols-5 gap-2 mb-3">
                          {[10, 20, 50, 100, 200].map((value) => (
                            <button
                              key={value}
                              type="button"
                              onClick={() => {
                                setMaxPapers(value);
                                setCustomMaxPapers('');
                              }}
                              className={`px-3 py-2.5 text-sm font-medium rounded-lg border-2 transition-all ${
                                maxPapers === value && !customMaxPapers
                                  ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 scale-105'
                                  : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500'
                              }`}
                            >
                              {value}
                            </button>
                          ))}
                        </div>

                        {/* Custom input */}
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="1"
                            max="1000"
                            value={customMaxPapers}
                            onChange={(e) => {
                              const val = e.target.value;
                              setCustomMaxPapers(val);
                              if (val) {
                                setMaxPapers(Number(val));
                              }
                            }}
                            placeholder={t('fetch.maxPapers.custom')}
                            className="flex-1 px-4 py-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-medium"
                          />
                          <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                            {t('fetch.maxPapers.orUsePreset')}
                          </span>
                        </div>
                      </div>
                      )}

                      {/* Date Range - only show in category mode */}
                      {fetchMode === 'category' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                          {t('fetch.dateRange.label')}
                        </label>

                        {/* Mode toggle: Preset / Custom */}
                        <div className="flex gap-2 mb-3">
                          <button
                            type="button"
                            onClick={() => {
                              setDateRangeMode('preset');
                              setDateFrom('');
                              setDateTo('');
                            }}
                            className={`px-4 py-2 text-sm font-medium rounded-lg border-2 transition-all ${
                              dateRangeMode === 'preset'
                                ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                                : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500'
                            }`}
                          >
                            {t('fetch.dateRange.preset')}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setDateRangeMode('custom');
                              setDaysBack(null);
                            }}
                            className={`px-4 py-2 text-sm font-medium rounded-lg border-2 transition-all ${
                              dateRangeMode === 'custom'
                                ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                                : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500'
                            }`}
                          >
                            {t('fetch.dateRange.custom')}
                          </button>
                        </div>

                        {/* Preset options */}
                        {dateRangeMode === 'preset' && (
                          <div className="grid grid-cols-3 gap-2">
                            {[
                              { value: 1, label: t('fetch.dateRange.24h') },
                              { value: 3, label: t('fetch.dateRange.3days') },
                              { value: 7, label: t('fetch.dateRange.7days') },
                              { value: 14, label: t('fetch.dateRange.14days') },
                              { value: 30, label: t('fetch.dateRange.30days') },
                              { value: null, label: t('fetch.dateRange.allTime') },
                            ].map((option) => (
                              <button
                                key={option.label}
                                type="button"
                                onClick={() => setDaysBack(option.value)}
                                className={`px-3 py-2.5 text-sm font-medium rounded-lg border-2 transition-all ${
                                  (daysBack === option.value) || (daysBack === null && option.value === null)
                                    ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 scale-105'
                                    : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500'
                                }`}
                              >
                                {option.label}
                              </button>
                            ))}
                          </div>
                        )}

                        {/* Custom date range */}
                        {dateRangeMode === 'custom' && (
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                                {t('fetch.dateRange.fromDate')}
                              </label>
                              <input
                                type="date"
                                value={dateFrom}
                                onChange={(e) => setDateFrom(e.target.value)}
                                max={dateTo || new Date().toISOString().split('T')[0]}
                                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                                {t('fetch.dateRange.toDate')}
                              </label>
                              <input
                                type="date"
                                value={dateTo}
                                onChange={(e) => setDateTo(e.target.value)}
                                min={dateFrom}
                                max={new Date().toISOString().split('T')[0]}
                                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                      )}
                    </div>
                  </div>
                )}

                {/* AI Settings Tab */}
                {activeTab === 'ai' && (
                  <div className="space-y-5 tab-content">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                        AI Settings
                      </h3>

                      {/* Info box */}
                      <div className="mb-5 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                        <p className="text-sm text-blue-900 dark:text-blue-100">
                          <span className="font-semibold">{t('fetch.infoBox.title')}</span> {t('fetch.infoBox.description')}
                        </p>
                      </div>

                      {/* API Key Status */}
                      <div className={`mb-5 p-4 rounded-lg border ${
                        hasApiKey
                          ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                          : hasAnyApiKey
                          ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
                          : 'bg-gray-50 dark:bg-gray-900/30 border-gray-200 dark:border-gray-700'
                      }`}>
                        <div className="flex items-start gap-3">
                          {hasApiKey ? (
                            <Sparkles className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                          ) : hasAnyApiKey ? (
                            <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                          ) : (
                            <AlertCircle className="w-5 h-5 text-gray-400 dark:text-gray-600 flex-shrink-0 mt-0.5" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-semibold ${
                              hasApiKey
                                ? 'text-blue-800 dark:text-blue-200'
                                : hasAnyApiKey
                                ? 'text-yellow-800 dark:text-yellow-200'
                                : 'text-gray-700 dark:text-gray-300'
                            }`}>
                              {hasApiKey
                                ? t('fetch.apiKeyStatus.active', { provider }).replace('{{provider}}', provider.toUpperCase())
                                : hasAnyApiKey
                                ? t('fetch.apiKeyStatus.notConfigured', { provider }).replace('{{provider}}', provider.toUpperCase())
                                : t('fetch.apiKeyStatus.noKey')}
                            </p>
                            <p className={`text-xs mt-1 ${
                              hasApiKey
                                ? 'text-blue-700 dark:text-blue-300'
                                : hasAnyApiKey
                                ? 'text-yellow-700 dark:text-yellow-300'
                                : 'text-gray-500 dark:text-gray-400'
                            }`}>
                              {hasApiKey
                                ? t('fetch.apiKeyStatus.quickAnalysis')
                                : hasAnyApiKey
                                ? t('fetch.apiKeyStatus.hasOtherKey', {
                                    otherProvider: settings?.glmApiKey ? 'GLM' : 'Claude',
                                    provider: provider.toUpperCase()
                                  }).replace('{{otherProvider}}', settings?.glmApiKey ? 'GLM' : 'Claude')
                                   .replace('{{provider}}', provider.toUpperCase())
                                : t('fetch.apiKeyStatus.noAnalysis')}
                            </p>
                          </div>
                          <button
                            onClick={() => navigate('/settings')}
                            className={`px-4 py-2 text-sm font-medium rounded-lg hover:opacity-90 transition-opacity flex-shrink-0 ${
                              hasApiKey
                                ? 'bg-blue-600 text-white hover:bg-blue-700'
                                : hasAnyApiKey
                                ? 'bg-yellow-600 text-white hover:bg-yellow-700'
                                : 'bg-blue-600 text-white hover:bg-blue-700'
                            }`}
                          >
                            {hasApiKey ? t('fetch.apiKeyStatus.manage') : hasAnyApiKey ? t('fetch.apiKeyStatus.switchProvider') : t('fetch.apiKeyStatus.configure')}
                          </button>
                        </div>
                      </div>

                      {/* LLM Provider */}
                      {hasApiKey && (
                        <div className="mb-5">
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                            {t('fetch.llmProvider.label')}
                          </label>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => setProvider('glm')}
                              className={`flex-1 px-4 py-2.5 text-sm font-medium rounded-lg border-2 transition-all ${
                                provider === 'glm'
                                  ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 scale-105'
                                  : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500'
                              }`}
                            >
                              {t('fetch.llmProvider.glm')}
                            </button>
                            <button
                              type="button"
                              onClick={() => setProvider('claude')}
                              className={`flex-1 px-4 py-2.5 text-sm font-medium rounded-lg border-2 transition-all ${
                                provider === 'claude'
                                  ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 scale-105'
                                  : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500'
                              }`}
                            >
                              {t('fetch.llmProvider.claude')}
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Async Analysis Mode */}
                      {hasApiKey && (
                        <div className="mb-5">
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                            {t('fetch.asyncMode.label')}
                          </label>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => setAsyncMode('sync')}
                              className={`flex-1 px-4 py-2.5 text-sm font-medium rounded-lg border-2 transition-all ${
                                asyncMode === 'sync'
                                  ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 scale-105'
                                  : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500'
                              }`}
                            >
                              {t('fetch.asyncMode.sync')}
                            </button>
                            <button
                              type="button"
                              onClick={() => setAsyncMode('async')}
                              className={`flex-1 px-4 py-2.5 text-sm font-medium rounded-lg border-2 transition-all ${
                                asyncMode === 'async'
                                  ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 scale-105'
                                  : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500'
                              }`}
                            >
                              {t('fetch.asyncMode.async')}
                            </button>
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                            {asyncMode === 'async' ? t('fetch.asyncMode.asyncDesc') : t('fetch.asyncMode.syncDesc')}
                          </p>

                          {/* Concurrency slider for async mode */}
                          {asyncMode === 'async' && (
                            <div className="mt-4 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                {t('fetch.asyncMode.maxConcurrent')}: <span className="font-semibold text-purple-600 dark:text-purple-400">{maxConcurrent}</span>
                              </label>
                              <input
                                type="range"
                                min="1"
                                max="5"
                                value={maxConcurrent}
                                onChange={(e) => setMaxConcurrent(Number(e.target.value))}
                                className="w-full"
                              />
                              <div className="grid grid-cols-5 gap-1 mt-2">
                                {[1, 2, 3, 4, 5].map((value) => (
                                  <button
                                    key={value}
                                    type="button"
                                    onClick={() => setMaxConcurrent(value)}
                                    className={`text-xs py-1.5 rounded transition-colors font-medium ${
                                      maxConcurrent === value
                                        ? 'bg-purple-600 text-white'
                                        : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                                    }`}
                                  >
                                    {value}
                                  </button>
                                ))}
                              </div>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                                {t('fetch.asyncMode.maxConcurrentDesc')}
                              </p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Response Language */}
                      {hasApiKey && (
                        <div className="mb-5">
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                            🌐 {t('fetch.language.label')}
                          </label>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => setLanguage('en')}
                              className={`flex-1 px-4 py-2.5 text-sm font-medium rounded-lg border-2 transition-all ${
                                language === 'en'
                                  ? 'border-green-600 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 scale-105'
                                  : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500'
                              }`}
                            >
                              English (英文)
                            </button>
                            <button
                              type="button"
                              onClick={() => setLanguage('zh')}
                              className={`flex-1 px-4 py-2.5 text-sm font-medium rounded-lg border-2 transition-all ${
                                language === 'zh'
                                  ? 'border-green-600 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 scale-105'
                                  : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500'
                              }`}
                            >
                              中文 (Chinese)
                            </button>
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                            {language === 'zh' ? t('fetch.language.zhDesc') : t('fetch.language.enDesc')}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Deep Analysis Tab */}
                {activeTab === 'analysis' && (
                  <div className="space-y-5 tab-content">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                        {t('fetch.deepAnalysis.label')}
                      </h3>

                      {/* Info box */}
                      <div className="mb-5 p-4 bg-gray-50 dark:bg-gray-900/30 border border-gray-200 dark:border-gray-700 rounded-lg">
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                          <span className="font-semibold">{t('fetch.aiOptions')}</span> {t('fetch.optional')}
                        </p>
                      </div>

                      {/* Deep Analysis Toggle */}
                      <div className="p-5 bg-gray-50 dark:bg-gray-900/30 rounded-lg border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="text-base font-semibold text-gray-700 dark:text-gray-300">
                                {t('fetch.deepAnalysis.label')}
                              </p>
                              {!hasApiKey && !deepAnalysis && (
                                <span className="px-2 py-0.5 text-xs bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded">
                                  {t('fetch.deepAnalysis.requiresApiKey')}
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                              {t('fetch.deepAnalysis.description')}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setDeepAnalysis(!deepAnalysis)}
                            disabled={!hasApiKey}
                            className={`relative inline-flex h-7 w-13 items-center rounded-full transition-colors ${
                              deepAnalysis ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
                            } ${!hasApiKey ? 'opacity-50 cursor-not-allowed' : ''}`}
                            style={{ width: '3.25rem' }}
                          >
                            <span
                              className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                                deepAnalysis ? 'translate-x-7' : 'translate-x-1'
                              }`}
                            />
                          </button>
                        </div>

                        {/* Expanded settings when deep analysis is enabled */}
                        {deepAnalysis && (
                          <div className="pt-4 border-t border-gray-200 dark:border-gray-700 space-y-5">
                            {/* Analysis Mode Display */}
                            <div className={`p-4 rounded-lg border ${
                              settings?.deepAnalysisMode === 'full'
                                ? 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800'
                                : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                            }`}>
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className={`text-sm font-semibold ${
                                    settings?.deepAnalysisMode === 'full'
                                      ? 'text-purple-800 dark:text-purple-200'
                                      : 'text-blue-800 dark:text-blue-200'
                                  }`}>
                                    {t('fetch.deepAnalysis.mode')}: <span className="font-bold">{settings?.deepAnalysisMode === 'full' ? t('fetch.deepAnalysis.modeFull') : t('fetch.deepAnalysis.modeStandard')}</span>
                                  </p>
                                  <p className={`text-xs mt-1 ${
                                    settings?.deepAnalysisMode === 'full'
                                      ? 'text-purple-700 dark:text-purple-300'
                                      : 'text-blue-700 dark:text-blue-300'
                                  }`}>
                                    {settings?.deepAnalysisMode === 'full'
                                      ? t('fetch.deepAnalysis.modeFullDesc')
                                      : t('fetch.deepAnalysis.modeStandardDesc')}
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => navigate('/settings?tab=analysis')}
                                  className={`px-4 py-2 text-sm font-medium rounded-lg hover:opacity-90 transition-opacity ${
                                    settings?.deepAnalysisMode === 'full'
                                      ? 'bg-purple-600 text-white hover:bg-purple-700'
                                      : 'bg-blue-600 text-white hover:bg-blue-700'
                                  }`}
                                >
                                  {t('fetch.deepAnalysis.changeMode')}
                                </button>
                              </div>
                            </div>

                            {/* Min Relevance Score (to save papers) */}
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                {t('fetch.deepAnalysis.minRelevance.label')}: <span className="font-semibold text-blue-600 dark:text-blue-400">{minRelevance}%</span>
                              </label>
                              <input
                                type="range"
                                min="0"
                                max="100"
                                value={minRelevance}
                                onChange={(e) => setMinRelevance(Number(e.target.value))}
                                className="w-full"
                              />
                              {/* Quick-select points */}
                              <div className="grid grid-cols-6 gap-1 mt-2">
                                {[50, 60, 70, 75, 80, 85].map((point) => (
                                  <button
                                    key={point}
                                    type="button"
                                    onClick={() => setMinRelevance(point)}
                                    className={`text-xs py-1.5 rounded transition-colors font-medium ${
                                      minRelevance === point
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                                    }`}
                                  >
                                    {point}
                                  </button>
                                ))}
                              </div>
                              <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                                <span>{t('fetch.deepAnalysis.minRelevance.saveMore')}</span>
                                <span>{t('fetch.deepAnalysis.minRelevance.saveRelevant')}</span>
                              </div>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                                {t('fetch.deepAnalysis.minRelevance.description')}
                              </p>
                            </div>

                            {/* Deep Analysis Threshold */}
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                {t('fetch.deepAnalysis.threshold.label')}: <span className="font-semibold text-blue-600 dark:text-blue-400">{deepAnalysisThreshold}/100</span>
                              </label>
                              <input
                                type="range"
                                min="0"
                                max="100"
                                value={deepAnalysisThreshold}
                                onChange={(e) => setDeepAnalysisThreshold(Number(e.target.value))}
                                className="w-full"
                              />
                              {/* Quick-select points */}
                              <div className="grid grid-cols-6 gap-1 mt-2">
                                {[50, 60, 70, 75, 80, 85].map((point) => (
                                  <button
                                    key={point}
                                    type="button"
                                    onClick={() => setDeepAnalysisThreshold(point)}
                                    className={`text-xs py-1.5 rounded transition-colors font-medium ${
                                      deepAnalysisThreshold === point
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                                    }`}
                                  >
                                    {point}
                                  </button>
                                ))}
                              </div>
                              <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                                <span>{t('fetch.deepAnalysis.threshold.analyzeMore')}</span>
                                <span>{t('fetch.deepAnalysis.threshold.onlyRelevant')}</span>
                              </div>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                                {t('fetch.deepAnalysis.threshold.description')}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
          {result && !displayIsFetching ? (
            <button
              onClick={onClose}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 btn-interactive"
            >
              {t('fetch.footer.done')}
            </button>
          ) : displayIsFetching ? (
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>{t('fetch.footer.fetching')}</span>
              </div>
              <button
                onClick={handleCancelFetch}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2 btn-interactive"
              >
                <Square className="w-4 h-4" />
                {t('fetch.footer.cancelFetch')}
              </button>
            </div>
          ) : (
            <>
              <button
                onClick={onClose}
                className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 btn-interactive"
              >
                {t('fetch.footer.cancel')}
              </button>
              <button
                onClick={handleStartFetch}
                disabled={!canStartFetch}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 btn-interactive"
              >
                <Play className="w-4 h-4" />
                {t('fetch.footer.startFetch')}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
