import { X, Keyboard } from 'lucide-react';
import { shortcuts } from '../../contexts/KeyboardContext';

interface KeyboardHelpDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * KeyboardHelpDialog displays all available keyboard shortcuts
 * in a modal dialog.
 */
export function KeyboardHelpDialog({ isOpen, onClose }: KeyboardHelpDialogProps) {
  if (!isOpen) return null;

  // Group shortcuts by category
  const navigationShortcuts = shortcuts.filter(s =>
    s.key.includes('cmd+1') || s.key.includes('cmd+2') ||
    s.key.includes('cmd+3') || s.key.includes('cmd+4') ||
    s.key.includes('cmd+w')
  );
  const actionShortcuts = shortcuts.filter(s =>
    s.key === 'cmd+n' || s.key === 'cmd+,'
  );
  const systemShortcuts = shortcuts.filter(s =>
    s.key === 'cmd+k' || s.key === 'escape'
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <Keyboard className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Keyboard Shortcuts
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Navigation */}
          <div>
            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
              Navigation
            </h3>
            <div className="space-y-2">
              {navigationShortcuts.map((shortcut) => (
                <div key={shortcut.key} className="flex items-center justify-between">
                  <span className="text-gray-700 dark:text-gray-300">{shortcut.description}</span>
                  <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm font-mono rounded border border-gray-300 dark:border-gray-600">
                    {shortcut.key.replace('cmd', '⌘')}
                  </kbd>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div>
            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
              Actions
            </h3>
            <div className="space-y-2">
              {actionShortcuts.map((shortcut) => (
                <div key={shortcut.key} className="flex items-center justify-between">
                  <span className="text-gray-700 dark:text-gray-300">{shortcut.description}</span>
                  <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm font-mono rounded border border-gray-300 dark:border-gray-600">
                    {shortcut.key.replace('cmd', '⌘')}
                  </kbd>
                </div>
              ))}
            </div>
          </div>

          {/* System */}
          <div>
            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
              System
            </h3>
            <div className="space-y-2">
              {systemShortcuts.map((shortcut) => (
                <div key={shortcut.key} className="flex items-center justify-between">
                  <span className="text-gray-700 dark:text-gray-300">{shortcut.description}</span>
                  <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm font-mono rounded border border-gray-300 dark:border-gray-600">
                    {shortcut.key.replace('cmd', '⌘').replace('escape', 'Esc')}
                  </kbd>
                </div>
              ))}
            </div>
          </div>

          {/* Note */}
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
            Press <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-900 text-gray-700 dark:text-gray-300 text-xs font-mono rounded border border-gray-300 dark:border-gray-600 mx-1">Esc</kbd>
            or click outside to close
          </p>
        </div>
      </div>
    </div>
  );
}
