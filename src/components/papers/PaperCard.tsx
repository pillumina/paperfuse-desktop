import { Tag, Sparkles, Trash2, MoreVertical, Code2, CheckSquare, Square } from 'lucide-react';
import type { Paper, TopicConfig } from '../../lib/types';
import { PaperMetadata } from './PaperMetadata';
import { PaperTags } from './PaperTags';
import { HoverPreviewTooltip } from './HoverPreviewTooltip';
import { ActionContextMenu } from './ActionContextMenu';
import { AnalysisModeDialog, type AnalysisMode, type AnalysisLanguage } from './AnalysisModeDialog';
import { getScoreColor } from '../../lib/utils';
import { useState, useMemo } from 'react';

interface PaperCardProps {
  paper: Paper;
  onClick?: () => void;
  onDelete?: (id: string) => void;
  onToggleSpam?: (id: string) => void;
  onAnalyze?: (id: string, mode: AnalysisMode, language: AnalysisLanguage) => void;
  isSelectionMode?: boolean;
  isSelected?: boolean;
  onToggleSelection?: (event?: React.MouseEvent | KeyboardEvent) => void;
  topics?: TopicConfig[];
}

export function PaperCard({
  paper,
  onClick,
  onDelete,
  onToggleSpam,
  onAnalyze,
  isSelectionMode = false,
  isSelected = false,
  onToggleSelection,
  topics = []
}: PaperCardProps) {
  const [showActions, setShowActions] = useState(false);
  const [showAnalysisDialog, setShowAnalysisDialog] = useState(false);

  // Local helper to find topic label by key
  const getTopicLabel = useMemo(() => {
    return (key: string): string => {
      const topic = topics.find(t => t.key === key);
      return topic?.label || key;
    };
  }, [topics]);

  // Local helper to find topic color by key
  const getTopicColor = useMemo(() => {
    return (key: string): string => {
      const topic = topics.find(t => t.key === key);
      return topic?.color || 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    };
  }, [topics]);

  // Convert 0-100 score to 0-10 scale for display
  const displayScore = paper.filter_score !== null
    ? (paper.filter_score / 10).toFixed(1)
    : null;

  // Determine analysis level for display
  // 1. Deep analysis: has full analysis including ai_summary, key_insights, etc.
  // 2. Quick analysis: has filter_score but not deep analyzed
  // 3. No analysis: no filter_score at all
  const hasDeepAnalysis = paper.is_deep_analyzed;
  // Check both filter_score AND filter_reason to avoid false positives
  const hasQuickAnalysis = !hasDeepAnalysis
    && paper.filter_score !== null
    && paper.filter_reason !== null
    && !paper.filter_reason.includes('No AI analysis');

  // Get primary category for display
  const primaryCategory = paper.tags.length > 0 ? paper.tags[0] : null;

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click
    console.log('[PaperCard] Delete button clicked for paper:', paper.id);
    // Tauri doesn't support browser confirm(), use direct delete
    console.log('[PaperCard] Calling onDelete with id:', paper.id);
    onDelete?.(paper.id);
  };

  const handleActionsClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click
    console.log('[PaperCard] Actions button clicked, current showActions:', showActions);
    setShowActions(!showActions);
    console.log('[PaperCard] New showActions will be:', !showActions);
  };

  return (
    <>
      <ActionContextMenu paper={paper} onDelete={onDelete} onToggleSpam={onToggleSpam} onAnalyze={onAnalyze}>
        <HoverPreviewTooltip paper={paper} disabled={isSelectionMode}>
          <div
            onClick={isSelectionMode ? onToggleSelection : onClick}
            className={`relative bg-white dark:bg-gray-800 rounded-xl hover:shadow-card-hover hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 ease-out cursor-pointer group ${
              isSelectionMode && isSelected ? 'ring-2 ring-blue-500 border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border border-gray-200 dark:border-gray-700 hover:border-blue-400'
            }`}
          >
            {/* Selection Checkbox - always visible on hover or in selection mode */}
            <div className={`absolute top-3 left-3 z-10 transition-opacity duration-200 ${
              isSelectionMode ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
            }`}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleSelection?.(e);
                }}
                className={`p-1.5 rounded-lg transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                  isSelected
                    ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 scale-110'
                    : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:scale-110'
                }`}
                aria-label={isSelected ? 'Deselect paper' : 'Select paper'}
              >
                {isSelected ? (
                  <CheckSquare className="w-5 h-5 transition-transform duration-200" />
                ) : (
                  <Square className="w-5 h-5 transition-transform duration-200" />
                )}
              </button>
            </div>

            {/* Action Menu Button */}
            {onDelete && !isSelectionMode && (
              <div className="absolute top-3 right-3 z-10 flex items-center gap-1">
                {/* Quick Analyze Button */}
                {onAnalyze && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowAnalysisDialog(true);
                    }}
                    className="p-1.5 text-purple-500 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                    title="Re-analyze"
                  >
                    <Sparkles className="w-4 h-4" />
                  </button>
                )}

                {/* More Options Dropdown */}
                <div className="relative">
                  <button
                    onClick={handleActionsClick}
                    className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                    title="More options"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>

                  {/* Dropdown Menu */}
                  {showActions && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setShowActions(false)}
                      />
                      <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-card-hover py-1 z-20 animate-slide-in-top">
                        {onAnalyze && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowActions(false);
                              setShowAnalysisDialog(true);
                            }}
                            className="w-full px-4 py-2 text-left text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 flex items-center gap-2 transition-colors"
                          >
                            <Sparkles className="w-4 h-4" />
                            Re-analyze
                          </button>
                        )}
                        <button
                          onClick={handleDelete}
                          className="w-full px-4 py-2 text-left text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete Paper
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Content wrapper with left padding to avoid checkbox */}
            <div className="p-6 pl-10">
              {/* Title */}
              <div className="mb-3">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white line-clamp-2 pr-8 tracking-tight leading-snug group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-200">
                  {paper.title}
                </h3>
                {/* Code Available Badge */}
                {paper.code_available && (
                  <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400">
                    <Code2 className="w-3 h-3" />
                    <span>Code</span>
                  </div>
                )}
                {/* Topics Badges */}
                {paper.topics && paper.topics.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {paper.topics.map((topicKey) => {
                      const color = getTopicColor(topicKey);
                      const label = getTopicLabel(topicKey);
                      return (
                        <span
                          key={topicKey}
                          className={`px-2.5 py-1 rounded-full text-xs font-semibold ${color}`}
                        >
                          {label}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Metadata - vertical layout for grid cards */}
              <div className="mb-3 space-y-1.5">
                <PaperMetadata paper={paper} showScore={false} variant="compact" />
              </div>

              {/* Summary Preview */}
              {paper.summary && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-3">
                  {paper.summary}
                </p>
              )}

              {/* Tags - displayed below topics */}
              <div className="mb-4">
                <PaperTags tags={paper.tags} maxTags={3} />
              </div>

              {/* Footer - show relevance or category based on analysis status */}
              <div className="flex items-center justify-between mt-auto pt-4 border-t border-gray-100 dark:border-gray-700">
                {hasDeepAnalysis ? (
                  // Deep analysis: show "Analyzed" + relevance score
                  <>
                    <div className="flex items-center gap-1.5 text-sm text-gray-500">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Deep analysis</span>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium ${getScoreColor(
                        paper.filter_score
                      )}`}
                    >
                      {displayScore}/10
                    </span>
                  </>
                ) : hasQuickAnalysis ? (
                  // Quick analysis: show category + relevance score with different style
                  <>
                    <div className="flex items-center gap-1.5 text-sm text-gray-500">
                      <Tag className="w-3.5 h-3.5" />
                      <span>{primaryCategory || 'Uncategorized'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-medium ${getScoreColor(
                          paper.filter_score
                        )}`}
                      >
                        {displayScore}/10
                      </span>
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400">
                        Quick
                      </span>
                    </div>
                  </>
                ) : (
                  // No analysis: show primary category + "New" badge
                  <>
                    <div className="flex items-center gap-1.5 text-sm text-gray-500">
                      <Tag className="w-3.5 h-3.5" />
                      <span>{primaryCategory || 'Uncategorized'}</span>
                    </div>
                    <span className="px-3 py-1 rounded-full text-sm font-medium bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400">
                      New
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        </HoverPreviewTooltip>
      </ActionContextMenu>

      {/* Analysis Mode Dialog */}
      {onAnalyze && (
        <AnalysisModeDialog
          isOpen={showAnalysisDialog}
          onClose={() => setShowAnalysisDialog(false)}
          onConfirm={(mode, language) => {
            setShowAnalysisDialog(false);
            onAnalyze(paper.id, mode, language);
          }}
        />
      )}
    </>
  );
}
