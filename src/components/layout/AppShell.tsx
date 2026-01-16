import { useState, ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useHotkeys } from 'react-hotkeys-hook';
import { cn } from '../../lib/utils';
import {
  Home,
  FileText,
  FolderOpen,
  AlertCircle,
  Settings,
  Keyboard,
  BookOpen,
} from 'lucide-react';
import { KeyboardHelpDialog } from '../common/KeyboardHelpDialog';
import { ThemeToggle } from '../common/ThemeToggle';
import { LanguageToggle } from '../common/LanguageToggle';
import { SlimProgressBar } from '../common/SlimProgressBar';
import { FloatingProgressCard } from '../common/FloatingProgressCard';
import { useLanguage } from '../../contexts/LanguageContext';
import '../../styles/transitions.css';

interface AppShellProps {
  children: ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [isHelpDialogOpen, setIsHelpDialogOpen] = useState(false);
  const { t, language, setLanguage } = useLanguage();

  // Keyboard shortcuts
  useHotkeys('cmd+k', (e) => {
    e.preventDefault();
    setIsHelpDialogOpen(true);
  }, [setIsHelpDialogOpen]);

  useHotkeys('cmd+n', (e) => {
    e.preventDefault();
    // Trigger fetch dialog - this would be handled by HomePage
    navigate('/');
  }, [navigate]);

  useHotkeys('cmd+,', (e) => {
    e.preventDefault();
    navigate('/settings');
  }, [navigate]);

  useHotkeys('cmd+1', (e) => {
    e.preventDefault();
    navigate('/');
  }, [navigate]);

  useHotkeys('cmd+2', (e) => {
    e.preventDefault();
    navigate('/papers');
  }, [navigate]);

  useHotkeys('cmd+3', (e) => {
    e.preventDefault();
    navigate('/collections');
  }, [navigate]);

  useHotkeys('cmd+4', (e) => {
    e.preventDefault();
    navigate('/settings');
  }, [navigate]);

  useHotkeys('ctrl+l, cmd+l', (e) => {
    e.preventDefault();
    // Cycle through languages: en -> zh -> system -> en
    if (language === 'en') {
      setLanguage('zh');
    } else if (language === 'zh') {
      setLanguage('system');
    } else {
      setLanguage('en');
    }
  }, [language, setLanguage]);

  useHotkeys('escape', () => {
    // Close help dialog if open
    if (isHelpDialogOpen) {
      setIsHelpDialogOpen(false);
      return;
    }
    // Don't navigate back if focus is on an input/textarea
    const activeElement = document.activeElement;
    if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA' || activeElement.getAttribute('contenteditable') === 'true')) {
      return;
    }
    // Otherwise, go back
    if (window.history.length > 1) {
      window.history.back();
    }
  }, [isHelpDialogOpen]);

  useHotkeys('cmd+w', (e) => {
    e.preventDefault();
    if (window.history.length > 1) {
      window.history.back();
    }
  }, []);

  const navItems = [
    { path: '/', label: t('common.nav.home'), icon: Home },
    { path: '/papers', label: t('common.nav.papers'), icon: FileText },
    { path: '/spam', label: t('common.nav.spam'), icon: AlertCircle },
    { path: '/collections', label: t('common.nav.collections'), icon: FolderOpen },
    { path: '/settings', label: t('common.nav.settings'), icon: Settings },
  ];

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {/* Skip Link for keyboard navigation */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all"
      >
        {t('common.skipToContent')}
      </a>

      {/* Slim Progress Bar - Top (2px, doesn't block buttons) */}
      <SlimProgressBar />

      {/* Floating Progress Card - Bottom Right (detailed info) */}
      <FloatingProgressCard />

      {/* Sidebar */}
      <aside className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              PaperFuse
            </h1>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;

            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  'nav-item relative flex items-center gap-3 px-4 py-2.5 rounded-xl cursor-pointer transition-all duration-200',
                  isActive
                    ? 'active bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 font-medium'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                )}
              >
                {/* Background slide indicator */}
                <span className={cn(
                  'nav-bg-indicator',
                  isActive ? 'w-full' : 'w-0'
                )} />
                <Icon className="w-5 h-5 relative z-10" />
                <span className="relative z-10">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 space-y-3">
          <ThemeToggle />
          <LanguageToggle />
          <button
            onClick={() => setIsHelpDialogOpen(true)}
            className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 cursor-pointer transition-colors duration-200"
          >
            <Keyboard className="w-3 h-3" />
            {t('common.keyboardShortcuts')}
          </button>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            v0.1.0
          </p>
        </div>
      </aside>

      {/* Main Content */}
      <main id="main-content" className="flex-1 overflow-auto">
        {children}
      </main>

      {/* Keyboard Help Dialog */}
      <KeyboardHelpDialog
        isOpen={isHelpDialogOpen}
        onClose={() => setIsHelpDialogOpen(false)}
      />
    </div>
  );
}
