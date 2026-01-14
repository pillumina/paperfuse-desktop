import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, FolderPlus, Check, Loader2, Plus, Minus } from 'lucide-react';
import { useCollections, useAddPaperToCollection, useRemovePaperFromCollection, useCreateCollection } from '../../hooks/useCollections';
import { useLanguage } from '../../contexts/LanguageContext';

// Color options for collections
const COLLECTION_COLORS = [
  { value: 'bg-red-500', label: 'Red' },
  { value: 'bg-orange-500', label: 'Orange' },
  { value: 'bg-amber-500', label: 'Amber' },
  { value: 'bg-green-500', label: 'Green' },
  { value: 'bg-teal-500', label: 'Teal' },
  { value: 'bg-blue-500', label: 'Blue' },
  { value: 'bg-indigo-500', label: 'Indigo' },
  { value: 'bg-purple-500', label: 'Purple' },
  { value: 'bg-pink-500', label: 'Pink' },
  { value: 'bg-gray-500', label: 'Gray' },
];

interface AddToCollectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  paperId?: string;
  paperIds?: string[];
}

export function AddToCollectionDialog({ isOpen, onClose, paperId, paperIds }: AddToCollectionDialogProps) {
  const { t } = useLanguage();

  // ALL hooks must be called before any conditional logic
  const { data: collections } = useCollections();
  const addToCollection = useAddPaperToCollection();
  const removeFromCollection = useRemovePaperFromCollection();
  const createCollection = useCreateCollection();

  // Support both single paper and multiple papers
  const targetPaperIds = useMemo(() => {
    if (paperIds && paperIds.length > 0) return paperIds;
    if (paperId) return [paperId];
    return [];
  }, [paperId, paperIds]);

  const isBatchMode = targetPaperIds.length > 1;
  const shouldRender = isOpen && targetPaperIds.length > 0;

  // Dialog states
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [pendingToggles, setPendingToggles] = useState<Set<string>>(new Set());
  const [operationStatus, setOperationStatus] = useState<{
    success: number;
    failed: number;
  } | null>(null);

  // Create collection form states
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [newCollectionDesc, setNewCollectionDesc] = useState('');
  const [selectedColor, setSelectedColor] = useState(COLLECTION_COLORS[5].value); // Default to blue
  const [isCreating, setIsCreating] = useState(false);

  // Debug logging
  useEffect(() => {
    console.log('[AddToCollectionDialog] Render:', { isOpen, paperId, paperIds, targetPaperIds, shouldRender });
  }, [isOpen, paperId, paperIds, targetPaperIds, shouldRender]);

  // Reset state when dialog opens
  useEffect(() => {
    if (isOpen) {
      setSelectedIds(new Set());
      setOperationStatus(null);
      setPendingToggles(new Set());
      setShowCreateForm(false);
      setNewCollectionName('');
      setNewCollectionDesc('');
      setSelectedColor(COLLECTION_COLORS[5].value);
    }
  }, [isOpen]);

  const handleToggle = async (collectionId: string) => {
    const isSelected = selectedIds.has(collectionId);

    // Optimistic UI update
    const newSelected = new Set(selectedIds);
    if (isSelected) {
      newSelected.delete(collectionId);
    } else {
      newSelected.add(collectionId);
    }
    setSelectedIds(newSelected);

    // Track pending operation
    setPendingToggles(prev => new Set([...prev, collectionId]));

    try {
      if (isBatchMode) {
        // Batch operation: add/remove all papers
        const promises = targetPaperIds.map(id =>
          isSelected
            ? removeFromCollection.mutateAsync({ collectionId, paperId: id })
            : addToCollection.mutateAsync({ collectionId, paperId: id })
        );

        const results = await Promise.allSettled(promises);
        const successCount = results.filter(r => r.status === 'fulfilled').length;
        const failedCount = results.filter(r => r.status === 'rejected').length;

        if (failedCount > 0) {
          // Revert on partial failure
          setSelectedIds(selectedIds);
          setOperationStatus({ success: successCount, failed: failedCount });
        } else {
          setOperationStatus({ success: targetPaperIds.length, failed: 0 });
        }
      } else {
        // Single paper operation
        if (isSelected) {
          await removeFromCollection.mutateAsync({ collectionId, paperId: targetPaperIds[0] });
        } else {
          await addToCollection.mutateAsync({ collectionId, paperId: targetPaperIds[0] });
        }
      }
    } catch (error) {
      // Revert on error
      setSelectedIds(selectedIds);
      console.error('Failed to toggle collection:', error);
    } finally {
      setPendingToggles(prev => {
        const newSet = new Set(prev);
        newSet.delete(collectionId);
        return newSet;
      });
    }
  };

  const handleCreateCollection = async () => {
    if (!newCollectionName.trim()) return;

    setIsCreating(true);
    try {
      const newCollection = await createCollection.mutateAsync({
        name: newCollectionName.trim(),
        description: newCollectionDesc.trim() || undefined,
        color: selectedColor,
      });

      // Auto-add papers to the newly created collection
      await handleToggle(newCollection.id);

      // Reset form
      setNewCollectionName('');
      setNewCollectionDesc('');
      setSelectedColor(COLLECTION_COLORS[5].value);
      setShowCreateForm(false);
    } catch (error) {
      console.error('Failed to create collection:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const isPending = pendingToggles.size > 0 || isCreating;

  // Always render something to maintain hook count consistency
  const dialogContent = !shouldRender ? (
    <div style={{ display: 'none' }} aria-hidden="true" data-testid="add-to-collection-dialog-hidden" />
  ) : (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md border border-gray-200 dark:border-gray-700 animate-scale-in max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {isBatchMode
                ? t('papers.toolbar.addCollectionTooltip', { count: targetPaperIds.length }).replace('添加 {{count}} 篇论文到收藏', `添加 ${targetPaperIds.length} 篇论文到收藏`)
                : t('papers.detail.collections.addTo')
              }
            </h2>
            {operationStatus && (
              <p className={`text-sm mt-1 ${operationStatus.failed > 0 ? 'text-orange-600 dark:text-orange-400' : 'text-green-600 dark:text-green-400'}`}>
                {operationStatus.failed > 0
                  ? t('papers.errors.batchAnalysisPartial', { success: operationStatus.success, failed: operationStatus.failed })
                  : t('collections.paperAdded', { count: operationStatus.success })
                }
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content - scrollable */}
        <div className="p-6 overflow-y-auto flex-1">
          {/* Create New Collection Section */}
          {!showCreateForm ? (
            <button
              onClick={() => setShowCreateForm(true)}
              disabled={isPending}
              className="w-full flex items-center gap-2 p-3 mb-4 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-blue-400 dark:hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all disabled:opacity-50"
            >
              <Plus className="w-5 h-5" />
              <span className="font-medium">{t('collections.create') || 'Create Collection'}</span>
            </button>
          ) : (
            <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border-2 border-gray-200 dark:border-gray-600">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900 dark:text-white">{t('collections.create') || 'Create Collection'}</h3>
                <button
                  onClick={() => setShowCreateForm(false)}
                  className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  <Minus className="w-4 h-4" />
                </button>
              </div>

              {/* Collection Name */}
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('collections.name') || 'Name'} *
                </label>
                <input
                  type="text"
                  value={newCollectionName}
                  onChange={(e) => setNewCollectionName(e.target.value)}
                  placeholder={t('collections.namePlaceholder') || 'My Research'}
                  disabled={isCreating}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
                  autoFocus
                />
              </div>

              {/* Collection Description */}
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('collections.description') || 'Description'}
                </label>
                <textarea
                  value={newCollectionDesc}
                  onChange={(e) => setNewCollectionDesc(e.target.value)}
                  placeholder={t('collections.descriptionPlaceholder') || 'Optional description'}
                  disabled={isCreating}
                  rows={2}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 resize-none"
                />
              </div>

              {/* Color Selection */}
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('collections.color') || 'Color'}
                </label>
                <div className="flex flex-wrap gap-2">
                  {COLLECTION_COLORS.map((color) => (
                    <button
                      key={color.value}
                      onClick={() => setSelectedColor(color.value)}
                      disabled={isCreating}
                      className={`w-8 h-8 rounded-full ${color.value} transition-all ${
                        selectedColor === color.value
                          ? 'ring-2 ring-offset-2 ring-gray-400 dark:ring-offset-gray-800 scale-110'
                          : 'opacity-70 hover:opacity-100 hover:scale-105'
                      }`}
                      title={color.label}
                    />
                  ))}
                </div>
              </div>

              {/* Create Button */}
              <button
                onClick={handleCreateCollection}
                disabled={!newCollectionName.trim() || isCreating}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{t('collections.creating') || 'Creating...'}</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    <span>{t('collections.create') || 'Create Collection'}</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Collections List */}
          {!collections || collections.length === 0 ? (
            <div className="text-center py-8">
              <FolderPlus className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 dark:text-gray-400">{t('collections.empty') || 'No collections yet'}</p>
              <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                {t('collections.createFirst') || 'Create a collection above to get started'}
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {collections.map((collection) => {
                const isSelected = selectedIds.has(collection.id);
                const isCollectionPending = pendingToggles.has(collection.id);
                const colorClass = collection.color || 'bg-gray-500';

                return (
                  <button
                    key={collection.id}
                    onClick={() => !isPending && handleToggle(collection.id)}
                    disabled={isPending}
                    className={`
                      w-full flex items-center gap-3 p-3 rounded-lg transition-all
                      ${isSelected
                        ? 'bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-500'
                        : 'bg-gray-50 dark:bg-gray-700/50 border-2 border-transparent hover:bg-gray-100 dark:hover:bg-gray-700'
                      }
                      ${isPending ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                    `}
                  >
                    {/* Color indicator */}
                    <div className={`w-3 h-3 rounded-full ${colorClass} flex-shrink-0`} />

                    {/* Collection info */}
                    <div className="flex-1 min-w-0 text-left">
                      <div className="font-medium text-gray-900 dark:text-white truncate">
                        {collection.name}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400 truncate">
                        {collection.description || `${collection.paper_count || 0} 篇论文`}
                      </div>
                    </div>

                    {/* Status indicator */}
                    {isCollectionPending ? (
                      <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                    ) : (
                      /* Checkbox */
                      <div className={`w-6 h-6 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors
                        ${isSelected
                          ? 'bg-blue-500 border-blue-500'
                          : 'border-gray-300 dark:border-gray-600'
                        }
                      `}>
                        {isSelected && <Check className="w-4 h-4 text-white" />}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex gap-3 flex-shrink-0">
          <button
            onClick={onClose}
            disabled={isPending}
            className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 font-medium transition-colors disabled:opacity-50"
          >
            {t('common.buttons.cancel') || 'Cancel'}
          </button>
          <button
            onClick={onClose}
            disabled={isPending}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors disabled:opacity-50"
          >
            {t('common.buttons.done') || 'Done'}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(dialogContent, document.body);
}
