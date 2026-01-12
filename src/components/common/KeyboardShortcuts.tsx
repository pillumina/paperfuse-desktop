import { X, Search, ArrowUpDown, CheckSquare, XSquare } from 'lucide-react';

interface KeyboardShortcutsProps {
  isOpen: boolean;
  onClose: () => void;
}

export function KeyboardShortcuts({ isOpen, onClose }: KeyboardShortcutsProps) {
  if (!isOpen) return null;

  const shortcuts = [
    {
      category: 'Navigation',
      items: [
        { keys: ['?'], description: 'Show keyboard shortcuts', icon: null },
      ],
    },
    {
      category: 'Search & Filter',
      items: [
        { keys: ['/'], description: 'Focus search bar', icon: Search },
        { keys: ['Esc'], description: 'Clear selection / filters', icon: XSquare },
      ],
    },
    {
      category: 'Selection',
      items: [
        { keys: ['Shift', '+', 'Click'], description: 'Select range of papers', icon: CheckSquare },
        { keys: ['Esc'], description: 'Exit selection mode', icon: XSquare },
      ],
    },
    {
      category: 'Sorting',
      items: [
        { keys: ['↑', '↓'], description: 'Change sort order', icon: ArrowUpDown },
      ],
    },
  ];

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-50 animate-fade-in"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-auto pointer-events-auto animate-fade-in"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">?</span>
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Keyboard Shortcuts
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Power user tips for faster navigation
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="px-6 py-4 space-y-6">
            {shortcuts.map((section) => (
              <div key={section.category}>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wide mb-3">
                  {section.category}
                </h3>
                <div className="space-y-2">
                  {section.items.map((item) => (
                    <div
                      key={item.description}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        {item.icon && (
                          <item.icon className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                        )}
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          {item.description}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {item.keys.map((key, index) => (
                          <span
                            key={index}
                            className={`px-2.5 py-1.5 text-xs font-semibold font-mono rounded-md ${
                              key === '+' || key === '↑' || key === '↓'
                                ? 'text-gray-500 dark:text-gray-400'
                                : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 shadow-sm'
                            }`}
                          >
                            {key}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-700 px-6 py-4">
            <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
              Press <kbd className="px-1.5 py-0.5 bg-white dark:bg-gray-800 rounded border border-gray-300 dark:border-gray-600 font-mono text-xs">Esc</kbd> or click outside to close
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
