import { Calendar, TrendingUp, Users, Hash, Code2 } from 'lucide-react';
import type { Paper } from '../../lib/types';
import { useLanguage } from '../../contexts/LanguageContext';
import { getScoreColor } from '../../lib/utils';

interface PaperMetadataProps {
  paper: Paper;
  showScore?: boolean;
  variant?: 'default' | 'compact';
}

export function PaperMetadata({ paper, showScore = true, variant = 'default' }: PaperMetadataProps) {
  const { t } = useLanguage();

  // Helper to format token count
  const formatTokenCount = (tokens: number | null) => {
    if (tokens == null) return null;
    return `(~${(tokens / 1000).toFixed(1)}k tokens)`;
  };

  // Format authors to display as names
  const formatAuthors = () => {
    return paper.authors.map(a => typeof a === 'string' ? a : a.name);
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  // Convert 0-100 score to 0-10 scale for display
  const displayScore = paper.filter_score !== null
    ? (paper.filter_score / 10).toFixed(1)
    : null;

  // Compact variant: vertical stack for grid cards
  if (variant === 'compact') {
    return (
      <div className="space-y-1.5 text-sm text-gray-600 dark:text-gray-400">
        {/* Published Date */}
        <div className="flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="truncate">{formatDate(paper.published_date)}</span>
        </div>

        {/* Authors (truncated) */}
        <div className="flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5 flex-shrink-0" />
          <div className="truncate flex-1" title={formatAuthors().join(', ')}>
            {paper.authors.length > 0 ? (
              <span className="truncate block">
                {formatAuthors().slice(0, 2).join(', ')}
                {paper.authors.length > 2 && `, ${t('papers.detail.metadata.moreAuthors', { count: paper.authors.length - 2 })}`}
              </span>
            ) : (
              <span className="italic truncate">{t('papers.detail.metadata.unknownAuthors')}</span>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Default variant: horizontal layout for list view
  return (
    <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400 flex-wrap">
      {/* Published Date */}
      <div className="flex items-center gap-1">
        <Calendar className="w-3.5 h-3.5" />
        <span>{formatDate(paper.published_date)}</span>
      </div>

      {/* Authors (truncated) */}
      <div className="truncate" title={formatAuthors().join(', ')}>
        {paper.authors.length > 0 ? (
          <span className="truncate">
            {formatAuthors().slice(0, 2).join(', ')}
            {paper.authors.length > 2 && `, ${t('papers.detail.metadata.moreAuthors', { count: paper.authors.length - 2 })}`}
          </span>
        ) : (
          <span className="italic">{t('papers.detail.metadata.unknownAuthors')}</span>
        )}
      </div>

      {/* ArXiv ID */}
      <div className="flex items-center gap-1">
        <Hash className="w-3.5 h-3.5" />
        <span className="font-mono text-xs">{paper.arxiv_id}</span>
      </div>

      {/* Relevance Score and Analysis Level */}
      {showScore && paper.filter_score !== null && paper.filter_reason !== null && !paper.filter_reason.includes('No AI analysis') && (
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" />
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-medium ${getScoreColor(
                paper.filter_score
              )}`}
            >
              {displayScore}/10
            </span>
          </div>
          {/* Show "Quick" badge for quick analysis, "Deep" for deep analysis */}
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
            paper.is_deep_analyzed
              ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
              : 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
          }`}>
            {paper.is_deep_analyzed ? t('papers.detail.metadata.analysisDeep') : t('papers.detail.metadata.analysisQuick')}
          </span>
        </div>
      )}

      {/* Code Available Badge */}
      {paper.code_available && (
        <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400">
          <Code2 className="w-3 h-3" />
          <span>{t('papers.detail.metadata.code')}</span>
        </div>
      )}

      {/* Content Source Badge */}
      {paper.content_source && paper.content_source !== 'abstract' && (() => {
        const isHtml = paper.content_source === 'html';
        const className = isHtml
          ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
          : 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400';
        return (
          <div className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${className}`}>
            <span>{t('papers.detail.metadata.contentSource')}: {isHtml ? 'HTML' : 'LaTeX'}</span>
            {paper.estimated_tokens != null && (
              <span className="opacity-75">
                {formatTokenCount(paper.estimated_tokens)}
              </span>
            )}
          </div>
        );
      })()}
    </div>
  );
}
