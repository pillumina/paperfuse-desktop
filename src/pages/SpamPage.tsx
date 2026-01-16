import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { invoke } from '@tauri-apps/api/core';
import { useLanguage } from '../contexts/LanguageContext';
import {
  RotateCcw,
  Trash2,
  CheckSquare,
  Square,
  MoreVertical,
  Ban,
  X,
} from 'lucide-react';
import { VirtualPaperGrid } from '../components/papers/VirtualPaperGrid';
import { VirtualPaperList } from '../components/papers/VirtualPaperList';
import { Toast } from '../components/common/Toast';
import { Modal } from '../components/common/Modal';
import type { Paper } from '../lib/types';
import '../styles/animations.css';

interface SpamPageProps {
  viewMode: 'grid' | 'list';
}

export default function SpamPage({ viewMode }: SpamPageProps) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [papers, setPapers] = useState<Paper[]>([]);
  const [loading, setLoading] = useState(true);
  const [spamCount, setSpamCount] = useState<number>(0);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Selection state
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedPaperIds, setSelectedPaperIds] = useState<Set<string>>(new Set());
  const [showActionMenu, setShowActionMenu] = useState(false);

  // Modal state
  const [modal, setModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    variant: 'danger' | 'warning' | 'info';
    onConfirm: () => void | Promise<void>;
  }>({
    isOpen: false,
    title: '',
    message: '',
    variant: 'danger',
    onConfirm: async () => {},
  });

  const loadSpamPapers = async () => {
    try {
      setLoading(true);
      const [papersData, countData] = await Promise.all([
        invoke<Paper[]>('get_spam_papers', { limit: 1000, offset: 0 }),
        invoke<number>('get_spam_paper_count')
      ]);
      setPapers(papersData);
      setSpamCount(countData);
      setSelectedPaperIds(new Set());
    } catch (error) {
      console.error('Failed to load spam papers:', error);
      setToast({ message: t('spam.emptyDescription'), type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSpamPapers();
  }, []);

  const togglePaperSelection = (paperId: string) => {
    // Auto-enter selection mode on first click
    if (!isSelectionMode) {
      setIsSelectionMode(true);
    }

    setSelectedPaperIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(paperId)) {
        newSet.delete(paperId);
        // Exit selection mode if nothing selected
        if (newSet.size === 0 && isSelectionMode) {
          setIsSelectionMode(false);
        }
      } else {
        newSet.add(paperId);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedPaperIds.size === papers.length) {
      setSelectedPaperIds(new Set());
    } else {
      setSelectedPaperIds(new Set(papers.map(p => p.id)));
    }
  };

  const closeModal = () => {
    setModal(prev => ({ ...prev, isOpen: false }));
  };

  const handleRestoreAll = async () => {
    setModal({
      isOpen: true,
      title: t('spam.restoreAllTitle'),
      message: t('spam.restoreAllMessage', { count: papers.length }),
      variant: 'warning',
      onConfirm: async () => {
        await Promise.all(
          papers.map(paper => invoke('toggle_paper_spam', { id: paper.id, isSpam: false }))
        );
        setToast({ message: t('spam.restoredCount', { count: papers.length }), type: 'success' });
        await loadSpamPapers();
      },
    });
    setShowActionMenu(false);
  };

  const handleDelete = async (id: string) => {
    setModal({
      isOpen: true,
      title: t('spam.permanentDeleteTitle'),
      message: t('spam.permanentDeleteMessage'),
      variant: 'danger',
      onConfirm: async () => {
        await invoke('delete_paper', { id });
        setToast({ message: t('spam.deleted'), type: 'success' });
        await loadSpamPapers();
      },
    });
  };

  const handleBatchRestore = async () => {
    if (selectedPaperIds.size === 0) return;

    setModal({
      isOpen: true,
      title: t('spam.batchRestoreTitle'),
      message: t('spam.batchRestoreMessage', { count: selectedPaperIds.size }),
      variant: 'warning',
      onConfirm: async () => {
        await Promise.all(
          Array.from(selectedPaperIds).map(id =>
            invoke('toggle_paper_spam', { id, isSpam: false })
          )
        );
        setToast({ message: t('spam.restoredCount', { count: selectedPaperIds.size }), type: 'success' });
        await loadSpamPapers();
      },
    });
  };

  const handleBatchDelete = async () => {
    if (selectedPaperIds.size === 0) return;

    setModal({
      isOpen: true,
      title: t('spam.batchDeleteTitle'),
      message: t('spam.batchDeleteMessage', { count: selectedPaperIds.size }),
      variant: 'danger',
      onConfirm: async () => {
        await Promise.all(
          Array.from(selectedPaperIds).map(id =>
            invoke('delete_paper', { id })
          )
        );
        setToast({ message: t('spam.deletedCount', { count: selectedPaperIds.size }), type: 'success' });
        await loadSpamPapers();
      },
    });
  };

  const handleClearAll = async () => {
    if (papers.length === 0) return;

    setModal({
      isOpen: true,
      title: t('spam.clearAllTitle'),
      message: t('spam.clearAllMessage', { count: papers.length }),
      variant: 'danger',
      onConfirm: async () => {
        await Promise.all(
          papers.map(paper => invoke('delete_paper', { id: paper.id }))
        );
        setToast({ message: t('spam.clearedAll'), type: 'success' });
        await loadSpamPapers();
      },
    });
    setShowActionMenu(false);
  };

  const selectedCount = selectedPaperIds.size;
  const isAllSelected = selectedCount === papers.length && papers.length > 0;

  return (
    <div className="p-8">
      {/* Minimal Header */}
      <div className="flex items-center justify-between mb-6">
        {/* Left: Title */}
        <div className="flex items-center gap-3">
          <div className="p-2 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
            <Ban className="w-5 h-5 text-orange-600 dark:text-orange-400" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
              {t('spam.title')}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
              {t('spam.description')}
              {spamCount > 0 && (
                <>
                  <span className="text-gray-300 dark:text-gray-600">•</span>
                  <span className="font-medium">{spamCount} {t('spam.papers')}</span>
                </>
              )}
            </p>
          </div>
        </div>

        {/* Right: Actions */}
        {!isSelectionMode && papers.length > 0 && (
          <div className="flex items-center gap-2">
            {/* Select mode toggle */}
            <button
              onClick={() => setIsSelectionMode(true)}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              title={t('spam.selectMode')}
            >
              <CheckSquare className="w-4 h-4" />
            </button>

            {/* More actions menu */}
            <div className="relative">
              <button
                onClick={() => setShowActionMenu(!showActionMenu)}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              {showActionMenu && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowActionMenu(false)}
                  />
                  <div className="absolute right-0 top-full mt-1 z-20 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-lg py-1 min-w-[180px]">
                    <button
                      onClick={handleRestoreAll}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 transition-colors"
                    >
                      <RotateCcw className="w-4 h-4" />
                      {t('spam.restoreAll')}
                    </button>
                    <button
                      onClick={handleClearAll}
                      className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                      {t('spam.clearAll')}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Papers */}
      {loading ? (
        <div className="flex items-center justify-center py-32">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-10 w-10 border-3 border-gray-200 border-t-blue-600"></div>
            <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">{t('common.loading')}</p>
          </div>
        </div>
      ) : papers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
            <Ban className="w-8 h-8 text-gray-400" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
            {t('spam.empty')}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center max-w-md">
            {t('spam.emptyDescription')}
          </p>
        </div>
      ) : (
        <div className="relative">
          {viewMode === 'grid' ? (
            <VirtualPaperGrid
              papers={papers}
              showSpamActions={true}
              onPermanentDelete={handleDelete}
              isSelectionMode={isSelectionMode}
              selectedPaperIds={selectedPaperIds}
              onToggleSelection={togglePaperSelection}
            />
          ) : (
            <VirtualPaperList
              papers={papers}
              showSpamActions={true}
              onPermanentDelete={handleDelete}
              isSelectionMode={isSelectionMode}
              selectedPaperIds={selectedPaperIds}
              onToggleSelection={togglePaperSelection}
            />
          )}
        </div>
      )}

      {/* Compact Selection Bar */}
      {isSelectionMode && papers.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40">
          <div className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700">
            {/* Select all checkbox */}
            <button
              onClick={toggleSelectAll}
              className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title={isAllSelected ? t('spam.deselectAll') : t('spam.selectAll')}
            >
              {isAllSelected ? (
                <CheckSquare className="w-4 h-4 text-blue-600" />
              ) : (
                <Square className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              )}
            </button>

            {/* Count */}
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100 min-w-[60px]">
              {selectedCount > 0 ? `${selectedCount} ${t('spam.papers')}` : t('spam.noneSelected')}
            </span>

            {/* Divider */}
            <div className="w-px h-5 bg-gray-200 dark:bg-gray-700" />

            {/* Action buttons */}
            {selectedCount > 0 && (
              <>
                <button
                  onClick={handleBatchRestore}
                  className="p-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                  title={t('spam.restoreSelected')}
                >
                  <RotateCcw className="w-4 h-4" />
                </button>

                <button
                  onClick={handleBatchDelete}
                  className="p-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                  title={t('spam.deleteSelected')}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </>
            )}

            {/* Divider */}
            <div className="w-px h-5 bg-gray-200 dark:bg-gray-700" />

            {/* Exit */}
            <button
              onClick={() => {
                setIsSelectionMode(false);
                setSelectedPaperIds(new Set());
              }}
              className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title={t('spam.exit')}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Modal */}
      <Modal
        isOpen={modal.isOpen}
        onClose={closeModal}
        onConfirm={modal.onConfirm}
        title={modal.title}
        message={modal.message}
        variant={modal.variant}
        confirmText={t('common.buttons.confirm')}
        cancelText={t('common.buttons.cancel')}
      />

      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
