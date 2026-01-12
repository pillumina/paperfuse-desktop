import { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { Paper, TopicConfig } from '../../lib/types';
import { PaperListItem } from './PaperListItem';
import type { AnalysisMode, AnalysisLanguage } from './AnalysisModeDialog';

interface VirtualPaperListProps {
  papers: Paper[];
  onDelete?: (id: string) => void;
  onToggleSpam?: (id: string) => void;
  onAnalyze?: (id: string, mode: AnalysisMode, language: AnalysisLanguage) => void;
  showSpamActions?: boolean;
  onPermanentDelete?: (id: string) => void;
  isSelectionMode?: boolean;
  selectedPaperIds?: Set<string>;
  onToggleSelection?: (paperId: string, event?: React.MouseEvent | KeyboardEvent) => void;
  topics?: TopicConfig[];
}

/**
 * Virtual scrolling version of PaperList for better performance with large datasets
 * Only renders visible papers in the viewport + overscan
 */
export function VirtualPaperList({
  papers,
  onDelete,
  onToggleSpam,
  onAnalyze,
  showSpamActions = false,
  onPermanentDelete,
  isSelectionMode = false,
  selectedPaperIds = new Set(),
  onToggleSelection,
  topics = []
}: VirtualPaperListProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: papers.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 280, // Estimated height of a paper card in list view
    overscan: 5, // Render 5 extra items above/below viewport
  });

  if (papers.length === 0) {
    return null;
  }

  return (
    <div
      ref={parentRef}
      className="overflow-auto" // Virtual scrolling container
      style={{
        height: 'calc(100vh - 160px)', // Reduced for more height
        contain: 'strict', // CSS containment for better performance
      }}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const paper = papers[virtualRow.index];
          return (
            <div
              key={virtualRow.key}
              data-index={virtualRow.index}
              ref={virtualizer.measureElement}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualRow.start}px)`,
              }}
              className="pb-3" // Space between items
            >
              <div
                className="animate-slide-up-fade"
                style={{
                  animationDelay: `${virtualRow.index * 35}ms`,
                  animationFillMode: 'both',
                }}
              >
                <PaperListItem
                  paper={paper}
                  onDelete={showSpamActions ? onPermanentDelete : onDelete}
                  onToggleSpam={showSpamActions ? undefined : onToggleSpam}
                  onAnalyze={showSpamActions ? undefined : onAnalyze}
                  isSelectionMode={isSelectionMode}
                  isSelected={selectedPaperIds.has(paper.id)}
                  onToggleSelection={(event) => onToggleSelection?.(paper.id, event)}
                  topics={topics}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

