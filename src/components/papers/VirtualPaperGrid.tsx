import { useRef, useEffect, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useNavigate } from 'react-router-dom';
import type { Paper, TopicConfig } from '../../lib/types';
import { PaperCard } from './PaperCard';
import type { AnalysisMode, AnalysisLanguage } from './AnalysisModeDialog';

interface VirtualPaperGridProps {
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
 * Virtual scrolling version of PaperGrid for better performance with large datasets
 * Renders cards in rows, only showing visible rows in the viewport
 */
export function VirtualPaperGrid({
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
}: VirtualPaperGridProps) {
  const navigate = useNavigate();
  const parentRef = useRef<HTMLDivElement>(null);
  const [columnsCount, setColumnsCount] = useState(3);

  // Detect columns count based on screen width
  useEffect(() => {
    const updateColumns = () => {
      const width = window.innerWidth;
      if (width < 768) {
        setColumnsCount(1); // Mobile
      } else if (width < 1024) {
        setColumnsCount(2); // Tablet
      } else {
        setColumnsCount(3); // Desktop
      }
    };

    updateColumns();
    window.addEventListener('resize', updateColumns);
    return () => window.removeEventListener('resize', updateColumns);
  }, []);

  // Group papers into rows
  const rows: Paper[][] = [];
  for (let i = 0; i < papers.length; i += columnsCount) {
    rows.push(papers.slice(i, i + columnsCount));
  }

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 500, // Estimated height of a row of cards
    overscan: 2, // Render 2 extra rows above/below viewport
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
          const row = rows[virtualRow.index];
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
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-6">
                {row.map((paper, cardIndex) => (
                  <div
                    key={paper.id}
                    className="animate-slide-up-fade"
                    style={{
                      animationDelay: `${(virtualRow.index * columnsCount + cardIndex) * 40}ms`,
                      animationFillMode: 'both',
                    }}
                  >
                    <PaperCard
                      paper={paper}
                      onClick={() => isSelectionMode ? onToggleSelection?.(paper.id) : navigate(`/papers/${paper.id}`)}
                      onDelete={showSpamActions ? onPermanentDelete : onDelete}
                      onToggleSpam={showSpamActions ? undefined : onToggleSpam}
                      onAnalyze={showSpamActions ? undefined : onAnalyze}
                      isSelectionMode={isSelectionMode}
                      isSelected={selectedPaperIds.has(paper.id)}
                      onToggleSelection={(event) => onToggleSelection?.(paper.id, event)}
                      topics={topics}
                    />
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

