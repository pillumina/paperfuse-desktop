import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { FileText, Settings as SettingsIcon, Download, BookOpen, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import FetchDialog from '../components/fetch/FetchDialog';
import { useFetchProgress } from '../contexts/FetchProgressContext';
import { useCollections } from '../hooks/useCollections';
import { useSettings } from '../hooks/useSettings';
import { usePaperCount } from '../hooks/usePapers';
import { useLanguage } from '../contexts/LanguageContext';
import type { Settings } from '../lib/types';
import '../styles/animations.css';

export default function HomePage() {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [isFetchDialogOpen, setIsFetchDialogOpen] = useState(false);
  const { data: settings } = useSettings();
  const { data: paperCount = 0 } = usePaperCount();
  const { isFetching, isCompleting, fetchStatus } = useFetchProgress();
  const { data: collections } = useCollections();

  // Check if API key is configured
  const hasApiKey = Boolean(
    settings && (
      (settings.llmProvider === 'glm' && settings.glmApiKey)
      || (settings.llmProvider === 'claude' && settings.claudeApiKey)
    )
  );

  // Check for openFetchDialog URL parameter
  useEffect(() => {
    if (searchParams.get('openFetchDialog') === 'true') {
      setIsFetchDialogOpen(true);
      // Clear the parameter
      setSearchParams({});
    }
  }, [searchParams, setSearchParams]);

  const handleFetchComplete = () => {
    // Invalidate paper count query to refresh it
    queryClient.invalidateQueries({ queryKey: ['paperCount'] });
  };

  return (
    <div className="p-6 md:p-8">
      {/* Header */}
      <div className="mb-8 md:mb-10">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-3">
          {t('home.welcome.title')}
        </h1>
        <p className="text-base text-gray-600 dark:text-gray-400 max-w-2xl">
          {t('home.welcome.description')}
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <StatCard
          title={t('home.stats.totalPapers')}
          value={paperCount.toString()}
          icon={FileText}
          color="blue"
        />
        <FetchStatusCard
          isFetching={isFetching && !isCompleting}
          fetchStatus={fetchStatus}
          onOpenDialog={() => setIsFetchDialogOpen(true)}
        />
        <APIKeyStatusCard
          hasApiKey={hasApiKey}
          provider={settings?.llmProvider}
        />
        <StatCard
          title={t('home.stats.collections')}
          value={collections?.length.toString() || '0'}
          icon={SettingsIcon}
          color="purple"
        />
      </div>

      {/* Getting Started */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">
          {t('home.gettingStarted.title')}
        </h2>

        <div className="space-y-4">
          <Step
            number={1}
            title={t('home.gettingStarted.steps.1.title')}
            description={t('home.gettingStarted.steps.1.description')}
            note={t('home.gettingStarted.steps.1.note')}
            action={
              <Link
                to="/settings?tab=api-keys"
                className="text-blue-600 dark:text-blue-400 hover:underline"
              >
                {t('home.gettingStarted.steps.1.action')}
              </Link>
            }
          />

          <Step
            number={2}
            title={t('home.gettingStarted.steps.2.title')}
            description={t('home.gettingStarted.steps.2.description')}
            action={
              <Link
                to="/settings?tab=topics"
                className="text-blue-600 dark:text-blue-400 hover:underline"
              >
                {t('home.gettingStarted.steps.2.action')}
              </Link>
            }
          />

          <Step
            number={3}
            title={t('home.gettingStarted.steps.3.title')}
            description={t('home.gettingStarted.steps.3.description')}
            action={
              <Link
                to="/settings?tab=arxiv-categories"
                className="text-blue-600 dark:text-blue-400 hover:underline"
              >
                {t('home.gettingStarted.steps.3.action')}
              </Link>
            }
          />

          <Step
            number={4}
            title={t('home.gettingStarted.steps.4.title')}
            description={
              isFetching && fetchStatus
                ? `${fetchStatus.current_step} (${Math.round(fetchStatus.progress * 100)}%)`
                : t('home.gettingStarted.steps.4.description')
            }
            action={
              isFetching && !isCompleting ? (
                <button
                  onClick={() => setIsFetchDialogOpen(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 btn-interactive"
                >
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {t('home.gettingStarted.steps.4.viewProgress')}
                </button>
              ) : (
                <button
                  onClick={() => setIsFetchDialogOpen(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 btn-interactive"
                >
                  <Download className="w-4 h-4" />
                  {t('home.gettingStarted.steps.4.action')}
                </button>
              )
            }
          />

          {paperCount > 0 && (
            <Step
              number={5}
              title={t('home.gettingStarted.steps.5.title')}
              description={t('home.gettingStarted.steps.5.description', { count: paperCount })}
              action={
                <Link
                  to="/papers"
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 btn-interactive"
                >
                  <BookOpen className="w-4 h-4" />
                  {t('home.gettingStarted.steps.5.action')}
                </Link>
              }
            />
          )}
        </div>
      </div>

      {/* Fetch Dialog */}
      <FetchDialog
        isOpen={isFetchDialogOpen}
        onClose={() => {
          setIsFetchDialogOpen(false);
          handleFetchComplete();
        }}
      />
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  color: 'blue' | 'green' | 'purple';
}

function StatCard({ title, value, icon: Icon, color }: StatCardProps) {
  const colorClasses = {
    blue: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
    green: 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400',
    purple: 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400',
  };

  const gradientClasses = {
    blue: 'from-blue-500/10 to-transparent',
    green: 'from-green-500/10 to-transparent',
    purple: 'from-purple-500/10 to-transparent',
  };

  return (
    <div className="relative overflow-hidden bg-white dark:bg-gray-800 rounded-xl shadow-card border border-gray-200 dark:border-gray-700 p-5 transition-all duration-200 hover:shadow-card-hover">
      {/* Gradient decoration */}
      <div className={`absolute -right-4 -top-4 w-20 h-20 bg-gradient-to-br ${gradientClasses[color]} rounded-full blur-2xl`}></div>

      <div className="relative">
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              {title}
            </p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
              {value}
            </p>
          </div>
          <div className={`p-2.5 rounded-xl ${colorClasses[color]}`}>
            <Icon className="w-5 h-5" />
          </div>
        </div>
      </div>
    </div>
  );
}

interface StepProps {
  number: number;
  title: string;
  description: string;
  note?: string;
  action: React.ReactNode;
}

function Step({ number, title, description, note, action }: StepProps) {
  return (
    <div className="flex gap-4">
      <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-xl flex items-center justify-center font-semibold shadow-md">
        {number}
      </div>
      <div className="flex-1">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">
          {title}
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-2">{description}</p>
        {note && (
          <div className="mb-2 px-3 py-1.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <p className="text-xs text-amber-700 dark:text-amber-300 flex items-start gap-1.5">
              <span className="font-medium">💡</span>
              <span>{note}</span>
            </p>
          </div>
        )}
        {action}
      </div>
    </div>
  );
}

interface APIKeyStatusCardProps {
  hasApiKey: boolean;
  provider: 'glm' | 'claude' | null | undefined;
}

function APIKeyStatusCard({ hasApiKey, provider }: APIKeyStatusCardProps) {
  const { t } = useLanguage();
  const colorClasses = hasApiKey
    ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800'
    : 'bg-gray-50 dark:bg-gray-900/30 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700';

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border p-6 ${colorClasses}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium">{t('home.apiKeyStatus.title')}</h3>
        <div className={`p-2 rounded-lg ${hasApiKey ? 'bg-green-100 dark:bg-green-900/30' : 'bg-gray-100 dark:bg-gray-800'}`}>
          {hasApiKey ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
        </div>
      </div>
      <p className="text-2xl font-bold mb-1">
        {hasApiKey ? t('home.apiKeyStatus.active') : t('home.apiKeyStatus.notSet')}
      </p>
      <p className="text-xs opacity-75">
        {hasApiKey
          ? t('home.apiKeyStatus.configured', { provider: provider?.toUpperCase() || '' })
          : t('home.apiKeyStatus.configurePrompt')}
      </p>
    </div>
  );
}

interface FetchStatusCardProps {
  isFetching: boolean;
  fetchStatus: {
    progress: number;
    current_step: string;
    papers_saved: number;
    papers_found: number;
  } | null;
  onOpenDialog: () => void;
}

function FetchStatusCard({ isFetching, fetchStatus, onOpenDialog }: FetchStatusCardProps) {
  const { t } = useLanguage();
  const colorClasses = isFetching
    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800'
    : 'bg-gray-50 dark:bg-gray-900/30 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700';

  if (isFetching && fetchStatus) {
    return (
      <button
        onClick={onOpenDialog}
        className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border p-6 ${colorClasses} hover:opacity-80 transition-opacity text-left w-full`}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium">{t('home.fetching.status')}</h3>
          <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        </div>
        <div className="space-y-1">
          <p className="text-xl font-bold">
            {Math.round(fetchStatus.progress * 100)}%
          </p>
          <p className="text-xs opacity-75 truncate">
            {fetchStatus.current_step}
          </p>
          <p className="text-xs opacity-60 mt-2">
            {t('home.fetching.papersSaved', {
              saved: fetchStatus.papers_saved,
              found: fetchStatus.papers_found
            })}
          </p>
        </div>
      </button>
    );
  }

  return (
    <button
      onClick={onOpenDialog}
      className={`group bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md border-2 border-blue-500 dark:border-blue-400 p-6 text-left w-full transition-all duration-200 hover:border-blue-600 dark:hover:border-blue-300 btn-interactive`}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-blue-600 dark:text-blue-400">Fetch Papers</h3>
        <div className="p-2.5 rounded-lg bg-blue-50 dark:bg-blue-900/30 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/50 transition-colors">
          <Download className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        </div>
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
          {t('home.fetching.ready')}
        </p>
        <p className="text-xs text-gray-600 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
          {t('home.fetching.startFetch')}
        </p>
      </div>
    </button>
  );
}
