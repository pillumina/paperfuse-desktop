import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SettingsPageLayout } from '../components/settings/SettingsPageLayout';
import { ApiKeysSection } from '../components/settings/ApiKeysSection';
import { TopicsSection } from '../components/settings/TopicsSection';
import { ScheduleSection } from '../components/settings/ScheduleSection';
import { StorageSection } from '../components/settings/StorageSection';
import { ArxivCategoriesSection } from '../components/settings/ArxivCategoriesSection';
import { AnalysisSection } from '../components/settings/AnalysisSection';
import { RetrySettingsSection } from '../components/settings/RetrySettingsSection';
import { AppearanceSection } from '../components/settings/AppearanceSection';
import { FetchHistorySection } from '../components/settings/FetchHistorySection';

type SettingsTab = 'appearance' | 'api-keys' | 'topics' | 'arxiv-categories' | 'analysis' | 'retry' | 'schedule' | 'storage' | 'fetch-history';

export default function SettingsPage() {
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get('tab') as SettingsTab | null;

  const [activeTab, setActiveTab] = useState<SettingsTab>(() => {
    // Use tab from URL if valid, otherwise default to 'appearance'
    if (tabParam && ['appearance', 'api-keys', 'topics', 'arxiv-categories', 'analysis', 'retry', 'schedule', 'storage', 'fetch-history'].includes(tabParam)) {
      return tabParam;
    }
    return 'appearance';
  });

  // Update active tab when URL changes
  useEffect(() => {
    if (tabParam && ['appearance', 'api-keys', 'topics', 'arxiv-categories', 'analysis', 'retry', 'schedule', 'storage', 'fetch-history'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  return (
    <SettingsPageLayout
      activeTab={activeTab}
      onTabChange={setActiveTab}
    >
      {activeTab === 'appearance' && <AppearanceSection />}
      {activeTab === 'api-keys' && <ApiKeysSection />}
      {activeTab === 'topics' && <TopicsSection />}
      {activeTab === 'arxiv-categories' && <ArxivCategoriesSection />}
      {activeTab === 'analysis' && <AnalysisSection />}
      {activeTab === 'retry' && <RetrySettingsSection />}
      {activeTab === 'schedule' && <ScheduleSection />}
      {activeTab === 'storage' && <StorageSection />}
      {activeTab === 'fetch-history' && <FetchHistorySection />}
    </SettingsPageLayout>
  );
}
