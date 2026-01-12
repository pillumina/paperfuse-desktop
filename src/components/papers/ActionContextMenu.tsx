import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Copy, ExternalLink, FileText, Trash2, Link, FolderPlus, Ban, Sparkles } from 'lucide-react';
import type { Paper } from '../../lib/types';
import { AddToCollectionDialog } from '../collections/AddToCollectionDialog';
import { AnalysisModeDialog, type AnalysisMode } from './AnalysisModeDialog';

interface ActionContextMenuProps {
  paper: Paper;
  children: React.ReactElement;
  onDelete?: (id: string) => void;
  onToggleSpam?: (id: string) => void;
  onAnalyze?: (id: string, mode: AnalysisMode) => void;
}

export function ActionContextMenu({ paper, children, onDelete, onToggleSpam, onAnalyze }: ActionContextMenuProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [isCollectionDialogOpen, setIsCollectionDialogOpen] = useState(false);
  const [isAnalysisDialogOpen, setIsAnalysisDialogOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsVisible(false);
      }
    };

    if (isVisible) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isVisible]);

  // Handle right-click
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const menuWidth = 200; // Estimated menu width
    const menuHeight = 250; // Estimated menu height

    let left = e.clientX;
    let top = e.clientY;

    // Check right boundary
    if (left + menuWidth > window.innerWidth - 16) {
      left = window.innerWidth - menuWidth - 16;
    }

    // Check bottom boundary
    if (top + menuHeight > window.innerHeight - 16) {
      top = window.innerHeight - menuHeight - 16;
    }

    // Ensure left boundary
    if (left < 16) {
      left = 16;
    }

    // Ensure top boundary
    if (top < 16) {
      top = 16;
    }

    setPosition({ top, left });
    setIsVisible(true);
  };

  // Action handlers
  const handleCopyTitle = async () => {
    await navigator.clipboard.writeText(paper.title);
    setIsVisible(false);
  };

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(paper.arxiv_url);
    setIsVisible(false);
  };

  const handleCopyCitation = async () => {
    const authors = paper.authors.slice(0, 3).join(', ');
    const year = new Date(paper.published_date).getFullYear();
    const citation = `${authors} (${year}). ${paper.title}. arXiv preprint arXiv:${paper.arxiv_id}`;
    await navigator.clipboard.writeText(citation);
    setIsVisible(false);
  };

  const handleOpenArXiv = () => {
    window.open(paper.arxiv_url, '_blank');
    setIsVisible(false);
  };

  const handleOpenPDF = () => {
    const pdfUrl = paper.arxiv_url.replace('/abs/', '/pdf/') + '.pdf';
    window.open(pdfUrl, '_blank');
    setIsVisible(false);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete?.(paper.id);
    setIsVisible(false);
  };

  const handleToggleSpam = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleSpam?.(paper.id);
    setIsVisible(false);
  };

  const handleAddToCollection = () => {
    setIsVisible(false);
    setIsCollectionDialogOpen(true);
  };

  const handleAnalyze = () => {
    setIsVisible(false);
    setIsAnalysisDialogOpen(true);
  };

  const handleAnalysisConfirm = (mode: AnalysisMode) => {
    onAnalyze?.(paper.id, mode);
  };

  return (
    <>
      <div onContextMenu={handleContextMenu} className="w-full">
        {children}
      </div>

      {isVisible &&
        createPortal(
          <div
            ref={menuRef}
            className="fixed z-[9999] w-48 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 py-1 animate-fade-in"
            style={{
              top: `${position.top}px`,
              left: `${position.left}px`,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Copy Title */}
            <button
              onClick={handleCopyTitle}
              className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 transition-colors"
            >
              <Copy className="w-4 h-4" />
              <span>Copy title</span>
            </button>

            {/* Copy Link */}
            <button
              onClick={handleCopyLink}
              className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 transition-colors"
            >
              <Link className="w-4 h-4" />
              <span>Copy link</span>
            </button>

            {/* Copy Citation */}
            <button
              onClick={handleCopyCitation}
              className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 transition-colors"
            >
              <Copy className="w-4 h-4" />
              <span>Copy citation</span>
            </button>

            <div className="my-1 border-t border-gray-200 dark:border-gray-700" />

            {/* Add to Collection */}
            <button
              onClick={handleAddToCollection}
              className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 transition-colors"
            >
              <FolderPlus className="w-4 h-4" />
              <span>Add to collection</span>
            </button>

            {/* Re-analyze */}
            {onAnalyze && (
              <button
                onClick={handleAnalyze}
                className="w-full px-3 py-2 text-left text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 flex items-center gap-2 transition-colors"
              >
                <Sparkles className="w-4 h-4" />
                <span>Re-analyze</span>
              </button>
            )}

            {/* Open in ArXiv */}
            <button
              onClick={handleOpenArXiv}
              className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Open in ArXiv</span>
            </button>

            {/* Open PDF */}
            <button
              onClick={handleOpenPDF}
              className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 transition-colors"
            >
              <FileText className="w-4 h-4" />
              <span>Open PDF</span>
            </button>

            <div className="my-1 border-t border-gray-200 dark:border-gray-700" />

            {/* Mark as Spam */}
            {onToggleSpam && (
              <button
                onClick={handleToggleSpam}
                className="w-full px-3 py-2 text-left text-sm text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 flex items-center gap-2 transition-colors"
              >
                <Ban className="w-4 h-4" />
                <span>Mark as spam</span>
              </button>
            )}

            {/* Delete */}
            {onDelete && (
              <button
                onClick={handleDelete}
                className="w-full px-3 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete</span>
              </button>
            )}
          </div>,
          document.body
        )
      }

      {/* Add to Collection Dialog */}
      <AddToCollectionDialog
        isOpen={isCollectionDialogOpen}
        onClose={() => setIsCollectionDialogOpen(false)}
        paperId={paper.id}
      />

      {/* Analysis Mode Dialog */}
      <AnalysisModeDialog
        isOpen={isAnalysisDialogOpen}
        onClose={() => setIsAnalysisDialogOpen(false)}
        onConfirm={handleAnalysisConfirm}
      />
    </>
  );
}
