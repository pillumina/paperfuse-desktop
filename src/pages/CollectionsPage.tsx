import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { CollectionCard } from '../components/collections/CollectionCard';
import { CreateCollectionDialog } from '../components/collections/CreateCollectionDialog';
import { useCollections, useCreateCollection, useDeleteCollection, useUpdateCollection } from '../hooks/useCollections';
import { toast } from 'sonner';
import type { CollectionWithPaperCount, CreateCollectionInput } from '../lib/types';

export default function CollectionsPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { data: collections, isLoading, error } = useCollections();
  const createMutation = useCreateCollection();
  const updateMutation = useUpdateCollection();
  const deleteMutation = useDeleteCollection();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCollection, setEditingCollection] = useState<CollectionWithPaperCount | null>(null);

  const handleCreate = () => {
    setEditingCollection(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (collection: CollectionWithPaperCount) => {
    setEditingCollection(collection);
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm(t('collections.deleteConfirm'))) {
      deleteMutation.mutate(id, {
        onSuccess: () => {
          toast.success(t('collections.messages.deleted'));
        },
        onError: (error) => {
          toast.error(`${t('collections.messages.deleteFailed')}: ${error.message}`);
        },
      });
    }
  };

  const handleSubmit = (data: CreateCollectionInput) => {
    if (editingCollection) {
      updateMutation.mutate(
        { id: editingCollection.id, ...data },
        {
          onSuccess: () => {
            toast.success(t('collections.messages.updated'));
            setIsDialogOpen(false);
          },
          onError: (error) => {
            toast.error(`${t('collections.messages.updateFailed')}: ${error.message}`);
          },
        }
      );
    } else {
      createMutation.mutate(data, {
        onSuccess: () => {
          toast.success(t('collections.messages.created'));
          setIsDialogOpen(false);
        },
        onError: (error) => {
          toast.error(`${t('collections.messages.createFailed')}: ${error.message}`);
        },
      });
    }
  };

  const handleClick = (id: string) => {
    navigate(`/collections/${id}`);
  };

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500 dark:text-gray-400">{t('collections.page.loading')}</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-red-500">{t('collections.page.error')}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            {t('collections.page.title')}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {t('collections.page.description')}
          </p>
        </div>
        <button
          onClick={handleCreate}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          <Plus className="w-5 h-5" />
          {t('collections.page.newCollection')}
        </button>
      </div>

      {/* Collections Grid */}
      {!collections || collections.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-6">
            <Plus className="w-12 h-12 text-gray-400" />
          </div>

          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
            {t('collections.noCollections')}
          </h2>

          <p className="text-gray-600 dark:text-gray-400 mb-8 text-center max-w-md">
            {t('collections.noCollectionsDescription')}
          </p>

          <button
            onClick={handleCreate}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:shadow-sm transition-all duration-200 font-medium focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 cursor-pointer"
          >
            <Plus className="w-5 h-5" />
            {t('collections.page.createCollection')}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {collections.map((collection) => (
            <CollectionCard
              key={collection.id}
              collection={collection}
              onDelete={handleDelete}
              onEdit={handleEdit}
              onClick={handleClick}
            />
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <CreateCollectionDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onSubmit={handleSubmit}
        collection={editingCollection}
      />
    </div>
  );
}
