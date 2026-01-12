import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

interface PageTransitionProps {
  children: React.ReactNode;
}

/**
 * PageTransition adds smooth fade-in and slide animations
 * when navigating between pages.
 * Respects prefers-reduced-motion for accessibility.
 */
export function PageTransition({ children }: PageTransitionProps) {
  const location = useLocation();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      return;
    }

    const element = containerRef.current;
    if (!element) return;

    // Reset animation
    element.style.opacity = '0';
    element.style.transform = 'translateX(20px)';

    // Trigger animation in next frame
    requestAnimationFrame(() => {
      element.style.transition = 'opacity 0.3s ease-out, transform 0.3s ease-out';
      element.style.opacity = '1';
      element.style.transform = 'translateX(0)';
    });

    return () => {
      // Cleanup
      element.style.transition = '';
    };
  }, [location.pathname]); // Re-run on route change

  return (
    <div
      ref={containerRef}
      className="page-transition"
      style={{
        opacity: 1,
        transform: 'translateX(0)',
      }}
    >
      {children}
    </div>
  );
}
