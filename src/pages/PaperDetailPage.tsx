import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ExternalLink, Trash2, Copy, Check, AlertTriangle, Lightbulb, Zap, Beaker, Clock, HardDrive, Link as LinkIcon, Type, FolderPlus, X, Plus } from 'lucide-react';
import { openUrl } from '@tauri-apps/plugin-opener';
import { usePaperById, useDeletePaper } from '../hooks/usePapers';
import { usePaperCollections, useRemovePaperFromCollection } from '../hooks/useCollections';
import { PaperMetadata } from '../components/papers/PaperMetadata';
import { PaperTags } from '../components/papers/PaperTags';
import { AuthorsList } from '../components/papers/AuthorsList';
import { AISummarySection } from '../components/papers/AISummarySection';
import { MermaidRenderer, LaTeXRenderer, RichTextRenderer } from '../components/common';
import { AddToCollectionDialog } from '../components/collections/AddToCollectionDialog';
import { getTopicColor, getTopicLabel } from '../lib/topics';
import { useLanguage } from '../contexts/LanguageContext';
import { useState, useRef, useEffect } from 'react';

export default function PaperDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [copiedType, setCopiedType] = useState<'link' | 'title' | 'citation' | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showAddToCollectionDialog, setShowAddToCollectionDialog] = useState(false);

  // Fetch paper collections
  const { data: paperCollections } = usePaperCollections(id || '');
  const removeFromCollection = useRemovePaperFromCollection();

  // Track timeout IDs to cleanup on unmount
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const { data: paper, isLoading, isError } = usePaperById(id);
  const deletePaperMutation = useDeletePaper();

  // Check if paper has been analyzed (either deep or quick)
  const isPaperAnalyzed = (paper: { is_deep_analyzed: boolean; filter_score: number | null; filter_reason: string | null }) => {
    return paper.is_deep_analyzed ||
      (paper.filter_score !== null &&
       paper.filter_reason !== null &&
       !paper.filter_reason.includes('No AI analysis'));
  };

  // Format authors to display as names (handles both string[] and AuthorInfo[])
  const formatAuthors = (authors: any[]) => {
    return authors.map(a => typeof a === 'string' ? a : a.name);
  };

  const handleDelete = () => {
    if (!paper) return;

    console.log('[PaperDetailPage] Delete button clicked for paper:', paper.id);

    // If paper has been analyzed, show confirmation dialog
    if (isPaperAnalyzed(paper)) {
      setShowDeleteConfirm(true);
    } else {
      // No analysis, delete directly
      console.log('[PaperDetailPage] Paper not analyzed, deleting directly');
      performDelete();
    }
  };

  const performDelete = () => {
    if (!paper) return;

    console.log('[PaperDetailPage] Calling deletePaperMutation.mutate with id:', paper.id);
    deletePaperMutation.mutate(paper.id, {
      onSuccess: () => {
        console.log('[PaperDetailPage] Delete successful, navigating to /papers');
        setShowDeleteConfirm(false);
        navigate('/papers');
      },
      onError: (error) => {
        console.error('[PaperDetailPage] Delete failed:', error);
        setShowDeleteConfirm(false);
      },
    });
  };

  const handleOpenArXiv = async () => {
    if (paper) {
      await openUrl(paper.arxiv_url);
    }
  };

  const handleOpenPDF = async () => {
    if (paper) {
      await openUrl(paper.pdf_url);
    }
  };

  const handleCopyLink = async () => {
    if (paper) {
      await navigator.clipboard.writeText(paper.arxiv_url);
      setCopiedType('link');
      // Clear previous timeout if exists
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      // Set new timeout and track it
      timeoutRef.current = setTimeout(() => setCopiedType(null), 2000);
    }
  };

  const handleCopyTitle = async () => {
    if (paper) {
      await navigator.clipboard.writeText(paper.title);
      setCopiedType('title');
      // Clear previous timeout if exists
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      // Set new timeout and track it
      timeoutRef.current = setTimeout(() => setCopiedType(null), 2000);
    }
  };

  const handleCopyCitation = async () => {
    if (paper) {
      // Generate a simple citation format
      const authors = formatAuthors(paper.authors).slice(0, 3).join(', ');
      const citation = `${authors} (${new Date(paper.published_date).getFullYear()}). ${paper.title}. arXiv preprint arXiv:${paper.arxiv_id}`;
      await navigator.clipboard.writeText(citation);
      setCopiedType('citation');
      // Clear previous timeout if exists
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      // Set new timeout and track it
      timeoutRef.current = setTimeout(() => setCopiedType(null), 2000);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <>
        <div className="p-8 max-w-5xl mx-auto">
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </div>
        <AddToCollectionDialog
          isOpen={showAddToCollectionDialog}
          onClose={() => setShowAddToCollectionDialog(false)}
          paperId={id}
        />
      </>
    );
  }

  // Error state
  if (isError || !paper) {
    return (
      <>
        <div className="p-8">
          {/* Back button */}
          <Link
            to="/papers"
            className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            {t('papers.detail.backToPapers')}
          </Link>

          {/* Paper not found */}
          <div className="flex flex-col items-center justify-center py-20">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
              {t('papers.detail.notFound')}
            </h2>

            <p className="text-gray-600 dark:text-gray-400 mb-8">
              {t('papers.detail.notFoundDescription', { id: id || '' })}
            </p>

            <Link
              to="/papers"
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:shadow-sm font-medium transition-all duration-200 cursor-pointer focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 inline-block"
            >
              {t('papers.detail.browsePapers')}
            </Link>
          </div>
        </div>
        <AddToCollectionDialog
          isOpen={showAddToCollectionDialog}
          onClose={() => setShowAddToCollectionDialog(false)}
          paperId={id}
        />
      </>
    );
  }

  return (
    <>
      <div className="p-8 max-w-5xl mx-auto">
      {/* Back button */}
      <Link
        to="/papers"
        className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        {t('papers.detail.backToPapers')}
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Title and Basic Info */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              {paper.title}
            </h1>

            {/* Metadata */}
            <div className="mb-4">
              <PaperMetadata paper={paper} showScore />
            </div>

            {/* Tags */}
            <div className="mb-4">
              <PaperTags tags={paper.tags} maxTags={undefined} />
            </div>

            {/* Topics */}
            {paper.topics && paper.topics.length > 0 && (
              <div className="mb-4">
                <div className="flex flex-wrap gap-2">
                  {paper.topics.map((topicKey) => {
                    const color = getTopicColor(topicKey);
                    const label = getTopicLabel(topicKey);
                    return (
                      <span
                        key={topicKey}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium ${color}`}
                      >
                        {label}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Authors with Affiliations */}
            <div className="mt-6">
              <AuthorsList authors={paper.authors} />
            </div>

            {/* Collections */}
            <div className="mt-6">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  📚 {t('papers.detail.collections.title')}
                </h2>
                <button
                  onClick={() => setShowAddToCollectionDialog(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  {t('papers.detail.collections.addTo')}
                </button>
              </div>

              {!paperCollections || paperCollections.length === 0 ? (
                <div className="text-center py-6 bg-gray-50 dark:bg-gray-700/30 rounded-lg border border-dashed border-gray-300 dark:border-gray-600">
                  <FolderPlus className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {t('papers.detail.collections.empty')}
                  </p>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {paperCollections.map((collection) => {
                    const colorClass = collection.color || 'bg-gray-500';
                    return (
                      <div
                        key={collection.id}
                        className={`group flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-800 rounded-lg border-2 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-all`}
                      >
                        <div className={`w-2.5 h-2.5 rounded-full ${colorClass} flex-shrink-0`} />
                        <Link
                          to={`/collections/${collection.id}`}
                          className="font-medium text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400"
                        >
                          {collection.name}
                        </Link>
                        <button
                          onClick={() => {
                            if (id) {
                              removeFromCollection.mutate(
                                { collectionId: collection.id, paperId: id },
                                {
                                  onSuccess: () => {
                                    // Refetch paper collections
                                  },
                                  onError: (error) => {
                                    console.error('Failed to remove from collection:', error);
                                  },
                                }
                              );
                            }
                          }}
                          className="opacity-0 group-hover:opacity-100 p-0.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded transition-all"
                          title={t('papers.detail.collections.removeFrom')}
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Abstract */}
            {paper.summary && (
              <div className="mt-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                  Abstract
                </h2>
                <RichTextRenderer
                  content={paper.summary}
                  className="text-gray-700 dark:text-gray-300 leading-relaxed"
                />
              </div>
            )}
          </div>

          {/* AI Summary */}
          <AISummarySection paper={paper} />

          {/* Quality Assessment (Full analysis only) */}
          {paper.analysis_mode === 'full' && (paper.novelty_score !== null || paper.effectiveness_score !== null || paper.experiment_completeness_score !== null) && (
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Quality Assessment
              </h2>
              <div className="space-y-4">
                {/* Novelty Score */}
                {paper.novelty_score !== null && paper.novelty_reason && (
                  <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                    <div className="flex items-start gap-3">
                      <Lightbulb className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-gray-900 dark:text-white">{t('papers.detail.quality.novelty')}</h3>
                          <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-200 dark:bg-amber-800 text-amber-800 dark:text-amber-200">
                            {paper.novelty_score}/10
                          </span>
                        </div>
                        <RichTextRenderer
                          content={paper.novelty_reason}
                          className="text-sm text-gray-700 dark:text-gray-300"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Effectiveness Score */}
                {paper.effectiveness_score !== null && paper.effectiveness_reason && (
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="flex items-start gap-3">
                      <Zap className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-gray-900 dark:text-white">{t('papers.detail.quality.effectiveness')}</h3>
                          <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-200 dark:bg-blue-800 text-blue-800 dark:text-blue-200">
                            {paper.effectiveness_score}/10
                          </span>
                        </div>
                        <RichTextRenderer
                          content={paper.effectiveness_reason}
                          className="text-sm text-gray-700 dark:text-gray-300"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Experiment Completeness Score (Full mode only) */}
                {paper.experiment_completeness_score !== null && paper.experiment_completeness_reason && (
                  <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                    <div className="flex items-start gap-3">
                      <Beaker className="w-5 h-5 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-gray-900 dark:text-white">{t('papers.detail.quality.experimentCompleteness')}</h3>
                          <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-purple-200 dark:bg-purple-800 text-purple-800 dark:text-purple-200">
                            {paper.experiment_completeness_score}/10
                          </span>
                        </div>
                        <RichTextRenderer
                          content={paper.experiment_completeness_reason}
                          className="text-sm text-gray-700 dark:text-gray-300"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Complexity Analysis (Full mode only) */}
              {(paper.time_complexity !== null || paper.space_complexity !== null) && (
                <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    {t('papers.detail.complexityAnalysis')}
                  </h3>
                  <div className="grid grid-cols-1 gap-4">
                    {paper.time_complexity && (
                      <div>
                        <dt className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('papers.detail.timeComplexity')}</dt>
                        <dd className="text-xs text-gray-900 dark:text-white bg-white dark:bg-gray-800 px-3 py-2 rounded overflow-x-auto whitespace-normal break-words">
                          <LaTeXRenderer latex={paper.time_complexity} display={false} />
                        </dd>
                      </div>
                    )}
                    {paper.space_complexity && (
                      <div>
                        <dt className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('papers.detail.spaceComplexity')}</dt>
                        <dd className="text-xs text-gray-900 dark:text-white bg-white dark:bg-gray-800 px-3 py-2 rounded overflow-x-auto whitespace-normal break-words">
                          <LaTeXRenderer latex={paper.space_complexity} display={false} />
                        </dd>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Algorithm Flowchart (Full mode only) */}
              {paper.algorithm_flowchart && (
                <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                    <HardDrive className="w-4 h-4" />
                    {t('papers.detail.algorithmFlowchart')}
                  </h3>
                  <MermaidRenderer chart={paper.algorithm_flowchart} />
                </div>
              )}

              {/* Analysis incomplete warning */}
              {paper.analysis_incomplete && (
                <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                  <p className="text-sm text-yellow-800 dark:text-yellow-300">
                    <strong>Note:</strong> {t('papers.detail.incompleteWarning')}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Key Insights */}
          {paper.key_insights && paper.key_insights.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                {t('papers.detail.keyInsights')}
              </h2>
              <ul className="space-y-2">
                {paper.key_insights.map((insight, index) => (
                  <li
                    key={index}
                    className="flex items-start gap-3 text-gray-700 dark:text-gray-300"
                  >
                    <span className="text-blue-600 dark:text-blue-400 mt-1 flex-shrink-0">
                      •
                    </span>
                    <RichTextRenderer
                      content={insight}
                      className="leading-relaxed flex-1"
                    />
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Engineering Notes */}
          {paper.engineering_notes && (
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                {t('papers.detail.engineeringNotes')}
              </h2>
              <RichTextRenderer
                content={paper.engineering_notes}
                className="text-gray-700 dark:text-gray-300 leading-relaxed"
              />
            </div>
          )}

          {/* Code Links */}
          {paper.code_links && paper.code_links.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                {t('papers.detail.codeLinks')}
              </h2>
              <ul className="space-y-2">
                {paper.code_links.map((link, index) => (
                  <li key={index}>
                    <a
                      href={link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-2"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span className="break-all">{link}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Key Formulas */}
          {paper.key_formulas && paper.key_formulas.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                {t('papers.detail.keyFormulas')}
              </h2>
              <div className="space-y-4">
                {paper.key_formulas.map((formula, index) => (
                  <div
                    key={index}
                    className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700"
                  >
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                      {formula.name}
                    </h3>
                    <div className="text-center my-3 p-3 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-600">
                      <LaTeXRenderer latex={formula.latex} display={true} />
                    </div>
                    <RichTextRenderer
                      content={formula.description}
                      className="text-sm text-gray-600 dark:text-gray-400"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Algorithms */}
          {paper.algorithms && paper.algorithms.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                {t('papers.detail.keyAlgorithms')}
              </h2>
              <div className="space-y-4">
                {paper.algorithms.map((algorithm, index) => (
                  <div
                    key={index}
                    className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700"
                  >
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2">
                      {algorithm.name}
                    </h3>
                    {algorithm.complexity && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1">
                        <span>{t('papers.detail.complexityAnalysis')}:</span>
                        <span className="text-gray-700 dark:text-gray-300">
                          <LaTeXRenderer latex={algorithm.complexity} display={false} />
                        </span>
                      </p>
                    )}
                    <div>
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        {t('papers.detail.steps')}:
                      </p>
                      <ol className="text-sm text-gray-600 dark:text-gray-400 list-decimal list-inside space-y-2">
                        {algorithm.steps.map((step, stepIndex) => (
                          <li key={stepIndex}>
                            <RichTextRenderer content={step} />
                          </li>
                        ))}
                      </ol>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Actions */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {t('papers.detail.actions.title')}
            </h2>
            <div className="space-y-2">
              <button
                onClick={handleOpenArXiv}
                className="w-full flex items-center gap-2 px-4 py-2 text-left text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                {t('papers.detail.actions.viewOnArxiv')}
              </button>
              <button
                onClick={handleOpenPDF}
                className="w-full flex items-center gap-2 px-4 py-2 text-left text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                {t('papers.detail.actions.openPdf')}
              </button>
              <button
                onClick={handleCopyLink}
                className={`w-full flex items-center gap-2 px-4 py-2 text-left rounded-lg transition-all duration-200 ${
                  copiedType === 'link'
                    ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 scale-105'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 active:scale-95'
                }`}
              >
                {copiedType === 'link' ? (
                  <Check className="w-4 h-4 animate-scale-in" />
                ) : (
                  <LinkIcon className="w-4 h-4" />
                )}
                <span className="font-medium">
                  {copiedType === 'link' ? t('papers.detail.actions.linkCopied') : t('papers.detail.actions.copyLink')}
                </span>
              </button>
              <button
                onClick={handleCopyTitle}
                className={`w-full flex items-center gap-2 px-4 py-2 text-left rounded-lg transition-all duration-200 ${
                  copiedType === 'title'
                    ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 scale-105'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 active:scale-95'
                }`}
              >
                {copiedType === 'title' ? (
                  <Check className="w-4 h-4 animate-scale-in" />
                ) : (
                  <Type className="w-4 h-4" />
                )}
                <span className="font-medium">
                  {copiedType === 'title' ? t('papers.detail.actions.titleCopied') : t('papers.detail.actions.copyTitle')}
                </span>
              </button>
              <button
                onClick={handleCopyCitation}
                className={`w-full flex items-center gap-2 px-4 py-2 text-left rounded-lg transition-all duration-200 ${
                  copiedType === 'citation'
                    ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 scale-105'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 active:scale-95'
                }`}
              >
                {copiedType === 'citation' ? (
                  <Check className="w-4 h-4 animate-scale-in" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
                <span className="font-medium">
                  {copiedType === 'citation' ? t('papers.detail.actions.citationCopied') : t('papers.detail.actions.copyCitation')}
                </span>
              </button>
              <button
                onClick={handleDelete}
                className="w-full flex items-center gap-2 px-4 py-2 text-left text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                {t('papers.detail.actions.deletePaper')}
              </button>
            </div>
          </div>

          {/* Paper Info */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {t('papers.detail.info.title')}
            </h2>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-gray-500 dark:text-gray-400">{t('papers.detail.info.arxivId')}</dt>
                <dd className="text-gray-900 dark:text-white font-mono text-xs">
                  {paper.arxiv_id}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500 dark:text-gray-400">{t('papers.detail.info.published')}</dt>
                <dd className="text-gray-900 dark:text-white">
                  {new Date(paper.published_date).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </dd>
              </div>
              {/* Analysis Level - always show to indicate what analysis was performed */}
              <div>
                <dt className="text-gray-500 dark:text-gray-400">{t('papers.detail.info.analysis')}</dt>
                <dd className={`font-medium ${
                  paper.is_deep_analyzed
                    ? 'text-green-600 dark:text-green-400'
                    : paper.filter_score !== null && paper.filter_reason !== null && !paper.filter_reason.includes('No AI analysis')
                    ? 'text-purple-600 dark:text-purple-400'
                    : 'text-gray-600 dark:text-gray-400'
                }`}>
                  {paper.is_deep_analyzed
                    ? t('papers.detail.analysisStatus.deep')
                    : paper.filter_score !== null && paper.filter_reason !== null && !paper.filter_reason.includes('No AI analysis')
                    ? t('papers.detail.analysisStatus.quick')
                    : t('papers.detail.analysisStatus.none')}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>

      {/* Delete Confirmation Dialog for Analyzed Papers */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-shrink-0 w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {t('papers.deleteDialog.title')}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {t('papers.deleteDialog.description')}
                </p>
              </div>
            </div>

            <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
              <p className="text-sm text-yellow-800 dark:text-yellow-300 font-medium mb-1">
                {t('papers.deleteDialog.warning')}
              </p>
              <p className="text-xs text-yellow-700 dark:text-yellow-400">
                {t('papers.deleteDialog.analyzedWarning')}
                {paper.is_deep_analyzed && (
                  <span className="block mt-1">{t('papers.deleteDialog.deepAnalysis')}</span>
                )}
                {!paper.is_deep_analyzed && paper.filter_score !== null && (
                  <span className="block mt-1">{t('papers.deleteDialog.quickAnalysis')}</span>
                )}
                {paper.ai_summary && (
                  <span className="block mt-1">{t('papers.deleteDialog.aiSummary')}</span>
                )}
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 font-medium transition-colors"
              >
                {t('papers.deleteDialog.cancel')}
              </button>
              <button
                onClick={performDelete}
                disabled={deletePaperMutation.isPending}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {deletePaperMutation.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    {t('papers.deleteDialog.deleting')}
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    {t('papers.deleteDialog.deleteAnyway')}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add to Collection Dialog */}
      <AddToCollectionDialog
        isOpen={showAddToCollectionDialog}
        onClose={() => setShowAddToCollectionDialog(false)}
        paperId={id}
      />
    </>
  );
}
