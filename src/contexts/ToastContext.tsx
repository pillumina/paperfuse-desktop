import { createContext, useContext } from 'react';
import { toast } from 'sonner';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastContextValue {
  show: (message: string, type?: ToastType) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  warning: (message: string) => void;
  info: (message: string) => void;
  promise: <T,>(
    promise: Promise<T>,
    messages: {
      loading: string;
      success: string;
      error: string;
    }
  ) => ReturnType<typeof toast.promise<T>>;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

/**
 * Toast Provider context
 * Wraps sonner's toast functionality with a simpler API
 */
export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    // If no provider, return direct access to sonner
    return {
      show: (message: string, type: ToastType = 'info') => {
        switch (type) {
          case 'success':
            toast.success(message);
            break;
          case 'error':
            toast.error(message);
            break;
          case 'warning':
            toast.warning(message);
            break;
          default:
            toast(message);
        }
      },
      success: (message: string) => toast.success(message),
      error: (message: string) => toast.error(message),
      warning: (message: string) => toast.warning(message),
      info: (message: string) => toast(message),
      promise: <T,>(
        promise: Promise<T>,
        messages: { loading: string; success: string; error: string }
      ) => toast.promise(promise, messages) as ReturnType<typeof toast.promise<T>>,
    };
  }
  return context;
}

/**
 * Convenience exports for direct sonner usage
 */
export { toast };
