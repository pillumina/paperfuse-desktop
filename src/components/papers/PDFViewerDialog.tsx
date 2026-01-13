import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, Download, Loader2, ExternalLink } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { useLanguage } from '../../contexts/LanguageContext';

interface PDFViewerDialogProps {
  isOpen: boolean;
  onClose: () => void;
  paperId: string;
  paperTitle: string;
}

export function PDFViewerDialog({ isOpen, onClose, paperId, paperTitle }: PDFViewerDialogProps) {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pdfPath, setPdfPath] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  // Load PDF when dialog opens
  useEffect(() => {
    if (!isOpen) {
      setPdfPath(null);
      setError(null);
      return;
    }

    const loadPDF = async () => {
      try {
        console.log('[PDFViewerDialog] Starting PDF load for paper:', paperId);
        setLoading(true);
        setError(null);

        // Check if PDF is already downloaded
        console.log('[PDFViewerDialog] Calling get_pdf_path...');
        const path = await invoke<string>('get_pdf_path', { paperId });
        console.log('[PDFViewerDialog] get_pdf_path returned:', path);

        if (!path) {
          console.log('[PDFViewerDialog] No PDF path found');
          setLoading(false);
          return;
        }

        setPdfPath(path);
        setLoading(false);
        console.log('[PDFViewerDialog] PDF path set successfully');
      } catch (err) {
        console.error('[PDFViewerDialog] Error loading PDF:', err);
        console.error('[PDFViewerDialog] Error details:', {
          message: err instanceof Error ? err.message : String(err),
          name: err instanceof Error ? err.name : 'Unknown',
          stack: err instanceof Error ? err.stack : undefined
        });
        setError(err instanceof Error ? err.message : t('papers.pdfViewer.loadError'));
        setLoading(false);
      }
    };

    loadPDF();
  }, [isOpen, paperId, t]);

  // Handle PDF download
  const handleDownload = useCallback(async () => {
    try {
      console.log('[PDFViewerDialog] Starting PDF download for paper:', paperId);
      setDownloading(true);
      setError(null);

      console.log('[PDFViewerDialog] Calling download_paper_pdf...');
      const path = await invoke<string>('download_paper_pdf', { paperId });
      console.log('[PDFViewerDialog] download_paper_pdf returned path:', path);

      setPdfPath(path);
      setDownloading(false);
      console.log('[PDFViewerDialog] PDF download completed successfully');
    } catch (err) {
      console.error('[PDFViewerDialog] Error during PDF download:', err);
      console.error('[PDFViewerDialog] Error details:', {
        message: err instanceof Error ? err.message : String(err),
        name: err instanceof Error ? err.name : 'Unknown',
        stack: err instanceof Error ? err.stack : undefined
      });
      setError(err instanceof Error ? err.message : t('papers.pdfViewer.downloadError'));
      setDownloading(false);
    }
  }, [paperId, t]);

  // Handle open in default viewer
  const handleOpenInViewer = useCallback(async () => {
    if (pdfPath) {
      try {
        console.log('[PDFViewerDialog] Opening PDF in default viewer:', pdfPath);
        await invoke('open_local_file', { path: pdfPath });
        console.log('[PDFViewerDialog] PDF opened successfully');
      } catch (err) {
        console.error('[PDFViewerDialog] Error opening PDF:', err);
        setError(err instanceof Error ? err.message : 'Failed to open PDF');
      }
    }
  }, [pdfPath]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-md shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white truncate pr-4 flex-1">
            {paperTitle}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex-shrink-0"
            aria-label={t('common.buttons.close')}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <Loader2 className="w-10 h-10 text-blue-500 animate-spin mx-auto mb-3" />
                <p className="text-gray-700 dark:text-gray-300 text-sm">{t('papers.pdfViewer.loading')}</p>
              </div>
            </div>
          )}

          {!loading && !pdfPath && (
            <div className="text-center">
              <p className="text-gray-600 dark:text-gray-400 mb-4 text-sm">
                PDF not downloaded yet
              </p>
              <button
                onClick={handleDownload}
                disabled={downloading}
                className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
              >
                {downloading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    {t('papers.pdfViewer.downloading')}
                  </>
                ) : (
                  <>
                    <Download className="w-5 h-5" />
                    {t('papers.pdfViewer.download')}
                  </>
                )}
              </button>
            </div>
          )}

          {!loading && pdfPath && !error && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 px-3 py-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0"></div>
                <p className="text-sm text-green-700 dark:text-green-300 flex-1 truncate">
                  Ready to open
                </p>
              </div>

              <button
                onClick={handleOpenInViewer}
                className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer font-medium"
              >
                <ExternalLink className="w-5 h-5" />
                Open PDF Viewer
              </button>

              <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                Opens in your system's default PDF application
              </p>
            </div>
          )}

          {error && (
            <div className="text-center">
              <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg mb-4">
                <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
              </div>
              <button
                onClick={handleDownload}
                disabled={downloading}
                className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
              >
                {downloading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    {t('papers.pdfViewer.downloading')}
                  </>
                ) : (
                  <>
                    <Download className="w-5 h-5" />
                    Download PDF
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
