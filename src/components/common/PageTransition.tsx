import { useRef, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import '../styles/transitions.css';

interface PageTransitionProps {
  children: React.ReactNode;
}

// Define route order for slide direction
const ROUTE_ORDER = ['/', '/papers', '/spam', '/collections', '/settings'];

export function PageTransition({ children }: PageTransitionProps) {
  const location = useLocation();
  const prevLocationRef = useRef(location);
  const [transitionClass, setTransitionClass] = useState('');
  const [displayChildren, setDisplayChildren] = useState(children);

  useEffect(() => {
    if (location !== prevLocationRef.current) {
      const prevIndex = ROUTE_ORDER.indexOf(prevLocationRef.current.pathname);
      const currIndex = ROUTE_ORDER.indexOf(location.pathname);

      // Determine direction based on route order
      const direction = currIndex > prevIndex ? 'right' : 'left';

      // Add exit animation to old content
      setTransitionClass(`page-exit-to-${direction}`);

      // After exit animation, switch content and add enter animation
      const timer = setTimeout(() => {
        setDisplayChildren(children);
        setTransitionClass(`page-enter-from-${direction}`);

        // Clean up animation class after it completes
        const cleanupTimer = setTimeout(() => {
          setTransitionClass('');
        }, 300);

        return () => clearTimeout(cleanupTimer);
      }, 250);

      prevLocationRef.current = location;

      return () => clearTimeout(timer);
    } else {
      // Update children without transition if same route
      setDisplayChildren(children);
    }
  }, [location, children]);

  return (
    <div className={`page-wrapper ${transitionClass}`}>
      {displayChildren}
    </div>
  );
}
