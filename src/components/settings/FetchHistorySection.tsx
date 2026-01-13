import { CheckCircle, XCircle, Clock, XCircleIcon, AlertCircle, Trash2 } from 'lucide-react';
import { useFetchHistory } from '../../hooks/useFetchHistory';
import { useLanguage } from '../../contexts/LanguageContext';
import { useQueryClient } from '@tanstack/react-query';
import { invoke } from '@tauri-apps/api/core';
import { useState } from 'react';

export function FetchHistorySection() {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const { data: history, isLoading, error } = useFetchHistory({ limit: 50 });
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingId(id);
    try {
      await invoke('delete_fetch_history_entry', { id });
      // Invalidate and refetch fetch history
      queryClient.invalidateQueries({ queryKey: ['fetch-history'] });
    } catch (error) {
      console.error('Failed to delete fetch history entry:', error);
    } finally {
      setDeletingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500 dark:text-gray-400">{t('settings.fetchHistory.loading')}</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <p className="text-red-600 dark:text-red-400">{t('settings.fetchHistory.error')}</p>
      </div>
    );
  }

  if (!history || history.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 dark:text-gray-400">{t('settings.fetchHistory.noHistory')}</p>
      </div>
    );
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'cancelled':
        return <XCircleIcon className="w-5 h-5 text-gray-500" />;
      case 'running':
        return <Clock className="w-5 h-5 text-blue-500 animate-spin" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return t('settings.fetchHistory.status.completed');
      case 'failed':
        return t('settings.fetchHistory.status.failed');
      case 'cancelled':
        return t('settings.fetchHistory.status.cancelled');
      case 'running':
        return t('settings.fetchHistory.status.running');
      default:
        return status;
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffSecs = Math.floor(diffMs / 1000);
      const diffMins = Math.floor(diffSecs / 60);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffSecs < 60) return 'just now';
      if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
      if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
      if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
      return date.toLocaleDateString();
    } catch {
      return dateString;
    }
  };

  const formatDuration = (startDate: string, endDate: string) => {
    try {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const diffMs = end.getTime() - start.getTime();
      const diffSecs = Math.floor(diffMs / 1000);
      const diffMins = Math.floor(diffSecs / 60);

      if (diffSecs < 60) return `${diffSecs}s`;
      if (diffMins < 60) return `${diffMins}m`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ${diffMins % 60}m`;
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays}d ${diffHours % 24}h`;
    } catch {
      return '';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          {t('settings.fetchHistory.title')}
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {t('settings.fetchHistory.description')}
        </p>
      </div>

      <div className="space-y-3">
        {history.map((entry) => (
          <div
            key={entry.id}
            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden group"
          >
            {/* Header - always visible */}
            <div
              className="p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
              onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  {getStatusIcon(entry.status)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-gray-900 dark:text-gray-100">
                        {getStatusText(entry.status)}
                      </span>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {entry.completed_at ? formatDate(entry.completed_at) : formatDate(entry.started_at)}
                        {entry.completed_at && entry.completed_at !== entry.started_at && (
                          <span className="text-xs text-gray-400 dark:text-gray-500 ml-1">
                            ({formatDuration(entry.started_at, entry.completed_at)})
                          </span>
                        )}
                      </span>
                    </div>

                    {/* Stats */}
                    <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400">
                      <span>
                        {t('settings.fetchHistory.papersFetched')}: {entry.papers_fetched}
                      </span>
                      <span>
                        {t('settings.fetchHistory.papersAnalyzed')}: {entry.papers_analyzed}
                      </span>
                      <span>
                        {t('settings.fetchHistory.papersSaved')}: {entry.papers_saved}
                      </span>
                      <span>
                        {t('settings.fetchHistory.papersFiltered')}: {entry.papers_filtered}
                      </span>
                    </div>

                    {/* Error message */}
                    {entry.error_message && (
                      <div className="mt-2 text-sm text-red-600 dark:text-red-400">
                        {entry.error_message}
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 ml-2">
                  {/* Delete button */}
                  <button
                    onClick={(e) => handleDelete(entry.id, e)}
                    disabled={deletingId === entry.id}
                    className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    title={t('settings.fetchHistory.deleteEntry')}
                  >
                    {deletingId === entry.id ? (
                      <Clock className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>

                  {/* Expand indicator */}
                  <svg
                    className={`w-5 h-5 text-gray-400 transition-transform ${
                      expandedId === entry.id ? 'transform rotate-180' : ''
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </div>
              </div>
            </div>

            {/* Expandable paper list */}
            {expandedId === entry.id && entry.papers && entry.papers.length > 0 && (
              <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-850">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  {t('settings.fetchHistory.savedPapers')} ({entry.papers.length})
                </h4>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {entry.papers.map((paper) => (
                    <div
                      key={paper.id}
                      className="text-sm p-2 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700"
                    >
                      <div className="font-medium text-gray-900 dark:text-gray-100 mb-1">
                        {paper.title}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        ID: {paper.arxiv_id}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
