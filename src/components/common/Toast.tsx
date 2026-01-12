import { useEffect, useState, useRef } from 'react';
import { CheckCircle, AlertCircle, X } from 'lucide-react';

export interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'info';
  duration?: number;
  onClose?: () => void;
}

export function Toast({ message, type = 'success', duration = 5000, onClose }: ToastProps) {
  const [isVisible, setIsVisible] = useState(true);
  const animationTimerRef = useRef<NodeJS.Timeout | undefined>(undefined);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      // Track the animation timer so we can clean it up
      animationTimerRef.current = setTimeout(() => {
        onClose?.();
      }, 300); // Wait for exit animation
    }, duration);

    return () => {
      clearTimeout(timer);
      // Also clear the animation timer if it exists
      if (animationTimerRef.current) {
        clearTimeout(animationTimerRef.current);
      }
    };
  }, [duration, onClose]);

  const handleClose = () => {
    setIsVisible(false);
    // Clear any existing animation timer
    if (animationTimerRef.current) {
      clearTimeout(animationTimerRef.current);
    }
    animationTimerRef.current = setTimeout(() => {
      onClose?.();
    }, 300);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationTimerRef.current) {
        clearTimeout(animationTimerRef.current);
      }
    };
  }, []);

  const styles = {
    success: 'bg-green-600 dark:bg-green-700',
    error: 'bg-red-600 dark:bg-red-700',
    info: 'bg-blue-600 dark:bg-blue-700',
  };

  const icons = {
    success: <CheckCircle className="w-5 h-5" />,
    error: <AlertCircle className="w-5 h-5" />,
    info: <AlertCircle className="w-5 h-5" />,
  };

  return (
    <div
      className={`fixed top-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-6 py-4 text-white rounded-xl shadow-2xl transition-all duration-300 max-w-md ${
        styles[type]
      } ${isVisible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 -translate-y-4 scale-95'}`}
    >
      <div className="flex-shrink-0">
        {icons[type]}
      </div>
      <span className="font-medium flex-1">{message}</span>
      <button
        onClick={handleClose}
        className="p-1.5 hover:bg-white/20 rounded-lg transition-colors focus:ring-2 focus:ring-white focus:ring-offset-2 flex-shrink-0"
        aria-label="Close notification"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
