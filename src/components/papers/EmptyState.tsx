import { FileText, Search, Inbox, WifiOff, Lightbulb } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface EmptyStateProps {
  type?: 'no-papers' | 'no-results' | 'no-collections' | 'no-network';
  searchQuery?: string;
  onClearFilters?: () => void;
}

export function EmptyState({ type = 'no-papers', searchQuery, onClearFilters }: EmptyStateProps) {
  const navigate = useNavigate();

  if (type === 'no-results') {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4">
        <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
          <Search className="w-8 h-8 text-gray-400 animate-pulse-subtle" />
        </div>

        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 tracking-tight">
          No papers found
        </h2>

        <p className="text-gray-600 dark:text-gray-400 mb-6 text-center max-w-md">
          {searchQuery
            ? `No papers match "${searchQuery}"`
            : 'No papers match your current filters'}
        </p>

        {/* Suggestions for finding papers */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl p-5 mb-6 max-w-md w-full border border-blue-200 dark:border-blue-800 shadow-sm">
          <div className="flex items-start gap-2 mb-3">
            <Lightbulb className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-blue-900 dark:text-blue-200 font-semibold">
              Suggestions
            </p>
          </div>
          <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-2 ml-7">
            <li className="flex items-start gap-2">
              <span className="text-blue-600 dark:text-blue-400 mt-1">•</span>
              <span>Try different keywords</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 dark:text-blue-400 mt-1">•</span>
              <span>Check for typos</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 dark:text-blue-400 mt-1">•</span>
              <span>Use more general terms</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 dark:text-blue-400 mt-1">•</span>
              <span>Clear filters to see all papers</span>
            </li>
          </ul>
        </div>

        <button
          onClick={onClearFilters}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:shadow-sm font-medium transition-all duration-200 cursor-pointer focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Clear Filters
        </button>
      </div>
    );
  }

  if (type === 'no-collections') {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4">
        <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center mb-6">
          <Inbox className="w-8 h-8 text-gray-400" />
        </div>

        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          No collections yet
        </h2>

        <p className="text-gray-600 dark:text-gray-400 mb-8 text-center max-w-md">
          Create collections to organize your papers by topic, project, or any way you like
        </p>

        <button
          onClick={() => navigate('/settings')}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:shadow-sm font-medium transition-all duration-200 cursor-pointer focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Go to Settings
        </button>
      </div>
    );
  }

  if (type === 'no-network') {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4">
        <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center mb-6">
          <WifiOff className="w-8 h-8 text-gray-400" />
        </div>

        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Connection error
        </h2>

        <p className="text-gray-600 dark:text-gray-400 mb-8 text-center max-w-md">
          Unable to connect to the server. Please check your internet connection and try again.
        </p>

        <button
          onClick={() => window.location.reload()}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:shadow-sm font-medium transition-all duration-200 cursor-pointer focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Retry
        </button>
      </div>
    );
  }

  // Default: no-papers
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4">
      <div className="w-16 h-16 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
        <FileText className="w-8 h-8 text-blue-500" />
      </div>

      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 tracking-tight">
        No papers yet
      </h2>

      <p className="text-gray-600 dark:text-gray-400 mb-8 text-center max-w-md">
        Fetch your first papers from ArXiv to get started. Configure your API keys and research topics in settings.
      </p>

      <div className="flex gap-3">
        <button
          onClick={() => navigate('/settings')}
          className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:shadow-sm font-medium transition-all duration-200 cursor-pointer focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
        >
          Configure Settings
        </button>
        <button
          onClick={() => navigate('/')}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:shadow-sm font-medium transition-all duration-200 cursor-pointer focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Fetch Papers
        </button>
      </div>
    </div>
  );
}
