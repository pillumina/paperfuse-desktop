import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { invoke } from '@tauri-apps/api/core';
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
import type { PlatformInfo } from '../lib/types';

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

  const [platformInfo, setPlatformInfo] = useState<PlatformInfo | null>(null);

  // Load platform info on mount
  useEffect(() => {
    invoke<PlatformInfo>('get_platform_info')
      .then(setPlatformInfo)
      .catch(console.error);
  }, []);

  // Update active tab when URL changes
  useEffect(() => {
    if (tabParam && ['appearance', 'api-keys', 'topics', 'arxiv-categories', 'analysis', 'retry', 'schedule', 'storage', 'fetch-history'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  // If current tab is schedule but not supported, switch to another tab
  useEffect(() => {
    if (platformInfo && !platformInfo.supports_scheduler && activeTab === 'schedule') {
      setActiveTab('storage');
    }
  }, [platformInfo, activeTab]);

  const supportsScheduler = platformInfo?.supports_scheduler ?? true;

  return (
    <SettingsPageLayout
      activeTab={activeTab}
      onTabChange={setActiveTab}
      supportsScheduler={supportsScheduler}
    >
      {activeTab === 'appearance' && <AppearanceSection />}
      {activeTab === 'api-keys' && <ApiKeysSection />}
      {activeTab === 'topics' && <TopicsSection />}
      {activeTab === 'arxiv-categories' && <ArxivCategoriesSection />}
      {activeTab === 'analysis' && <AnalysisSection />}
      {activeTab === 'retry' && <RetrySettingsSection />}
      {activeTab === 'schedule' && supportsScheduler && <ScheduleSection />}
      {activeTab === 'storage' && <StorageSection />}
      {activeTab === 'fetch-history' && <FetchHistorySection />}
    </SettingsPageLayout>
  );
}
