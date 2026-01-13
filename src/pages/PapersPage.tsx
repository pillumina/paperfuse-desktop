import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useDeletePaper, usePapers, usePapersByTag, usePaperCount, useSearchPapers, useTagsWithCounts } from '../hooks/usePapers';
import { useSettings } from '../hooks/useSettings';
import { useLanguage } from '../contexts/LanguageContext';
import { useAutoAnimate } from '@formkit/auto-animate/react';
import { VirtualPaperList } from '../components/papers/VirtualPaperList';
import { VirtualPaperGrid } from '../components/papers/VirtualPaperGrid';
import { PaperSearchBar } from '../components/papers/PaperSearchBar';
import { PaperFilters } from '../components/papers/PaperFilters';
import { ViewToggle } from '../components/papers/ViewToggle';
import { SortControl } from '../components/papers/SortControl';
import { LoadingSkeleton } from '../components/papers/LoadingSkeleton';
import { EmptyState } from '../components/papers/EmptyState';
import { Toast } from '../components/common/Toast';
import { KeyboardShortcuts } from '../components/common/KeyboardShortcuts';
import { Tooltip } from '../components/common/Tooltip';
import { QuickFilterChips } from '../components/papers/QuickFilterChips';
import { AddToCollectionDialog } from '../components/collections/AddToCollectionDialog';
import { AnalysisModeDialog, type AnalysisMode, type AnalysisLanguage } from '../components/papers/AnalysisModeDialog';
import { AnalysisProgressDialog } from '../components/papers/AnalysisProgressDialog';
import { AlertTriangle, Trash2, CheckSquare, Square, X, Hash, Calendar, Clock, Tag, Code2, Building2, AlertOctagon, FolderPlus, Sparkles } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import type { Paper } from '../lib/types';

type ViewMode = 'list' | 'grid';

