import { useState, useEffect, useRef } from 'react';

/**
 * Hook to animate counting from one number to another
 * @param end - The target number to count to
 * @param duration - The duration of the animation in ms (default: 1000ms)
 * @param start - The starting number (default: 0)
 */
export function useCountAnimation(end: number | undefined, duration = 1000, start = 0) {
  const [count, setCount] = useState(start);
  const [isAnimating, setIsAnimating] = useState(false);
  const previousEndRef = useRef(start);
  const requestRef = useRef<number | undefined>(undefined);
  const startTimeRef = useRef<number | undefined>(undefined);
  const isAnimatingRef = useRef(false); // Track if animation is in progress

  useEffect(() => {
    // If end is undefined, don't animate
    if (end === undefined) {
      setCount(start);
      previousEndRef.current = start;
      isAnimatingRef.current = false;
      return;
    }

    // If end hasn't changed, don't animate
    if (end === previousEndRef.current) {
      return;
    }

    // If already animating, skip (prevent multiple simultaneous animations)
    if (isAnimatingRef.current) {
      return;
    }

    const previousEnd = previousEndRef.current;

    // Set start time
    startTimeRef.current = performance.now();
    setIsAnimating(true);
    isAnimatingRef.current = true;

    const animate = (currentTime: number) => {
      const startTime = startTimeRef.current || currentTime;
      const elapsed = currentTime - startTime;

      // Calculate progress (0 to 1)
      const progress = Math.min(elapsed / duration, 1);

      // Easing function (ease-out cubic)
      const easeProgress = 1 - Math.pow(1 - progress, 3);

      // Calculate current value
      const currentValue = previousEnd + (end - previousEnd) * easeProgress;

      setCount(currentValue);

      // Continue animation if not complete
      if (progress < 1) {
        requestRef.current = requestAnimationFrame(animate);
      } else {
        setIsAnimating(false);
        isAnimatingRef.current = false;
        // Update previousEndRef only after animation completes
        previousEndRef.current = end;
      }
    };

    requestRef.current = requestAnimationFrame(animate);

    // Cleanup
    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [end, duration, start]);

  return { count: Math.round(count), isAnimating };
}
