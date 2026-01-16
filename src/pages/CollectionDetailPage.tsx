import { useParams } from 'react-router-dom';
import { ArrowLeft, Trash2, Edit2, Grid3X3, List, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCollection, useCollectionPapers, useDeleteCollection, useUpdateCollection } from '../hooks/useCollections';
import { PaperCard } from '../components/papers/PaperCard';
import { PaperListItem } from '../components/papers/PaperListItem';
import { CreateCollectionDialog } from '../components/collections/CreateCollectionDialog';
import { useState } from 'react';
import { toast } from 'sonner';
import { useLanguage } from '../contexts/LanguageContext';
import type { CollectionWithPaperCount } from '../lib/types';
import '../styles/animations.css';

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

export default function CollectionDetailPage() {
  const { t } = useLanguage();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: collection, isLoading: collectionLoading, error: collectionError } = useCollection(id!);
  const { data: papers, isLoading: papersLoading } = useCollectionPapers(id!, 100);
  const deleteMutation = useDeleteCollection();
  const updateMutation = useUpdateCollection();

  const [viewMode, setViewMode] = useState<'list' | 'grid'>('grid');
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  // Get color class
  const getColorClass = (collection: CollectionWithPaperCount | null) => {
    if (!collection) return 'bg-gray-400';
    if (collection.color) return collection.color;
    return COLORS[Math.abs(collection.id.charCodeAt(0)) % COLORS.length];
  };

  const handleEdit = () => {
    setIsEditDialogOpen(true);
  };

  const handleUpdate = (data: { name: string; description: string; color: string }) => {
    updateMutation.mutate(
      { id: id!, ...data },
      {
        onSuccess: () => {
          toast.success(t('collections.messages.updated'));
          setIsEditDialogOpen(false);
        },
        onError: (error) => {
          toast.error(`${t('collections.messages.updateFailed')}: ${error.message}`);
        },
      }
    );
  };

  const handleDelete = () => {
    if (confirm(t('collections.deleteConfirm'))) {
      deleteMutation.mutate(id!, {
        onSuccess: () => {
          toast.success(t('collections.messages.deleted'));
          navigate('/collections');
        },
        onError: (error) => {
          toast.error(`${t('collections.messages.deleteFailed')}: ${error.message}`);
        },
      });
    }
  };

  if (collectionLoading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500 dark:text-gray-400">{t('collections.page.loading')}</div>
        </div>
      </div>
    );
  }

  if (collectionError || !collection) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-red-500">{t('collections.page.error')}</div>
        </div>
      </div>
    );
  }

  const colorClass = getColorClass(collection);

  return (
    <div className="p-8">
      {/* Minimal Header */}
      <div className="flex items-center justify-between mb-6">
        {/* Left: Back + Title */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/collections')}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
              {collection.name}
            </h1>
            {collection.description && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                {collection.description}
              </p>
            )}
          </div>
          {/* Paper count badge */}
          <div className={`px-2.5 py-1 rounded-md text-xs font-medium ${colorClass.replace('bg-', 'bg-opacity-10 dark:bg-opacity-20')} ${colorClass.replace('bg-', 'text-')}`}>
            {papers?.length || 0} {t('collections.papers')}
          </div>
        </div>

        {/* Right: Actions + View Toggle */}
        <div className="flex items-center gap-2">
          {/* Icon buttons */}
          <button
            onClick={handleEdit}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            title={t('collections.edit')}
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={handleDelete}
            className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
            title={t('collections.delete')}
          >
            <Trash2 className="w-4 h-4" />
          </button>

          {/* Divider */}
          <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-1" />

          {/* View Toggle */}
          <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded transition-all ${
                viewMode === 'grid'
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
              }`}
              title={t('papers.gridView')}
            >
              <Grid3X3 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded transition-all ${
                viewMode === 'list'
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
              }`}
              title={t('papers.listView')}
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Papers */}
      {papersLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500 dark:text-gray-400">{t('common.loading')}</div>
        </div>
      ) : !papers || papers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
            <FileText className="w-8 h-8 text-gray-400" />
          </div>

          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
            {t('collections.empty.title')}
          </h2>

          <p className="text-sm text-gray-500 dark:text-gray-400 text-center max-w-md">
            {t('collections.empty.description')}
          </p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 tab-content">
          {papers.map((paper) => (
            <PaperCard
              key={paper.id}
              paper={paper}
              onClick={() => navigate(`/papers/${paper.id}`)}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-2.5 tab-content">
          {papers.map((paper) => (
            <div
              key={paper.id}
              onClick={() => navigate(`/papers/${paper.id}`)}
              className="cursor-pointer"
            >
              <PaperListItem paper={paper} />
            </div>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      {isEditDialogOpen && (
        <CreateCollectionDialog
          key={`edit-${collection.id}`}
          isOpen={isEditDialogOpen}
          onClose={() => setIsEditDialogOpen(false)}
          onSubmit={handleUpdate}
          collection={collection}
        />
      )}
    </div>
  );
}
