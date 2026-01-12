import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { invoke } from '@tauri-apps/api/core';
import { useLanguage } from '../contexts/LanguageContext';
import { useAutoAnimate } from '@formkit/auto-animate/react';
import {
  ArrowLeft,
  RotateCcw,
  Trash2,
  AlertCircle,
  CheckSquare,
  Square,
} from 'lucide-react';
import { VirtualPaperGrid } from '../components/papers/VirtualPaperGrid';
import { VirtualPaperList } from '../components/papers/VirtualPaperList';
import { Toast } from '../components/common/Toast';
import { Modal } from '../components/common/Modal';
import type { Paper } from '../lib/types';

interface SpamPageProps {
  viewMode: 'grid' | 'list';
}

export default function SpamPage({ viewMode }: SpamPageProps) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [contentRef] = useAutoAnimate();
  const [papers, setPapers] = useState<Paper[]>([]);
  const [loading, setLoading] = useState(true);
  const [spamCount, setSpamCount] = useState<number>(0);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Selection state
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedPaperIds, setSelectedPaperIds] = useState<Set<string>>(new Set());

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
      // Clear selection when papers are reloaded
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
    setSelectedPaperIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(paperId)) {
        newSet.delete(paperId);
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
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-100"></div>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  const selectedCount = selectedPaperIds.size;
  const isAllSelected = selectedCount === papers.length && papers.length > 0;

  return (
    <div className="max-w-[1920px] mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/papers')}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              title={t('buttons.back')}
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <AlertCircle className="w-6 h-6 text-orange-500" />
                {t('spam.title')}
                {spamCount > 0 && (
                  <span className="text-sm font-normal text-gray-600 dark:text-gray-400">
                    ({spamCount})
                  </span>
                )}
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {t('spam.description')}
              </p>
            </div>
          </div>

          {/* Normal mode buttons */}
          {!isSelectionMode && papers.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setIsSelectionMode(true)}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors whitespace-nowrap"
              >
                <CheckSquare className="w-3.5 h-3.5" />
                {t('spam.selectMode')}
              </button>

              <button
                onClick={handleRestoreAll}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow-sm hover:shadow whitespace-nowrap"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                {t('spam.restoreAll')}
              </button>

              <button
                onClick={handleClearAll}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors whitespace-nowrap"
              >
                <Trash2 className="w-3.5 h-3.5" />
                {t('spam.clearAll')}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Papers */}
      {papers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <AlertCircle className="w-16 h-16 text-gray-400 dark:text-gray-600 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
            {t('spam.empty')}
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {t('spam.emptyDescription')}
          </p>
          <button
            onClick={() => navigate('/papers')}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            {t('buttons.back')}
          </button>
        </div>
      ) : (
        <div ref={contentRef} className="relative">
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

      {/* Floating Batch Action Bar */}
      {isSelectionMode && papers.length > 0 && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-40">
          <div className="flex items-center gap-2 px-4 py-3 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700">
            {/* Selection count */}
            <div className="flex items-center gap-3 pr-4 border-r border-gray-200 dark:border-gray-700">
              <button
                onClick={toggleSelectAll}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                title={isAllSelected ? t('spam.deselectAll') : t('spam.selectAll')}
              >
                {isAllSelected ? (
                  <CheckSquare className="w-5 h-5 text-blue-600" />
                ) : (
                  <Square className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                )}
              </button>
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100 min-w-[80px]">
                {selectedCount > 0 ? t('spam.selected', { count: selectedCount }) : t('spam.noneSelected')}
              </span>
            </div>

            {/* Action buttons */}
            {selectedCount > 0 ? (
              <>
                <button
                  onClick={handleBatchRestore}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                  {t('spam.restoreSelected')}
                </button>

                <button
                  onClick={handleBatchDelete}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  {t('spam.deleteSelected')}
                </button>
              </>
            ) : (
              <span className="text-sm text-gray-500 dark:text-gray-400 px-2">
                {t('spam.selectPapers')}
              </span>
            )}

            {/* Divider */}
            <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-1" />

            {/* Cancel button */}
            <button
              onClick={() => {
                setIsSelectionMode(false);
                setSelectedPaperIds(new Set());
              }}
              className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              {t('spam.exit')}
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
