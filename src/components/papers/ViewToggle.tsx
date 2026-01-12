import { List, LayoutGrid } from 'lucide-react';

interface ViewToggleProps {
  viewMode: 'list' | 'grid';
  onViewChange: (view: 'list' | 'grid') => void;
}

export function ViewToggle({ viewMode, onViewChange }: ViewToggleProps) {
  return (
    <div className="inline-flex rounded-lg border border-gray-300 dark:border-gray-600 p-1 bg-white dark:bg-gray-800">
      <button
        onClick={() => onViewChange('list')}
        className={`px-3 py-1.5 rounded-md transition-colors flex items-center gap-2 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
          viewMode === 'list'
            ? 'bg-blue-600 text-white'
            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
        }`}
        title="List view"
      >
        <List className="w-4 h-4" />
        <span className="text-sm font-medium">List</span>
      </button>
      <button
        onClick={() => onViewChange('grid')}
        className={`px-3 py-1.5 rounded-md transition-colors flex items-center gap-2 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
          viewMode === 'grid'
            ? 'bg-blue-600 text-white'
            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
        }`}
        title="Grid view"
      >
        <LayoutGrid className="w-4 h-4" />
        <span className="text-sm font-medium">Grid</span>
      </button>
    </div>
  );
}