export default function PapersPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [contentRef] = useAutoAnimate(/* optional config */);

  // View and filter state
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [selectedAffiliation, setSelectedAffiliation] = useState<string | null>(null);
  const [minScore, setMinScore] = useState<number | null>(null);
  const [dateRange, setDateRange] = useState<'today' | '7days' | '30days' | 'all' | null>(null);
  const [fetchedDateRange, setFetchedDateRange] = useState<'today' | '7days' | '30days' | 'all' | null>(null);
  const [onlyWithCode, setOnlyWithCode] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<'date' | 'fetchedDate' | 'score' | 'title'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [paperToDelete, setPaperToDelete] = useState<Paper | null>(null);

  // Batch selection state
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedPaperIds, setSelectedPaperIds] = useState<Set<string>>(new Set());
  const [showBatchDeleteConfirm, setShowBatchDeleteConfirm] = useState(false);
  const [showBatchSpamConfirm, setShowBatchSpamConfirm] = useState(false);
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null);

  // Toast notification state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // First-time user onboarding state
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Keyboard shortcuts modal state
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);

  // Add to collection dialog state
  const [showAddToCollectionDialog, setShowAddToCollectionDialog] = useState(false);

  // Analysis dialog state
  const [showAnalysisDialog, setShowAnalysisDialog] = useState(false);
  const [analysisProgressDialog, setAnalysisProgressDialog] = useState<{
    isOpen: boolean;
    current: number;
    total: number;
    currentPaperTitle: string;
    status: 'analyzing' | 'completed' | 'error';
    failed: number;
  }>({
    isOpen: false,
    current: 0,
    total: 0,
    currentPaperTitle: '',
    status: 'analyzing',
    failed: 0,
  });

  // Restore state from sessionStorage on mount
  useEffect(() => {
    const savedState = sessionStorage.getItem('papersPageState');
    if (savedState) {
      try {
        const state = JSON.parse(savedState);
        setViewMode(state.viewMode || 'list');
        setSearchQuery(state.searchQuery || '');
        setSelectedTag(state.selectedTag || null);
        setSelectedTopic(state.selectedTopic || null);
        setSelectedAffiliation(state.selectedAffiliation || null);
        setMinScore(state.minScore || null);
        setDateRange(state.dateRange || null);
        setFetchedDateRange(state.fetchedDateRange || null);
        setSortBy(state.sortBy || 'date');
        setSortOrder(state.sortOrder || 'desc');
      } catch (e) {
        console.error('Failed to restore state:', e);
      }
    }
  }, []);

  // Save state to sessionStorage when it changes
  useEffect(() => {
    const state = { viewMode, searchQuery, selectedTag, selectedTopic, selectedAffiliation, minScore, dateRange, fetchedDateRange, sortBy, sortOrder };
    sessionStorage.setItem('papersPageState', JSON.stringify(state));
  }, [viewMode, searchQuery, selectedTag, selectedTopic, selectedAffiliation, minScore, dateRange, fetchedDateRange, sortBy, sortOrder]);

  // Fetch papers based on active filters
  const {
    data: papers,
    isLoading,
    isError,
    refetch,
  } = searchQuery
    ? useSearchPapers(searchQuery)
    : selectedTag
    ? usePapersByTag(selectedTag)
    : usePapers({ limit: 100 }); // Show more papers to allow sorting

  const { data: paperCount } = usePaperCount();
  const { data: settings } = useSettings();

  // Display count: use paperCount if available, otherwise use papers length
  const displayCount = paperCount ?? papers?.length ?? 0;
  const { data: tagsWithCounts, isLoading: tagsLoading } = useTagsWithCounts(20);
  const deletePaperMutation = useDeletePaper();

  // Extract affiliations from papers with counts
  const affiliationsWithCounts = papers ? (() => {
    const affiliationMap = new Map<string, number>();
    papers.forEach(paper => {
      paper.authors.forEach(author => {
        if (author.affiliation) {
          const count = affiliationMap.get(author.affiliation) || 0;
          affiliationMap.set(author.affiliation, count + 1);
        }
      });
    });

    return Array.from(affiliationMap.entries())
      .map(([affiliation, count]) => ({ affiliation, count }))
      .sort((a, b) => b.count - a.count); // Sort by count descending
  })() : [];

  // Check for first-time user onboarding
  useEffect(() => {
    const hasSeenOnboarding = localStorage.getItem('hasSeenPapersOnboarding');
    if (!hasSeenOnboarding && paperCount === 0) {
      setShowOnboarding(true);
    }
  }, [paperCount]);

  // Keyboard shortcuts handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        // Only handle Escape key when in input
        if (e.key === 'Escape') {
          if (showKeyboardShortcuts) {
            setShowKeyboardShortcuts(false);
          } else if (isSelectionMode) {
            exitSelectionMode();
          }
        }
        return;
      }

      // Handle shortcuts when not typing
      switch (e.key) {
        case '?':
          e.preventDefault();
          setShowKeyboardShortcuts(prev => !prev);
          break;
        case '/':
          e.preventDefault();
          searchInputRef.current?.focus();
          break;
        case 'Escape':
          if (showKeyboardShortcuts) {
            setShowKeyboardShortcuts(false);
          } else if (isSelectionMode) {
            exitSelectionMode();
          } else if (searchQuery || selectedTag || selectedTopic || selectedAffiliation || minScore !== null || dateRange || fetchedDateRange || onlyWithCode) {
            clearAllFilters();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showKeyboardShortcuts, isSelectionMode, searchQuery, selectedTag, selectedTopic, selectedAffiliation, minScore, dateRange, fetchedDateRange, onlyWithCode]);

  const handleDismissOnboarding = () => {
    setShowOnboarding(false);
    localStorage.setItem('hasSeenPapersOnboarding', 'true');
  };

  // Filter and sort papers
  const filteredAndSortedPapers = () => {
    if (!papers) return [];

    let result = [...papers];

    // Filter by topic
    if (selectedTopic) {
      result = result.filter(paper =>
        paper.topics && paper.topics.includes(selectedTopic)
      );
    }

    // Filter by affiliation
    if (selectedAffiliation) {
      result = result.filter(paper =>
        paper.authors.some(author => author.affiliation === selectedAffiliation)
      );
    }

    // Filter by date range (published date)
    if (dateRange) {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const sevenDaysAgo = new Date(today);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const thirtyDaysAgo = new Date(today);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      result = result.filter(paper => {
        const paperDate = new Date(paper.published_date);
        switch (dateRange) {
          case 'today':
            // Paper is from today (compare dates, not times)
            const paperToday = new Date(paperDate.getFullYear(), paperDate.getMonth(), paperDate.getDate());
            return paperToday.getTime() === today.getTime();
          case '7days':
            return paperDate >= sevenDaysAgo;
          case '30days':
            return paperDate >= thirtyDaysAgo;
          default:
            return true;
        }
      });
    }

    // Filter by fetched date range (created_at)
    if (fetchedDateRange) {
      const now = new Date();

      // Get current date in local timezone
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const sevenDaysAgo = new Date(today);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const thirtyDaysAgo = new Date(today);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      result = result.filter(paper => {
        const paperDate = new Date(paper.created_at);
        switch (fetchedDateRange) {
          case 'today':
            // Paper was fetched today (compare dates, not times)
            const paperToday = new Date(paperDate.getFullYear(), paperDate.getMonth(), paperDate.getDate());
            return paperToday.getTime() === today.getTime();
          case '7days':
            return paperDate >= sevenDaysAgo;
          case '30days':
            return paperDate >= thirtyDaysAgo;
          default:
            return true;
        }
      });
    }

    // Filter by code availability
    if (onlyWithCode) {
      result = result.filter(paper => paper.code_available);
    }

    // Filter by minimum score
    if (minScore !== null) {
      result = result.filter(paper =>
        paper.filter_score !== null && paper.filter_score >= minScore
      );
    }

    // Sort papers
    result.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'date':
          comparison = new Date(a.published_date).getTime() - new Date(b.published_date).getTime();
          break;
        case 'fetchedDate':
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
        case 'score':
          // Papers without scores go last
          const aScore = a.filter_score ?? -1;
          const bScore = b.filter_score ?? -1;
          comparison = aScore - bScore;
          break;
        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return result;
  };

  const displayedPapers = filteredAndSortedPapers();

  // Check if paper has been analyzed (either deep or quick)
  const isPaperAnalyzed = (paper: Paper) => {
    return paper.is_deep_analyzed ||
      (paper.filter_score !== null &&
       paper.filter_reason !== null &&
       !paper.filter_reason.includes('No AI analysis'));
  };

  const handleDelete = (id: string) => {
    console.log('[PapersPage] handleDelete called with id:', id);

    // Find the paper from the papers array
    const paper = papers?.find(p => p.id === id);
    if (!paper) {
      console.error('[PapersPage] Paper not found:', id);
      return;
    }

    // If paper has been analyzed, show confirmation dialog
    if (isPaperAnalyzed(paper)) {
      setPaperToDelete(paper);
      setShowDeleteConfirm(true);
    } else {
      // No analysis, delete directly
      console.log('[PapersPage] Paper not analyzed, deleting directly');
      performDelete(id);
    }
  };

  const handleToggleSpam = async (id: string) => {
    try {
      await invoke('toggle_paper_spam', { id, isSpam: true });
      setToast({ message: t('card.markedAsSpam'), type: 'success' });
      // Refetch papers to update the list
      queryClient.invalidateQueries({ queryKey: ['papers'] });
    } catch (error) {
      console.error('Failed to mark paper as spam:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      setToast({ message: errorMessage, type: 'error' });
    }
  };

  const handleAnalyze = async (id: string, mode: AnalysisMode, _language: AnalysisLanguage) => {
    console.log('[PapersPage] handleAnalyze called with id:', id, 'mode:', mode);

    // Find the paper to get its title for progress display
    const paper = papers?.find(p => p.id === id);
    const paperTitle = paper?.title || 'Unknown Paper';

    // Show progress dialog
    setAnalysisProgressDialog({
      isOpen: true,
      current: 0,
      total: 1,
      currentPaperTitle: paperTitle,
      status: 'analyzing',
      failed: 0,
    });

    try {
      console.log('[PapersPage] Calling analyze_paper with:', {
        paperId: id,
        analysisMode: mode,
      });
      const result = await invoke('analyze_paper', {
        paperId: id,
        analysisMode: mode,
      });
      console.log('[PapersPage] Analysis successful, result:', result);

      // Update progress dialog to completed state
      setAnalysisProgressDialog(prev => ({
        ...prev,
        current: 1,
        status: 'completed',
      }));

      // Refresh both list and individual paper query
      refetch();
      queryClient.invalidateQueries({ queryKey: ['paper', id] });
    } catch (error) {
      console.error('[PapersPage] Analysis failed:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);

      // Update progress dialog to error state
      setAnalysisProgressDialog(prev => ({
        ...prev,
        current: 1,
        status: 'error',
        failed: 1,
      }));

      setToast({ message: errorMessage || '分析失败', type: 'error' });
    }
  };

  const performDelete = (id: string) => {
    console.log('[PapersPage] performDelete called with id:', id);
    deletePaperMutation.mutate(id, {
      onSuccess: () => {
        console.log('[PapersPage] Delete successful, refetching papers');
        setShowDeleteConfirm(false);
        setPaperToDelete(null);
        refetch();
        // Show success toast
        setToast({ message: t('common.buttons.save') + ' ' + t('common.labels.success').toLowerCase(), type: 'success' });
      },
      onError: (error) => {
        console.error('[PapersPage] Delete failed:', error);
        setShowDeleteConfirm(false);
        setPaperToDelete(null);
        setToast({ message: t('errors.deleteFailed') || 'Failed to delete paper', type: 'error' });
      },
    });
  };

  // Batch selection handlers
  const togglePaperSelection = (paperId: string, event?: React.MouseEvent | KeyboardEvent) => {
    // Find the index of this paper in the displayed papers
    const paperIndex = displayedPapers.findIndex(p => p.id === paperId);

    // Check if Shift key is pressed and we have a last selected index
    const isShiftClick = event?.shiftKey && lastSelectedIndex !== null && paperIndex !== -1;

    if (isShiftClick) {
      // Range selection: select all papers between lastSelectedIndex and current paperIndex
      const start = Math.min(lastSelectedIndex, paperIndex);
      const end = Math.max(lastSelectedIndex, paperIndex);
      const papersToSelect = displayedPapers.slice(start, end + 1).map(p => p.id);

      setSelectedPaperIds(prev => {
        const newSet = new Set(prev);
        // Toggle: if any in range are not selected, select all; otherwise deselect all
        const shouldSelect = papersToSelect.some(id => !newSet.has(id));
        if (shouldSelect) {
          papersToSelect.forEach(id => newSet.add(id));
        } else {
          papersToSelect.forEach(id => newSet.delete(id));
        }
        return newSet;
      });
    } else {
      // Normal selection: toggle individual paper
      setSelectedPaperIds(prev => {
        const newSet = new Set(prev);
        if (newSet.has(paperId)) {
          newSet.delete(paperId);
        } else {
          newSet.add(paperId);
        }
        return newSet;
      });
      // Update last selected index for future Shift+click
      setLastSelectedIndex(paperIndex !== -1 ? paperIndex : null);
    }

    // Auto-enter selection mode if not already in it
    if (!isSelectionMode) {
      setIsSelectionMode(true);
    }
  };

  const toggleSelectAll = () => {
    if (selectedPaperIds.size === displayedPapers.length) {
      // Deselect all - also exit selection mode
      setSelectedPaperIds(new Set());
      setIsSelectionMode(false);
    } else {
      // Select all
      setSelectedPaperIds(new Set(displayedPapers.map(p => p.id)));
    }
  };

  const exitSelectionMode = () => {
    setIsSelectionMode(false);
    setSelectedPaperIds(new Set());
  };

  const handleBatchDelete = async () => {
    if (selectedPaperIds.size === 0) return;

    console.log('[PapersPage] Batch deleting papers:', selectedPaperIds.size);

    try {
      // Call batch delete command
      await invoke('batch_delete_papers', { paperIds: Array.from(selectedPaperIds) });
      console.log('[PapersPage] Batch delete successful');
      setShowBatchDeleteConfirm(false);
      exitSelectionMode();
      refetch();
      // Show success toast
      setToast({ message: t('papers.errors.deleteSuccess', { count: selectedPaperIds.size }), type: 'success' });
    } catch (error) {
      console.error('[PapersPage] Batch delete failed:', error);
      setShowBatchDeleteConfirm(false);
      setToast({ message: t('papers.errors.batchDeleteFailed'), type: 'error' });
    }
  };

  const handleBatchSpam = async () => {
    if (selectedPaperIds.size === 0) return;

    console.log('[PapersPage] Batch marking papers as spam:', selectedPaperIds.size);

    try {
      // Mark all selected papers as spam
      await Promise.all(
        Array.from(selectedPaperIds).map(id =>
          invoke('toggle_paper_spam', { id, isSpam: true })
        )
      );
      console.log('[PapersPage] Batch spam successful');
      setShowBatchSpamConfirm(false);
      exitSelectionMode();
      refetch();
      // Show success toast
      setToast({ message: t('papers.errors.batchSpamSuccess', { count: selectedPaperIds.size, plural: selectedPaperIds.size !== 1 ? 's' : '' }).replace('{{plural}}', selectedPaperIds.size !== 1 ? 's' : ''), type: 'success' });
    } catch (error) {
      console.error('[PapersPage] Batch spam failed:', error);
      setShowBatchSpamConfirm(false);
      setToast({ message: t('papers.errors.batchSpamFailed'), type: 'error' });
    }
  };

  const handleAnalysisConfirm = async (mode: AnalysisMode, _language: AnalysisLanguage) => {
    if (selectedPaperIds.size === 0) return;

    const paperIds = Array.from(selectedPaperIds);
    const total = paperIds.length;

    console.log('[PapersPage] Starting batch analysis:', { total, mode });

    // Get titles for progress display
    const selectedPapers = papers?.filter(p => paperIds.includes(p.id)) || [];
    const paperTitles = selectedPapers.map(p => ({ id: p.id, title: p.title }));

    // Initialize progress dialog
    setAnalysisProgressDialog({
      isOpen: true,
      current: 0,
      total,
      currentPaperTitle: paperTitles[0]?.title || '',
      status: 'analyzing',
      failed: 0,
    });

    try {
      let failed = 0;

      // Analyze papers one by one to show progress
      for (let i = 0; i < paperIds.length; i++) {
        const paperId = paperIds[i];
        const paperTitle = paperTitles.find(p => p.id === paperId)?.title || '';

        // Update progress
        setAnalysisProgressDialog(prev => ({
          ...prev,
          current: i + 1,
          currentPaperTitle: paperTitle,
        }));

        try {
          await invoke('analyze_paper', {
            paperId,
            analysisMode: mode,
          });
        } catch (error) {
          console.error(`[PapersPage] Failed to analyze paper ${paperId}:`, error);
          failed++;
        }
      }

      // Complete progress
      setAnalysisProgressDialog(prev => ({
        ...prev,
        status: failed > 0 ? 'error' : 'completed',
        failed,
      }));

      // Refresh data - both list and individual paper queries
      refetch();
      // Invalidate individual paper queries so detail pages show fresh data
      paperIds.forEach(id => {
        queryClient.invalidateQueries({ queryKey: ['paper', id] });
      });

      // Show success toast
      const success = total - failed;
      if (failed === 0) {
        setToast({
          message: t('papers.errors.batchAnalysisSuccess', { count: total, plural: total !== 1 ? 's' : '' }).replace('{{plural}}', total !== 1 ? 's' : ''),
          type: 'success',
        });
      } else {
        setToast({
          message: t('papers.errors.batchAnalysisPartial', { success, failed }),
          type: 'error',
        });
      }
    } catch (error) {
      console.error('[PapersPage] Batch analysis failed:', error);
      setAnalysisProgressDialog(prev => ({
        ...prev,
        status: 'error',
      }));
      setToast({
        message: t('papers.errors.batchAnalysisFailed'),
        type: 'error',
      });
    }
  };

  // Clear all filters
  const clearAllFilters = () => {
    setSearchQuery('');
    setSelectedTag(null);
    setSelectedTopic(null);
    setSelectedAffiliation(null);
    setMinScore(null);
    setDateRange(null);
    setFetchedDateRange(null);
    setOnlyWithCode(false);
  };

  // Handle quick filter changes
  const handleQuickFilterChange = (filter: {
    dateRange?: 'today' | '7days' | '30days' | 'all' | null;
    fetchedDateRange?: 'today' | '7days' | '30days' | 'all' | null;
    minScore?: number | null;
    codeAvailable?: boolean | null;
  }) => {
    if (filter.dateRange !== undefined) {
      setDateRange(filter.dateRange);
    }
    if (filter.fetchedDateRange !== undefined) {
      setFetchedDateRange(filter.fetchedDateRange);
    }
    if (filter.minScore !== undefined) {
      setMinScore(filter.minScore);
    }
    if (filter.codeAvailable !== undefined) {
      setOnlyWithCode(filter.codeAvailable === true);
    }
  };

  // Handle loading state
  if (isLoading) {
    return (
      <div className="p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            {t('papers.title')}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {t('papers.description')}
            {` (${t('papers.page.total', { count: displayCount })})`}
          </p>
        </div>
        <LoadingSkeleton view={viewMode} count={6} />
      </div>
    );
  }

  // Handle error state
  if (isError) {
    return (
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            {t('papers.title')}
          </h1>
        </div>
        <div className="flex flex-col items-center justify-center py-20">
          <p className="text-red-600 dark:text-red-400 mb-4">
            {t('papers.page.failedToLoad')}
          </p>
          <button
            onClick={() => refetch()}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:shadow-sm font-medium transition-all duration-200 cursor-pointer focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            {t('papers.page.tryAgain')}
          </button>
        </div>
      </div>
    );
  }

  // Handle empty state
  if (!displayedPapers || displayedPapers.length === 0) {
    return (
      <div className="p-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            {t('papers.title')}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {t('papers.description')}
            {` (${t('papers.page.total', { count: displayCount })})`}
          </p>
        </div>
        <ViewToggle viewMode={viewMode} onViewChange={setViewMode} />
        </div>

      {/* Search Bar */}
      <div className="mb-4">
        <PaperSearchBar
          ref={searchInputRef}
          value={searchQuery}
          onChange={setSearchQuery}
          isSearching={isLoading}
        />
      </div>

      {/* Quick Filter Chips - only show when not searching */}
      {!searchQuery && (
        <QuickFilterChips
          onFilterChange={handleQuickFilterChange}
          currentFilters={{ dateRange: dateRange ?? null, fetchedDateRange: fetchedDateRange ?? null, minScore, onlyWithCode }}
        />
      )}

      {/* Sort Control and Filters */}
      <div className="mb-6 grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Filters Sidebar */}
        <div className="lg:col-span-1">
          <PaperFilters
            selectedTag={selectedTag}
            onTagChange={setSelectedTag}
            selectedTopic={selectedTopic}
            onTopicChange={setSelectedTopic}
            selectedAffiliation={selectedAffiliation}
            onAffiliationChange={setSelectedAffiliation}
            minScore={minScore}
            onScoreChange={setMinScore}
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
            fetchedDateRange={fetchedDateRange}
            onFetchedDateRangeChange={setFetchedDateRange}
            topics={settings?.topics || []}
            tagsWithCounts={tagsWithCounts || []}
            affiliationsWithCounts={affiliationsWithCounts}
            tagsLoading={tagsLoading}
          />
        </div>

        {/* Main Content Area */}
        <div className="lg:col-span-3">
          {/* Sort Control */}
          <div className="mb-6">
            <SortControl
              sortBy={sortBy}
              sortOrder={sortOrder}
              onSortByChange={setSortBy}
              onSortOrderChange={setSortOrder}
            />
          </div>

          {/* Empty State Message */}
          <div className="flex items-center justify-center">
            <EmptyState
              type={searchQuery || selectedTag || selectedTopic || selectedAffiliation ? 'no-results' : 'no-papers'}
              searchQuery={searchQuery}
              onClearFilters={clearAllFilters}
            />
          </div>
        </div>
      </div>
      </div>
    );
  }

  // Handle papers display
  return (
    <div className="p-8">
      {/* First-Time User Onboarding */}
      {showOnboarding && (
        <div className="mb-6 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg p-6 border border-blue-200 dark:border-blue-800">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl">👋</span>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {t('papers.onboarding.welcome')}
                </h3>
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
                {t('papers.onboarding.getStarted')}
              </p>
              <div className="space-y-2 text-sm">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                    1
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 dark:text-white">{t('papers.onboarding.step1')}</p>
                    <p className="text-gray-600 dark:text-gray-400">{t('papers.onboarding.step1Desc')}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                    2
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 dark:text-white">{t('papers.onboarding.step2')}</p>
                    <p className="text-gray-600 dark:text-gray-400">{t('papers.onboarding.step2Desc')}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                    3
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 dark:text-white">{t('papers.onboarding.step3')}</p>
                    <p className="text-gray-600 dark:text-gray-400">{t('papers.onboarding.step3Desc')}</p>
                  </div>
                </div>
              </div>
              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => {
                    navigate('/settings');
                    handleDismissOnboarding();
                  }}
                  className="px-4 py-2 border border-blue-600 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 font-medium transition-colors focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  {t('papers.onboarding.goToSettings')}
                </button>
                <button
                  onClick={handleDismissOnboarding}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  {t('papers.onboarding.gotIt')}
                </button>
              </div>
            </div>
            <button
              onClick={handleDismissOnboarding}
              className="flex-shrink-0 p-1 hover:bg-white/50 dark:hover:bg-white/10 rounded transition-colors focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              aria-label="Dismiss onboarding"
            >
              <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            {t('papers.title')}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {isSelectionMode
              ? t('papers.page.selected', { count: selectedPaperIds.size })
              : t('papers.page.showing', {
                  displayed: displayedPapers.length,
                  total: displayCount,
                  plural: displayedPapers.length !== 1 ? 's' : ''
                }).replace('{{plural}}', displayedPapers.length !== 1 ? 's' : '')
            }
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isSelectionMode ? (
            <>
              {/* Selection Mode Actions */}
              <Tooltip content={selectedPaperIds.size === displayedPapers.length ? t('papers.tooltips.deselectAll') : t('papers.tooltips.selectAll')}>
                <button
                  onClick={toggleSelectAll}
                  className="px-3 py-1.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 font-medium transition-colors focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 flex items-center gap-1.5"
                >
                  {selectedPaperIds.size === displayedPapers.length ? (
                    <>
                      <Square className="w-3.5 h-3.5" />
                      {t('papers.page.deselectAll')}
                    </>
                  ) : (
                    <>
                      <CheckSquare className="w-3.5 h-3.5" />
                      {t('papers.page.selectAll')}
                    </>
                  )}
                </button>
              </Tooltip>
              <Tooltip content={t('papers.tooltips.deleteSelected', { count: selectedPaperIds.size, plural: selectedPaperIds.size !== 1 ? 's' : '' }).replace('{{plural}}', selectedPaperIds.size !== 1 ? 's' : '')}>
                <button
                  onClick={() => setShowBatchDeleteConfirm(true)}
                  disabled={selectedPaperIds.size === 0}
                  className="px-3 py-1.5 text-xs bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:ring-2 focus:ring-red-500 focus:ring-offset-2 flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  {t('papers.page.deleteSelected', { count: selectedPaperIds.size })}
                </button>
              </Tooltip>
              <Tooltip content={t('papers.toolbar.markAsSpamTooltip', { count: selectedPaperIds.size, plural: selectedPaperIds.size !== 1 ? 's' : '' }).replace('{{plural}}', selectedPaperIds.size !== 1 ? 's' : '')}>
                <button
                  onClick={() => setShowBatchSpamConfirm(true)}
                  disabled={selectedPaperIds.size === 0}
                  className="px-3 py-1.5 text-xs bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 flex items-center gap-1.5"
                >
                  <AlertOctagon className="w-3.5 h-3.5" />
                  {t('papers.toolbar.markAsSpam')}
                </button>
              </Tooltip>
              <Tooltip content={t('papers.toolbar.addCollectionTooltip', { count: selectedPaperIds.size, plural: selectedPaperIds.size !== 1 ? 's' : '' }).replace('{{plural}}', selectedPaperIds.size !== 1 ? 's' : '')}>
                <button
                  onClick={() => setShowAddToCollectionDialog(true)}
                  disabled={selectedPaperIds.size === 0}
                  className="px-3 py-1.5 text-xs bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 flex items-center gap-1.5"
                >
                  <FolderPlus className="w-3.5 h-3.5" />
                  {t('papers.toolbar.addCollection')}
                </button>
              </Tooltip>
              <Tooltip content={t('papers.toolbar.batchAnalyzeTooltip', { count: selectedPaperIds.size, plural: selectedPaperIds.size !== 1 ? 's' : '' }).replace('{{plural}}', selectedPaperIds.size !== 1 ? 's' : '')}>
                <button
                  onClick={() => setShowAnalysisDialog(true)}
                  disabled={selectedPaperIds.size === 0}
                  className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  {t('papers.toolbar.batchAnalyze')}
                </button>
              </Tooltip>
              <Tooltip content={t('papers.tooltips.exitSelection')}>
                <button
                  onClick={exitSelectionMode}
                  className="px-3 py-1.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 font-medium transition-colors focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 flex items-center gap-1.5"
                >
                  <X className="w-3.5 h-3.5" />
                  {t('papers.page.cancelSelection')}
                </button>
              </Tooltip>
            </>
          ) : (
            <>
              {/* Normal Mode Actions */}
              <Tooltip content={t('papers.tooltips.enterSelection')}>
                <button
                  onClick={() => setIsSelectionMode(true)}
                  className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 font-medium transition-colors focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                >
                  {t('papers.page.select')}
                </button>
              </Tooltip>
              <Tooltip content={t('papers.page.switchView')}>
                <ViewToggle viewMode={viewMode} onViewChange={setViewMode} />
              </Tooltip>
            </>
          )}
        </div>
      </div>

      {/* Search Bar */}
      <div className="mb-4">
        <PaperSearchBar
          ref={searchInputRef}
          value={searchQuery}
          onChange={setSearchQuery}
          isSearching={isLoading}
        />
      </div>

      {/* Quick Filter Chips - only show when not searching */}
      {!searchQuery && (
        <QuickFilterChips
          onFilterChange={handleQuickFilterChange}
          currentFilters={{ dateRange: dateRange ?? null, fetchedDateRange: fetchedDateRange ?? null, minScore, onlyWithCode }}
        />
      )}

      {/* Filter Status Indicator */}
      {(searchQuery || selectedTag || selectedTopic || selectedAffiliation || minScore !== null || dateRange || fetchedDateRange || onlyWithCode) && (
        <div className="mb-4 flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <span className="font-medium">{t('papers.filterTags.showing', { displayed: displayedPapers.length, total: displayCount })}</span>
            <span className="text-gray-400">•</span>
            <button
              onClick={clearAllFilters}
              className="text-blue-600 dark:text-blue-400 hover:underline font-medium focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded px-1"
            >
              {t('papers.filterTags.clear')}
            </button>
          </div>

          {/* Active Filter Tags */}
          <div className="flex items-center gap-2 flex-wrap">
            {searchQuery && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-white dark:bg-gray-800 border border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 rounded text-xs">
                {t('papers.filterTags.search', { query: searchQuery })}
                <button
                  onClick={() => setSearchQuery('')}
                  className="hover:text-blue-900 dark:hover:text-blue-100 focus:ring-2 focus:ring-blue-500 rounded"
                  aria-label={t('papers.filterTags.clearSearch')}
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {selectedTag && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-white dark:bg-gray-800 border border-green-300 dark:border-green-700 text-green-700 dark:text-green-300 rounded text-xs">
                <Tag className="w-3 h-3" />
                {selectedTag}
                <button
                  onClick={() => setSelectedTag(null)}
                  className="hover:text-green-900 dark:hover:text-green-100 focus:ring-2 focus:ring-green-500 rounded"
                  aria-label={t('papers.filterTags.clearTag')}
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {selectedTopic && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-white dark:bg-gray-800 border border-purple-300 dark:border-purple-700 text-purple-700 dark:text-purple-300 rounded text-xs">
                <Hash className="w-3 h-3" />
                {settings?.topics?.find(t => t.key === selectedTopic)?.label || selectedTopic}
                <button
                  onClick={() => setSelectedTopic(null)}
                  className="hover:text-purple-900 dark:hover:text-purple-100 focus:ring-2 focus:ring-purple-500 rounded"
                  aria-label={t('papers.filterTags.clearTopic')}
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {selectedAffiliation && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-white dark:bg-gray-800 border border-orange-300 dark:border-orange-700 text-orange-700 dark:text-orange-300 rounded text-xs">
                <Building2 className="w-3 h-3" />
                {selectedAffiliation.length > 15 ? selectedAffiliation.substring(0, 15) + '...' : selectedAffiliation}
                <button
                  onClick={() => setSelectedAffiliation(null)}
                  className="hover:text-orange-900 dark:hover:text-orange-100 focus:ring-2 focus:ring-orange-500 rounded"
                  aria-label={t('papers.filterTags.clearAffiliation')}
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {minScore !== null && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-white dark:bg-gray-800 border border-orange-300 dark:border-orange-700 text-orange-700 dark:text-orange-300 rounded text-xs">
                {t('papers.filterTags.score', { score: minScore })}
                <button
                  onClick={() => setMinScore(null)}
                  className="hover:text-orange-900 dark:hover:text-orange-100 focus:ring-2 focus:ring-orange-500 rounded"
                  aria-label={t('papers.filterTags.clearScore')}
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {dateRange && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-white dark:bg-gray-800 border border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300 rounded text-xs">
                <Calendar className="w-3 h-3" />
                {dateRange === 'today' ? t('papers.filterTags.today') : dateRange === '7days' ? t('papers.filterTags.7days') : dateRange === '30days' ? t('papers.filterTags.30days') : 'All time'}
                <button
                  onClick={() => setDateRange(null)}
                  className="hover:text-indigo-900 dark:hover:text-indigo-100 focus:ring-2 focus:ring-indigo-500 rounded"
                  aria-label={t('papers.filterTags.clearDate')}
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {fetchedDateRange && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-white dark:bg-gray-800 border border-cyan-300 dark:border-cyan-700 text-cyan-700 dark:text-cyan-300 rounded text-xs">
                <Clock className="w-3 h-3" />
                {fetchedDateRange === 'today' ? t('papers.filterTags.fetchedToday') : fetchedDateRange === '7days' ? t('papers.filterTags.fetched7days') : fetchedDateRange === '30days' ? t('papers.filterTags.fetched30days') : t('papers.filterTags.fetchedAllTime')}
                <button
                  onClick={() => setFetchedDateRange(null)}
                  className="hover:text-cyan-900 dark:hover:text-cyan-100 focus:ring-2 focus:ring-cyan-500 rounded"
                  aria-label={t('papers.filterTags.clearFetchedDate')}
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {onlyWithCode && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-white dark:bg-gray-800 border border-teal-300 dark:border-teal-700 text-teal-700 dark:text-teal-300 rounded text-xs">
                <Code2 className="w-3 h-3" />
                {t('papers.filterTags.hasCode')}
                <button
                  onClick={() => setOnlyWithCode(false)}
                  className="hover:text-teal-900 dark:hover:text-teal-100 focus:ring-2 focus:ring-teal-500 rounded"
                  aria-label={t('papers.filterTags.clearCode')}
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
          </div>
        </div>
      )}

      {/* Filters and Papers */}
      <div className="mb-6 grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Filters Sidebar */}
        <div className="lg:col-span-1">
          <PaperFilters
            selectedTag={selectedTag}
            onTagChange={setSelectedTag}
            selectedTopic={selectedTopic}
            onTopicChange={setSelectedTopic}
            selectedAffiliation={selectedAffiliation}
            onAffiliationChange={setSelectedAffiliation}
            minScore={minScore}
            onScoreChange={setMinScore}
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
            fetchedDateRange={fetchedDateRange}
            onFetchedDateRangeChange={setFetchedDateRange}
            topics={settings?.topics || []}
            tagsWithCounts={tagsWithCounts || []}
            affiliationsWithCounts={affiliationsWithCounts}
            tagsLoading={tagsLoading}
          />
        </div>

        {/* Main Content Area */}
        <div className="lg:col-span-3">
          {/* Sort Control */}
          <div className="mb-4">
            <SortControl
              sortBy={sortBy}
              sortOrder={sortOrder}
              onSortByChange={setSortBy}
              onSortOrderChange={setSortOrder}
            />
          </div>

          {/* Papers List/Grid with Virtual Scrolling */}
          <div ref={contentRef} className="transition-all duration-300">
            {viewMode === 'list' ? (
              <VirtualPaperList
                papers={displayedPapers}
                onDelete={handleDelete}
                onToggleSpam={handleToggleSpam}
                onAnalyze={handleAnalyze}
                isSelectionMode={isSelectionMode}
                selectedPaperIds={selectedPaperIds}
                onToggleSelection={togglePaperSelection}
                topics={settings?.topics || []}
              />
            ) : (
              <VirtualPaperGrid
                papers={displayedPapers}
                onDelete={handleDelete}
                onToggleSpam={handleToggleSpam}
                onAnalyze={handleAnalyze}
                isSelectionMode={isSelectionMode}
                selectedPaperIds={selectedPaperIds}
                onToggleSelection={togglePaperSelection}
                topics={settings?.topics || []}
              />
            )}
          </div>
        </div>
      </div>

      {/* Batch Delete Confirmation Dialog */}
      {showBatchDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-shrink-0 w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {t('papers.deleteDialog.confirm', { count: selectedPaperIds.size, plural: selectedPaperIds.size !== 1 ? 's' : '' }).replace('{{plural}}', selectedPaperIds.size !== 1 ? 's' : '')}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {t('papers.deleteDialog.info')}
                </p>
              </div>
            </div>

            <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
              <p className="text-sm text-yellow-800 dark:text-yellow-300 font-medium">
                {t('papers.deleteDialog.confirm', { count: selectedPaperIds.size, plural: selectedPaperIds.size !== 1 ? 's' : '' }).replace('{{plural}}', selectedPaperIds.size !== 1 ? 's' : '')}
              </p>
              <p className="text-xs text-yellow-700 dark:text-yellow-400 mt-2">
                {t('papers.deleteDialog.detail')}
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowBatchDeleteConfirm(false)}
                className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 font-medium transition-colors focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
              >
                {t('papers.deleteDialog.cancel')}
              </button>
              <button
                onClick={handleBatchDelete}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition-colors focus:ring-2 focus:ring-red-500 focus:ring-offset-2 flex items-center justify-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                {t('papers.deleteDialog.delete', { count: selectedPaperIds.size, plural: selectedPaperIds.size !== 1 ? 's' : '' }).replace('{{plural}}', selectedPaperIds.size !== 1 ? 's' : '')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Batch Spam Confirmation Dialog */}
      {showBatchSpamConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-shrink-0 w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center">
                <AlertOctagon className="w-6 h-6 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {t('papers.batchSpamDialog.title')}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {t('papers.batchSpamDialog.message', { count: selectedPaperIds.size, plural: selectedPaperIds.size !== 1 ? 's' : '' }).replace('{{plural}}', selectedPaperIds.size !== 1 ? 's' : '')}
                </p>
              </div>
            </div>

            <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <p className="text-sm text-blue-800 dark:text-blue-300 font-medium">
                {t('papers.batchSpamDialog.info')}
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowBatchSpamConfirm(false)}
                className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 font-medium transition-colors focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
              >
                {t('papers.batchSpamDialog.cancel')}
              </button>
              <button
                onClick={handleBatchSpam}
                className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-medium transition-colors focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 flex items-center justify-center gap-2"
              >
                <AlertOctagon className="w-4 h-4" />
                {t('papers.batchSpamDialog.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog for Analyzed Papers */}
      {showDeleteConfirm && paperToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-shrink-0 w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {t('papers.deleteDialog.title')}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {t('papers.deleteDialog.description')}
                </p>
              </div>
            </div>

            <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
              <p className="text-sm text-yellow-800 dark:text-yellow-300 font-medium mb-1">
                {t('papers.deleteDialog.warning')}
              </p>
              <p className="text-xs text-yellow-700 dark:text-yellow-400 mb-2">
                {paperToDelete.title.length > 100
                  ? paperToDelete.title.substring(0, 100) + '...'
                  : paperToDelete.title}
              </p>
              <p className="text-xs text-yellow-700 dark:text-yellow-400">
                {t('papers.deleteDialog.analyzedWarning')}
                {paperToDelete.is_deep_analyzed && (
                  <span className="block mt-1">{t('papers.deleteDialog.deepAnalysis')}</span>
                )}
                {!paperToDelete.is_deep_analyzed && paperToDelete.filter_score !== null && (
                  <span className="block mt-1">{t('papers.deleteDialog.quickAnalysis')}</span>
                )}
                {paperToDelete.ai_summary && (
                  <span className="block mt-1">{t('papers.deleteDialog.aiSummary')}</span>
                )}
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setPaperToDelete(null);
                }}
                className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 font-medium transition-colors focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
              >
                {t('papers.deleteDialog.cancel')}
              </button>
              <button
                onClick={() => performDelete(paperToDelete.id)}
                disabled={deletePaperMutation.isPending}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:ring-2 focus:ring-red-500 focus:ring-offset-2 flex items-center justify-center gap-2"
              >
                {deletePaperMutation.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    {t('papers.deleteDialog.deleting')}
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    {t('papers.deleteDialog.deleteAnyway')}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Keyboard Shortcuts Modal */}
      <KeyboardShortcuts
        isOpen={showKeyboardShortcuts}
        onClose={() => setShowKeyboardShortcuts(false)}
      />

      {/* Add to Collection Dialog */}
      <AddToCollectionDialog
        isOpen={showAddToCollectionDialog}
        onClose={() => setShowAddToCollectionDialog(false)}
        paperIds={Array.from(selectedPaperIds)}
      />

      {/* Analysis Mode Dialog */}
      <AnalysisModeDialog
        isOpen={showAnalysisDialog}
        onClose={() => setShowAnalysisDialog(false)}
        onConfirm={handleAnalysisConfirm}
        paperCount={selectedPaperIds.size}
      />

      {/* Analysis Progress Dialog */}
      <AnalysisProgressDialog
        isOpen={analysisProgressDialog.isOpen}
        onClose={() => setAnalysisProgressDialog(prev => ({ ...prev, isOpen: false }))}
        current={analysisProgressDialog.current}
        total={analysisProgressDialog.total}
        currentPaperTitle={analysisProgressDialog.currentPaperTitle}
        status={analysisProgressDialog.status}
        failed={analysisProgressDialog.failed}
      />
    </div>
  );
}
