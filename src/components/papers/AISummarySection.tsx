import { Sparkles, TrendingUp } from 'lucide-react';
import type { Paper } from '../../lib/types';
import { RichTextRenderer } from '../common';
import { useLanguage } from '../../contexts/LanguageContext';

interface AISummarySectionProps {
  paper: Paper;
}

export function AISummarySection({ paper }: AISummarySectionProps) {
  const { t } = useLanguage();

  if (!paper.ai_summary) {
    return null;
  }

  const getProviderLabel = () => {
    // You could determine this from the paper's metadata
    // For now, we'll show a generic label
    return 'AI';
  };

  const getDepthLabel = () => {
    return paper.analysis_type || 'standard';
  };

  const getDepthColor = () => {
    switch (paper.analysis_type) {
      case 'full':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300';
      case 'standard':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case 'basic':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  return (
    <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-200">
            {t('papers.aiSummaryBlock.title')}
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-blue-700 dark:text-blue-300">{getProviderLabel()}</span>
          <span
            className={`px-2 py-1 text-xs font-medium rounded-full ${getDepthColor()}`}
          >
            {getDepthLabel()}
          </span>
        </div>
      </div>

      {/* Summary Content */}
      <RichTextRenderer
        content={paper.ai_summary}
        className="text-blue-800 dark:text-blue-300 leading-relaxed"
      />

      {/* Score Badge and Reason */}
      {paper.filter_score !== null && (
        <div className="mt-4 pt-4 border-t border-blue-200 dark:border-blue-800 space-y-3">
          {/* Relevance Score */}
          <div className="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-400">
            <TrendingUp className="w-4 h-4" />
            <span>{t('papers.aiSummaryBlock.relevanceScore')}</span>
            <span className="font-semibold text-blue-900 dark:text-blue-200">
              {(paper.filter_score / 10).toFixed(1)}/10
            </span>
          </div>

          {/* Analysis Mode Badge */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-blue-700 dark:text-blue-400">{t('papers.aiSummaryBlock.analysisMode')}</span>
            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
              paper.analysis_mode === 'full'
                ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
                : paper.analysis_mode === 'standard'
                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
            }`}>
              {paper.analysis_mode ? (paper.analysis_mode.charAt(0).toUpperCase() + paper.analysis_mode.slice(1)) : 'None'}
            </span>
          </div>

          {/* Model Reasoning */}
          {paper.filter_reason && (
            <div className="bg-white/50 dark:bg-gray-800/50 rounded-lg p-3">
              <p className="text-xs font-medium text-blue-900 dark:text-blue-200 mb-1">
                {t('papers.aiSummaryBlock.whyThisScore')}
              </p>
              <RichTextRenderer
                content={paper.filter_reason}
                className="text-xs text-blue-800 dark:text-blue-300 leading-relaxed"
              />
            </div>
          )}

          {/* Scoring Criteria Info */}
          <div className="text-xs text-blue-700 dark:text-blue-400">
            <p className="font-medium mb-1">{t('papers.aiSummaryBlock.scoringCriteria')}</p>
            <ul className="space-y-0.5 ml-4 list-disc">
              <li>{t('papers.aiSummaryBlock.criteria.highlyRelevant')}</li>
              <li>{t('papers.aiSummaryBlock.criteria.veryRelevant')}</li>
              <li>{t('papers.aiSummaryBlock.criteria.moderatelyRelevant')}</li>
              <li>{t('papers.aiSummaryBlock.criteria.somewhatRelevant')}</li>
              <li>{t('papers.aiSummaryBlock.criteria.notRelevant')}</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
