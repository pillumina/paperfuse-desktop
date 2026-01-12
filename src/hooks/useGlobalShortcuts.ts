import { useHotkeys } from 'react-hotkeys-hook';
import { useNavigate } from 'react-router-dom';

/**
 * Global keyboard shortcuts hook
 * Registers application-wide keyboard shortcuts for navigation and actions
 */
export function useGlobalShortcuts(options: {
  onOpenFetchDialog?: () => void;
  onOpenKeyboardHelp?: () => void;
  onCloseDialog?: () => void;
}) {
  const navigate = useNavigate();

  // Cmd+K: Open keyboard help
  useHotkeys('cmd+k', (e) => {
    e.preventDefault();
    options.onOpenKeyboardHelp?.();
  }, {
    enableOnFormTags: true,
    description: 'Open keyboard shortcuts help',
  });

  // Cmd+N: Start new fetch
  useHotkeys('cmd+n', (e) => {
    e.preventDefault();
    options.onOpenFetchDialog?.();
  }, {
    enableOnFormTags: true,
    description: 'Start new fetch',
  });

  // Cmd+,: Open settings
  useHotkeys('cmd+,', (e) => {
    e.preventDefault();
    navigate('/settings');
  }, {
    enableOnFormTags: true,
    description: 'Open settings',
  });

  // Cmd+1: Go to home
  useHotkeys('cmd+1', (e) => {
    e.preventDefault();
    navigate('/');
  }, {
    enableOnFormTags: false,
    description: 'Go to home',
  });

  // Cmd+2: Go to papers
  useHotkeys('cmd+2', (e) => {
    e.preventDefault();
    navigate('/papers');
  }, {
    enableOnFormTags: false,
    description: 'Go to papers',
  });

  // Cmd+3: Go to collections
  useHotkeys('cmd+3', (e) => {
    e.preventDefault();
    navigate('/collections');
  }, {
    enableOnFormTags: false,
    description: 'Go to collections',
  });

  // Cmd+4: Go to settings
  useHotkeys('cmd+4', (e) => {
    e.preventDefault();
    navigate('/settings');
  }, {
    enableOnFormTags: false,
    description: 'Go to settings',
  });

  // Escape: Close dialogs or go back
  useHotkeys('escape', (e) => {
    e.preventDefault();
    options.onCloseDialog?.();
  }, {
    enableOnFormTags: true,
    description: 'Close dialogs or go back',
  });

  // Cmd+W: Go back
  useHotkeys('cmd+w', (e) => {
    e.preventDefault();
    navigate(-1);
  }, {
    enableOnFormTags: true,
    description: 'Go back',
  });
}
