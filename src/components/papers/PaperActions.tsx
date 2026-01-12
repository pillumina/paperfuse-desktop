import { ExternalLink, Trash2, Copy, Check } from 'lucide-react';
import { openUrl } from '@tauri-apps/plugin-opener';
import { useState } from 'react';
import type { Paper } from '../../lib/types';

interface PaperActionsProps {
  paper: Paper;
  onDelete?: (id: string) => void;
  variant?: 'row' | 'dropdown';
}

export function PaperActions({ paper, onDelete, variant = 'row' }: PaperActionsProps) {
  const [copied, setCopied] = useState(false);

  const handleOpenArXiv = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await openUrl(paper.arxiv_url);
  };

  const handleOpenPDF = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await openUrl(paper.pdf_url);
  };

  const handleCopyLink = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await navigator.clipboard.writeText(paper.arxiv_url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    console.log('[PaperActions] Delete button clicked for paper:', paper.id);
    // Tauri doesn't support browser confirm(), use direct delete
    console.log('[PaperActions] Calling onDelete with id:', paper.id);
    onDelete?.(paper.id);
  };

  if (variant === 'row') {
    return (
      <div className="flex items-center gap-1">
        <button
          onClick={handleOpenArXiv}
          className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
          title="View on ArXiv"
        >
          <ExternalLink className="w-4 h-4" />
        </button>
        <button
          onClick={handleCopyLink}
          className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:text-gray-300 dark:hover:bg-gray-800 rounded-lg transition-colors"
          title="Copy link"
        >
          {copied ? (
            <Check className="w-4 h-4 text-green-600" />
          ) : (
            <Copy className="w-4 h-4" />
          )}
        </button>
        {onDelete && (
          <button
            onClick={(e) => handleDelete(e)}
            className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
            title="Delete paper"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={handleOpenArXiv}
        className="flex items-center gap-2 px-4 py-2 text-left text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
      >
        <ExternalLink className="w-4 h-4" />
        View on ArXiv
      </button>
      <button
        onClick={handleOpenPDF}
        className="flex items-center gap-2 px-4 py-2 text-left text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
      >
        <ExternalLink className="w-4 h-4" />
        Download PDF
      </button>
      <button
        onClick={handleCopyLink}
        className="flex items-center gap-2 px-4 py-2 text-left text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
      >
        {copied ? (
          <Check className="w-4 h-4 text-green-600" />
        ) : (
          <Copy className="w-4 h-4" />
        )}
        {copied ? 'Copied!' : 'Copy Link'}
      </button>
      {onDelete && (
        <button
          onClick={(e) => handleDelete(e)}
          className="flex items-center gap-2 px-4 py-2 text-left text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
        >
          <Trash2 className="w-4 h-4" />
          Delete Paper
        </button>
      )}
    </div>
  );
}
