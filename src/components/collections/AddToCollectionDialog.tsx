import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, FolderPlus, Check, Loader2 } from 'lucide-react';
import { useCollections, useAddPaperToCollection, useRemovePaperFromCollection } from '../../hooks/useCollections';

interface AddToCollectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  paperId?: string;
  paperIds?: string[];
}

export function AddToCollectionDialog({ isOpen, onClose, paperId, paperIds }: AddToCollectionDialogProps) {
  // ALL hooks must be called before any conditional logic
  const { data: collections } = useCollections();
  const addToCollection = useAddPaperToCollection();
  const removeFromCollection = useRemovePaperFromCollection();

  // Support both single paper and multiple papers
  const targetPaperIds = useMemo(() => {
    if (paperIds && paperIds.length > 0) return paperIds;
    if (paperId) return [paperId];
    return [];
  }, [paperId, paperIds]);

  const isBatchMode = targetPaperIds.length > 1;
  const shouldRender = isOpen && targetPaperIds.length > 0;

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [pendingToggles, setPendingToggles] = useState<Set<string>>(new Set());
  const [operationStatus, setOperationStatus] = useState<{
    success: number;
    failed: number;
  } | null>(null);

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

  const isPending = pendingToggles.size > 0;

  // Always render something to maintain hook count consistency
  const dialogContent = !shouldRender ? (
    <div style={{ display: 'none' }} aria-hidden="true" data-testid="add-to-collection-dialog-hidden" />
  ) : (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md border border-gray-200 dark:border-gray-700 animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {isBatchMode ? `添加 ${targetPaperIds.length} 篇论文到 Collection` : '添加到 Collection'}
            </h2>
            {operationStatus && (
              <p className={`text-sm mt-1 ${operationStatus.failed > 0 ? 'text-orange-600 dark:text-orange-400' : 'text-green-600 dark:text-green-400'}`}>
                {operationStatus.failed > 0
                  ? `成功添加 ${operationStatus.success} 篇，失败 ${operationStatus.failed} 篇`
                  : `已添加 ${operationStatus.success} 篇论文`}
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

        {/* Content */}
        <div className="p-6">
          {!collections || collections.length === 0 ? (
            <div className="text-center py-8">
              <FolderPlus className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 dark:text-gray-400">还没有 Collection</p>
              <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                先创建一个 Collection 再添加论文
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
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
        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex gap-3">
          <button
            onClick={onClose}
            disabled={isPending}
            className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 font-medium transition-colors disabled:opacity-50"
          >
            取消
          </button>
          <button
            onClick={onClose}
            disabled={isPending}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors disabled:opacity-50"
          >
            完成
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(dialogContent, document.body);
}
