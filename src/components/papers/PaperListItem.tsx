import { useState, useMemo } from 'react';
import { ChevronDown, ChevronRight, CheckSquare, Square, Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { Paper, TopicConfig } from '../../lib/types';
import { PaperMetadata } from './PaperMetadata';
import { PaperTags } from './PaperTags';
import { PaperActions } from './PaperActions';
import { HoverPreviewTooltip } from './HoverPreviewTooltip';
import { ActionContextMenu } from './ActionContextMenu';
import type { AnalysisMode, AnalysisLanguage } from './AnalysisModeDialog';
import { useLanguage } from '../../contexts/LanguageContext';
import { usePaperCollections } from '../../hooks/useCollections';

interface PaperListItemProps {
  paper: Paper;
  onDelete?: (id: string) => void;
  onToggleSpam?: (id: string) => void;
  onAnalyze?: (id: string, mode: AnalysisMode, language: AnalysisLanguage) => void;
  isSelectionMode?: boolean;
  isSelected?: boolean;
  onToggleSelection?: (event?: React.MouseEvent | KeyboardEvent) => void;
  topics?: TopicConfig[];
}

export function PaperListItem({
  paper,
  onDelete,
  onToggleSpam,
  onAnalyze,
  isSelectionMode = false,
  isSelected = false,
  onToggleSelection,
  topics = []
}: PaperListItemProps) {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { data: paperCollections } = usePaperCollections(paper.id);
  const [isExpanded, setIsExpanded] = useState(false);

  // Check if paper is in any collection
  const isInAnyCollection = paperCollections && paperCollections.length > 0;

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

  return (
    <ActionContextMenu paper={paper} onDelete={onDelete} onToggleSpam={onToggleSpam} onAnalyze={onAnalyze}>
      <HoverPreviewTooltip paper={paper} disabled={isSelectionMode}>
        <div className={`border rounded-xl hover:shadow-card-hover transition-all duration-200 ease-out bg-white dark:bg-gray-800 group ${
          isSelectionMode && isSelected ? 'ring-2 ring-blue-500 border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-700 hover:border-blue-400'
        }`}>
      {/* Collapsed Row */}
      <div
        className="flex items-start gap-4 p-4 cursor-pointer"
        onClick={() => isSelectionMode ? onToggleSelection?.() : setIsExpanded(!isExpanded)}
      >
        {/* Expand/Collapse Chevron */}
        <div className="flex-shrink-0 mt-1">
          <button
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-transform duration-200 cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              if (!isSelectionMode) setIsExpanded(!isExpanded);
            }}
            style={{
              transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
            }}
          >
            {isExpanded ? (
              <ChevronDown className="w-5 h-5" />
            ) : (
              <ChevronRight className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* Selection Checkbox - visible on hover or in selection mode */}
        <div className={`flex-shrink-0 mt-1 transition-opacity duration-200 ${
          isSelectionMode ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
        }`}>
          <button
            className={`transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
              isSelected
                ? 'text-blue-600 dark:text-blue-400 scale-110'
                : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:scale-110'
            }`}
            onClick={(e) => {
              e.stopPropagation();
              onToggleSelection?.(e);
            }}
            aria-label={isSelected ? 'Deselect paper' : 'Select paper'}
          >
            {isSelected ? (
              <CheckSquare className="w-5 h-5 transition-transform duration-200" />
            ) : (
              <Square className="w-5 h-5 transition-transform duration-200" />
            )}
          </button>
        </div>

        {/* Title and Metadata */}
        <div className="flex-1 min-w-0">
          {/* Title and Collection Indicator */}
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white line-clamp-2 flex-1">
              {paper.title}
            </h3>
            {/* Collection Indicator Badge */}
            {isInAnyCollection && (
              <div className="flex-shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400" title={t('papers.card.inCollectionTooltip')}>
                <Star className="w-3 h-3 fill-amber-500 text-amber-500 dark:fill-amber-400 dark:text-amber-400" />
              </div>
            )}
          </div>

          {/* Metadata */}
          <PaperMetadata paper={paper} showScore />

          {/* Topics Badges - displayed above tags */}
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

          {/* Tags - displayed below topics */}
          <div className="mt-2">
            <PaperTags tags={paper.tags} maxTags={3} />
          </div>
        </div>

        {/* Quick Actions */}
        <div
          className="flex-shrink-0"
          onClick={(e) => e.stopPropagation()} // Prevent expanding when clicking actions
        >
          <PaperActions paper={paper} onDelete={onDelete} onAnalyze={onAnalyze} variant="row" />
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-4 pb-4 pl-14 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/30 animate-expand">
          {/* Original Summary */}
          {paper.summary && (
            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Abstract
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-4">
                {paper.summary}
              </p>
            </div>
          )}

          {/* AI Summary */}
          {paper.ai_summary && (
            <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
              <h4 className="text-sm font-medium text-blue-900 dark:text-blue-200 mb-2 flex items-center gap-2">
                <span>AI Summary</span>
                <span className="px-2 py-0.5 text-xs bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-200 rounded-full">
                  {paper.analysis_type || 'standard'}
                </span>
              </h4>
              <p className="text-sm text-blue-800 dark:text-blue-300 line-clamp-4">
                {paper.ai_summary}
              </p>
            </div>
          )}

          {/* Key Insights */}
          {paper.key_insights && paper.key_insights.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Key Insights
              </h4>
              <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                {paper.key_insights.slice(0, 3).map((insight, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-blue-600 dark:text-blue-400 mt-0.5">•</span>
                    <span className="line-clamp-2">{insight}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Engineering Notes */}
          {paper.engineering_notes && (
            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Engineering Notes
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3">
                {paper.engineering_notes}
              </p>
            </div>
          )}

          {/* View Detail Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/papers/${paper.id}`);
            }}
            className="mt-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer"
          >
            View Full Details
          </button>
        </div>
      )}
    </div>
    </HoverPreviewTooltip>
    </ActionContextMenu>
  );
}
