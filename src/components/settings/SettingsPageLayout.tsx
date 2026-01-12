import { ReactNode } from 'react';
import { Key, Tags, Layers, Clock, HardDrive, Sparkles, RotateCcw, Palette, History } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useLanguage } from '../../contexts/LanguageContext';

export interface SettingsPageLayoutProps {
  activeTab: string;
  onTabChange: (tab: 'appearance' | 'api-keys' | 'topics' | 'arxiv-categories' | 'schedule' | 'storage' | 'analysis' | 'retry' | 'fetch-history') => void;
  children: ReactNode;
}

export function SettingsPageLayout({ activeTab, onTabChange, children }: SettingsPageLayoutProps) {
  const { t } = useLanguage();

  const tabs = [
    { id: 'appearance', label: t('settings.tabs.appearance'), icon: Palette },
    { id: 'api-keys', label: t('settings.tabs.apiKeys'), icon: Key },
    { id: 'topics', label: t('settings.tabs.topics'), icon: Tags },
    { id: 'arxiv-categories', label: t('settings.tabs.arxivCategories'), icon: Layers },
    { id: 'analysis', label: t('settings.tabs.deepAnalysis'), icon: Sparkles },
    { id: 'retry', label: t('settings.tabs.llmRetry'), icon: RotateCcw },
    { id: 'schedule', label: t('settings.tabs.schedule'), icon: Clock },
    { id: 'storage', label: t('settings.tabs.storage'), icon: HardDrive },
    { id: 'fetch-history', label: t('settings.tabs.fetchHistory'), icon: History },
  ] as const;

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <aside className="w-64 border-r border-gray-200 dark:border-gray-700 p-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-8">
          {t('settings.title')}
        </h1>

        <nav className="space-y-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-left',
                  isActive
                    ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                )}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Content */}
      <div className="flex-1 overflow-auto p-8">
        <div className="max-w-3xl">
          {children}
        </div>
      </div>
    </div>
  );
}
