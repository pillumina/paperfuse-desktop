import { FolderOpen, Trash2, Edit2, FileText, Calendar } from 'lucide-react';
import type { CollectionWithPaperCount } from '../../lib/types';
import { formatRelativeTime } from '../../lib/utils';
import { useLanguage } from '../../contexts/LanguageContext';

interface CollectionCardProps {
  collection: CollectionWithPaperCount;
  onDelete: (id: string) => void;
  onEdit: (collection: CollectionWithPaperCount) => void;
  onClick: (id: string) => void;
}

const COLORS = [
  'bg-blue-500',
  'bg-green-500',
  'bg-purple-500',
  'bg-orange-500',
  'bg-pink-500',
  'bg-teal-500',
  'bg-indigo-500',
  'bg-red-500',
];

export function CollectionCard({ collection, onDelete, onEdit, onClick }: CollectionCardProps) {
  const { t } = useLanguage();
  const colorClass = collection.color || COLORS[Math.abs(collection.id.charCodeAt(0)) % COLORS.length];

  return (
    <div
      onClick={() => onClick(collection.id)}
      className={`
        relative group cursor-pointer
        bg-white dark:bg-gray-800
        rounded-xl border border-gray-200 dark:border-gray-700
        hover:shadow-card-hover hover:-translate-y-0.5 hover:border-blue-400
        active:scale-[0.98] active:translate-y-0
        transition-all duration-200 ease-out
        overflow-hidden
      `}
    >
      {/* Color Bar */}
      <div className={`h-2 ${colorClass}`} />

      {/* Content */}
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className={`p-3 rounded-xl ${colorClass.replace('bg-', 'bg-opacity-10 dark:bg-opacity-20')}`}>
              <FolderOpen className={`w-6 h-6 ${colorClass.replace('bg-', 'text-')}`} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white truncate">
                {collection.name}
              </h3>
              {collection.description && (
                <p className="text-sm text-gray-600 dark:text-gray-400 truncate mt-1">
                  {collection.description}
                </p>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit(collection);
              }}
              className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(collection.id);
              }}
              className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between text-sm gap-3">
          <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400 min-w-0">
            <FileText className="w-4 h-4 shrink-0" />
            <span className="truncate">{t('collections.paperCount', { count: collection.paper_count })}</span>
          </div>
          <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-500 shrink-0">
            <Calendar className="w-4 h-4" />
            <span className="whitespace-nowrap">{formatRelativeTime(collection.updated_at)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
