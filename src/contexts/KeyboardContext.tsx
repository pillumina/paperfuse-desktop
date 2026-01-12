import { createContext, useContext } from 'react';

interface KeyboardContextValue {
  shortcuts: KeyboardShortcut[];
}

interface KeyboardShortcut {
  key: string;
  description: string;
  action: () => void;
}

const shortcuts: KeyboardShortcut[] = [
  { key: 'cmd+k', description: 'Open keyboard shortcuts help', action: () => {} },
  { key: 'cmd+n', description: 'Start new fetch', action: () => {} },
  { key: 'cmd+,', description: 'Open settings', action: () => {} },
  { key: 'cmd+1', description: 'Go to home', action: () => {} },
  { key: 'cmd+2', description: 'Go to papers', action: () => {} },
  { key: 'cmd+3', description: 'Go to collections', action: () => {} },
  { key: 'cmd+4', description: 'Go to settings', action: () => {} },
  { key: 'escape', description: 'Close dialogs or go back', action: () => {} },
  { key: 'cmd+w', description: 'Go back', action: () => {} },
];

const KeyboardContext = createContext<KeyboardContextValue>({
  shortcuts,
});

/**
 * Keyboard shortcuts context
 * Provides a list of available keyboard shortcuts
 */
export function useKeyboardShortcuts(): KeyboardContextValue {
  return useContext(KeyboardContext);
}

export { shortcuts };
