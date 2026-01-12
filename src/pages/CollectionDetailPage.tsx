import { useParams } from 'react-router-dom';
import { ArrowLeft, Trash2, Edit2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCollection, useCollectionPapers, useDeleteCollection } from '../hooks/useCollections';
import { PaperCard } from '../components/papers/PaperCard';
import { PaperListItem } from '../components/papers/PaperListItem';
import { ViewToggle } from '../components/papers/ViewToggle';
import { useState } from 'react';
import { toast } from 'sonner';

export default function CollectionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: collection, isLoading: collectionLoading, error: collectionError } = useCollection(id!);
  const { data: papers, isLoading: papersLoading } = useCollectionPapers(id!, 100);
  const deleteMutation = useDeleteCollection();

  const [viewMode, setViewMode] = useState<'list' | 'grid'>('grid');

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this collection?')) {
      deleteMutation.mutate(id!, {
        onSuccess: () => {
          toast.success('Collection deleted');
          navigate('/collections');
        },
        onError: (error) => {
          toast.error(`Failed to delete collection: ${error.message}`);
        },
      });
    }
  };

  if (collectionLoading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500 dark:text-gray-400">Loading collection...</div>
        </div>
      </div>
    );
  }

  if (collectionError || !collection) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-red-500">Collection not found</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate('/collections')}
          className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Collections
        </button>

        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-4 mb-2">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                {collection.name}
              </h1>
              <div className={`h-2 w-12 rounded-full ${collection.color || 'bg-gray-400'}`} />
            </div>
            {collection.description && (
              <p className="text-gray-600 dark:text-gray-400">
                {collection.description}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate(`/collections/${id}/edit`)}
              className="flex items-center gap-2 px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <Edit2 className="w-4 h-4" />
              Edit
            </button>
            <button
              onClick={handleDelete}
              className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-4 flex items-center gap-6 text-sm text-gray-600 dark:text-gray-400">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-gray-900 dark:text-white">
              {papers?.length || 0}
            </span>
            <span>paper{(papers?.length || 0) !== 1 ? 's' : ''}</span>
          </div>
        </div>
      </div>

      {/* View Toggle */}
      <div className="mb-4 flex justify-end">
        <ViewToggle viewMode={viewMode} onViewChange={setViewMode} />
      </div>

      {/* Papers */}
      {papersLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500 dark:text-gray-400">Loading papers...</div>
        </div>
      ) : !papers || papers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-6">
            <svg
              className="w-12 h-12 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>

          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
            No papers yet
          </h2>

          <p className="text-gray-600 dark:text-gray-400 text-center max-w-md">
            Add papers to this collection to keep them organized
          </p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {papers.map((paper) => (
            <PaperCard
              key={paper.id}
              paper={paper}
              onClick={() => navigate(`/papers/${paper.id}`)}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
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
    </div>
  );
}
