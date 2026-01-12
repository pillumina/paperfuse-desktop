import { useState, useRef, useEffect } from 'react';

interface TooltipProps {
  content: string;
  children: React.ReactElement;
  placement?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
}

export function Tooltip({ content, children, placement = 'top', delay = 500 }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  const handleMouseEnter = () => {
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
    }, delay);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = undefined;
    }
    setIsVisible(false);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  const arrowClasses = {
    top: 'top-full left-1/2 -translate-x-1/2 border-t-gray-900 dark:border-t-gray-100',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 border-b-gray-900 dark:border-b-gray-100',
    left: 'left-full top-1/2 -translate-y-1/2 border-l-gray-900 dark:border-l-gray-100',
    right: 'right-full top-1/2 -translate-y-1/2 border-r-gray-900 dark:border-r-gray-100',
  };

  return (
    <div
      className="relative inline-block"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}

      {isVisible && (
        <div
          className={`absolute z-50 px-2 py-1 text-xs text-white dark:text-gray-900 bg-gray-900 dark:bg-gray-100 rounded whitespace-nowrap animate-fade-in ${positionClasses[placement]}`}
        >
          {content}
          {/* Arrow */}
          <div
            className={`absolute w-0 h-0 border-4 ${arrowClasses[placement]}`}
          />
        </div>
      )}
    </div>
  );
}
