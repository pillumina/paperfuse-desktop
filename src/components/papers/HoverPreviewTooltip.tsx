import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Star, Sparkles, ExternalLink } from 'lucide-react';
import type { Paper } from '../../lib/types';
import { getScoreColor } from '../../lib/utils';

interface HoverPreviewTooltipProps {
  paper: Paper;
  children: React.ReactElement;
  delay?: number;
  disabled?: boolean;
}

export function HoverPreviewTooltip({ paper, children, delay = 500, disabled = false }: HoverPreviewTooltipProps) {
  const navigate = useNavigate();
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0, placement: 'bottom' as 'top' | 'bottom' });
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const hideTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const hasStartedDelayRef = useRef(false); // Track if we've already started the delay

  // Detect if device supports touch
  const isTouchDevice = useRef(typeof window !== 'undefined' && 'ontouchstart' in window);
  // Reduce delay for touch devices
  const effectiveDelay = isTouchDevice.current ? 0 : delay;

  const showTooltip = () => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const tooltipHeight = 400; // 估算tooltip高度
      const tooltipWidth = 320; // 估算tooltip宽度

      // 检查下方空间是否足够
      const spaceBelow = window.innerHeight - rect.bottom;
      const showAbove = spaceBelow < tooltipHeight + 16;

      // 计算位置
      let top = showAbove ? rect.top - tooltipHeight - 8 : rect.bottom + 8;

      // 确保不会超出视口顶部
      if (top < 8) {
        top = 8;
      }

      // 检查右边界
      let left = rect.left;
      if (left + tooltipWidth > window.innerWidth - 16) {
        left = window.innerWidth - tooltipWidth - 16;
      }

      // 确保不会超出左边界
      if (left < 16) {
        left = 16;
      }

      setPosition({
        top,
        left,
        placement: showAbove ? 'top' : 'bottom'
      });
      setIsVisible(true);
    }
  };

  const hideTooltip = () => {
    setIsVisible(false);
  };

  // Check if mouse is over actual content (not just padding/gaps)
  const isOverContent = (mouseX: number, mouseY: number): boolean => {
    if (!containerRef.current) return true;

    const rect = containerRef.current.getBoundingClientRect();

    // First, quick bounds check - exclude obvious padding
    const paddingX = rect.width * 0.08; // 8% padding on each side
    const paddingY = rect.height * 0.04; // 4% padding on top/bottom

    const quickLeft = rect.left + paddingX;
    const quickRight = rect.right - paddingX;
    const quickTop = rect.top + paddingY;
    const quickBottom = rect.bottom - paddingY;

    // Quick reject: if outside inner bounds, not over content
    if (mouseX < quickLeft || mouseX > quickRight || mouseY < quickTop || mouseY > quickBottom) {
      return false;
    }

    // More precise check: use elementFromPoint to see what's under the cursor
    const element = document.elementFromPoint(mouseX, mouseY);
    if (!element) return true;

    // Check if the element or its parents are "content" elements
    // Content elements: text, buttons, links, badges, etc.
    const contentSelectors = [
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',           // Headings
      'p', 'span', 'a',                              // Text, links
      'button',                                      // Buttons
      '[class*="badge"]', '[class*="tag"]',          // Badges and tags
      '[class*="meta"]', '[class*="info"]',          // Metadata/info
      'svg',                                         // Icons
    ];

    // Check if the element itself matches
    for (const selector of contentSelectors) {
      if (element.matches(selector)) {
        return true;
      }
    }

    // Check if any parent matches (up to 3 levels)
    let current: Element | null = element;
    for (let i = 0; i < 3 && current && current !== containerRef.current; i++) {
      for (const selector of contentSelectors) {
        if (current.matches(selector)) {
          return true;
        }
      }
      current = current.parentElement;
    }

    // If we didn't find any content elements, treat as empty space
    return false;
  };

  const handleMouseEnter = (e: React.MouseEvent) => {
    if (disabled) return;

    // Clear any pending hide
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
    }

    // Check if mouse is over actual content on enter
    if (isOverContent(e.clientX, e.clientY)) {
      startShowDelay();
    }
    // If not over content, we'll check again in handleMouseMove
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (disabled) return;

    // If we haven't started the delay yet and mouse is now over content, start it
    if (!hasStartedDelayRef.current && isOverContent(e.clientX, e.clientY)) {
      startShowDelay();
    }
  };

  const startShowDelay = () => {
    // Prevent starting multiple delays
    if (hasStartedDelayRef.current) return;

    hasStartedDelayRef.current = true;
    timeoutRef.current = setTimeout(() => {
      showTooltip();
    }, effectiveDelay);
  };

  const handleMouseLeave = () => {
    // Clear show timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Reset delay flag
    hasStartedDelayRef.current = false;

    // Don't hide immediately, give user time to move to tooltip
    hideTimeoutRef.current = setTimeout(() => {
      hideTooltip();
    }, 200); // 200ms delay to allow moving to tooltip
  };

  // Keep tooltip visible when hovering over it
  const handleTooltipMouseEnter = () => {
    // Cancel the hide timeout
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
    }
  };

  const handleTooltipMouseLeave = () => {
    hideTooltip();
  };

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
    };
  }, []);

  const displayScore = paper.filter_score !== null
    ? (paper.filter_score / 10).toFixed(1)
    : null;

  const hasDeepAnalysis = paper.is_deep_analyzed;
  const hasQuickAnalysis = !hasDeepAnalysis
    && paper.filter_score !== null
    && paper.filter_reason !== null
    && !paper.filter_reason.includes('No AI analysis');

  return (
    <div
      ref={containerRef}
      onMouseEnter={handleMouseEnter}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative inline-block w-full"
    >
      {children}

      {isVisible &&
        createPortal(
          <div
            ref={tooltipRef}
            onMouseEnter={handleTooltipMouseEnter}
            onMouseLeave={handleTooltipMouseLeave}
            className={`fixed z-[9999] w-80 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 animate-tooltip-pop ${position.placement === 'top' ? 'mb-2' : 'mt-2'}`}
            style={{
              top: `${position.top}px`,
              left: `${position.left}px`,
            }}
          >
            {/* Content wrapper - doesn't capture pointer events */}
            <div style={{ pointerEvents: 'none' }}>
              {/* Arrow */}
              <div
                className={`absolute left-4 w-0 h-0 border-l-8 border-l-transparent border-r-8 border-r-transparent ${
                  position.placement === 'top'
                    ? 'bottom-0 border-b-8 border-b-white dark:border-b-gray-800 translate-y-full'
                    : 'top-0 border-t-8 border-t-white dark:border-t-gray-800 -translate-y-full'
                }`}
              />

              {/* Header */}
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white line-clamp-2 mb-2">
                {paper.title}
              </h4>
              <div className="flex items-center gap-2">
                {/* Relevance Score */}
                {displayScore !== null && (
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${getScoreColor(
                      paper.filter_score
                    )}`}
                  >
                    {displayScore}/10
                  </span>
                )}
                {/* Analysis Badge */}
                {hasDeepAnalysis && (
                  <span className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400">
                    <Sparkles className="w-3 h-3" />
                    Deep
                  </span>
                )}
                {hasQuickAnalysis && (
                  <span className="flex items-center gap-1 text-xs text-purple-600 dark:text-purple-400">
                    <Star className="w-3 h-3" />
                    Quick
                  </span>
                )}
              </div>
            </div>

            {/* Content */}
            <div className="p-4 space-y-3 max-h-64 overflow-y-auto">
              {/* Abstract Preview */}
              {paper.summary && (
                <div>
                  <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Abstract
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-3">
                    {paper.summary}
                  </p>
                </div>
              )}

              {/* AI Summary Preview */}
              {paper.ai_summary && (
                <div>
                  <p className="text-xs font-medium text-blue-700 dark:text-blue-300 mb-1">
                    AI Summary
                  </p>
                  <p className="text-xs text-blue-600 dark:text-blue-400 line-clamp-2">
                    {paper.ai_summary}
                  </p>
                </div>
              )}

              {/* Key Insights */}
              {paper.key_insights && paper.key_insights.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Key Insights
                  </p>
                  <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                    {paper.key_insights.slice(0, 2).map((insight, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="text-blue-600 dark:text-blue-400 mt-0.5">•</span>
                        <span className="line-clamp-1">{insight}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Engineering Notes */}
              {paper.engineering_notes && (
                <div>
                  <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Engineering Notes
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
                    {paper.engineering_notes}
                  </p>
                </div>
              )}
            </div>
            </div>

            {/* Footer - outside content wrapper so it can receive pointer events */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/papers/${paper.id}`);
              }}
              className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-700 rounded-b-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer group"
              style={{ pointerEvents: 'auto' }}
            >
              <div className="flex items-center justify-center gap-2">
                <ExternalLink className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  Click to view full details
                </p>
              </div>
            </button>
          </div>,
          document.body
        )
      }
    </div>
  );
}
