import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { invoke } from '@tauri-apps/api/core';
import { useLanguage } from '../../contexts/LanguageContext';
import { AnalysisBlockConfig, UserBlockConfig, UserAnalysisConfig, BlockCategory, BlockRunMode } from '../../lib/types';

export function AnalysisSection() {
  const { t } = useLanguage();
  const queryClient = useQueryClient();

  // Fetch available blocks and user config
  const { data: availableBlocks, isLoading: loadingBlocks } = useQuery({
    queryKey: ['availableBlocks'],
    queryFn: () => invoke<AnalysisBlockConfig[]>('get_available_blocks'),
  });

  const { data: userConfig, isLoading: loadingConfig } = useQuery({
    queryKey: ['analysisConfig'],
    queryFn: () => invoke<UserAnalysisConfig>('get_analysis_config'),
  });

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: (config: UserAnalysisConfig) => invoke('save_analysis_config', { config }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['analysisConfig'] });
    },
    onError: (error) => {
      console.error('Failed to save analysis config:', error);
    },
  });

  // Group blocks by category
  const groupedBlocks = availableBlocks
    ? availableBlocks.reduce((acc: Record<BlockCategory, AnalysisBlockConfig[]>, block) => {
        if (!acc[block.category]) {
          acc[block.category] = [];
        }
        acc[block.category].push(block);
        return acc;
      }, {} as Record<BlockCategory, AnalysisBlockConfig[]>)
    : {} as Record<BlockCategory, AnalysisBlockConfig[]>;

  // Get user config for a specific block
  const getUserConfig = (blockId: string): UserBlockConfig => {
    const saved = userConfig?.blocks.find((b: UserBlockConfig) => b.blockId === blockId);
    if (saved) return saved;

    // Use default from block definition
    const block = availableBlocks?.find((b: AnalysisBlockConfig) => b.id === blockId);
    return {
      blockId,
      enabled: block?.defaultEnabled ?? false,
      mode: block?.defaultMode ?? 'standard',
    };
  };

  // Get available modes for a block (for mode selector)
  const getAvailableModes = (block: AnalysisBlockConfig): BlockRunMode[] => {
    // If block only supports full, only show full
    if (block.supportedModes.length === 1 && block.supportedModes[0] === 'full') {
      return ['full'];
    }
    // Otherwise show all three options
    return ['standard', 'full', 'both'];
  };

  // Update a single block config
  const updateBlockConfig = (blockId: string, updates: Partial<UserBlockConfig>) => {
    if (!userConfig) return;

    const newBlocks = userConfig.blocks.map((b: UserBlockConfig) =>
      b.blockId === blockId ? { ...b, ...updates } : b
    );

    saveMutation.mutate({ blocks: newBlocks });
  };

  if (loadingBlocks || loadingConfig) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!availableBlocks || !userConfig) {
    return <div className="text-gray-500">Failed to load analysis configuration</div>;
  }

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
          {t('settings.analysis.title')}
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          {t('settings.analysis.description')}
        </p>
      </div>

      {/* Basic Modules */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          {t('settings.analysis.categories.basic.title')}
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          {t('settings.analysis.categories.basic.description')}
        </p>
        <div className="space-y-3">
          {groupedBlocks.basic?.map((block: AnalysisBlockConfig) => (
            <BlockCard
              key={block.id}
              block={block}
              config={getUserConfig(block.id)}
              availableModes={getAvailableModes(block)}
              readonly
            />
          ))}
        </div>
      </div>

      {/* Core Analysis */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          {t('settings.analysis.categories.core.title')}
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          {t('settings.analysis.categories.core.description')}
        </p>
        <div className="space-y-3">
          {groupedBlocks.core?.map((block: AnalysisBlockConfig) => (
            <BlockCard
              key={block.id}
              block={block}
              config={getUserConfig(block.id)}
              availableModes={getAvailableModes(block)}
              onChange={(updates) => updateBlockConfig(block.id, updates)}
            />
          ))}
        </div>
      </div>

      {/* Engineering */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          {t('settings.analysis.categories.engineering.title')}
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          {t('settings.analysis.categories.engineering.description')}
        </p>
        <div className="space-y-3">
          {groupedBlocks.engineering?.map((block: AnalysisBlockConfig) => (
            <BlockCard
              key={block.id}
              block={block}
              config={getUserConfig(block.id)}
              availableModes={getAvailableModes(block)}
              onChange={(updates) => updateBlockConfig(block.id, updates)}
            />
          ))}
        </div>
      </div>

      {/* Technical Details */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          {t('settings.analysis.categories.technical.title')}
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          {t('settings.analysis.categories.technical.description')}
        </p>
        <div className="space-y-3">
          {groupedBlocks.technical?.map((block: AnalysisBlockConfig) => (
            <BlockCard
              key={block.id}
              block={block}
              config={getUserConfig(block.id)}
              availableModes={getAvailableModes(block)}
              onChange={(updates) => updateBlockConfig(block.id, updates)}
            />
          ))}
        </div>
      </div>

      {/* Info Box */}
      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
        <p className="text-sm text-blue-800 dark:text-blue-300">
          {t('settings.analysis.infoText')}
        </p>
      </div>
    </div>
  );
}

interface BlockCardProps {
  block: AnalysisBlockConfig;
  config: UserBlockConfig;
  availableModes: BlockRunMode[];
  readonly?: boolean;
  onChange?: (updates: Partial<UserBlockConfig>) => void;
}

function BlockCard({ block, config, availableModes, readonly = false, onChange }: BlockCardProps) {
  const { t } = useLanguage();

  // Get language from context
  const lang = t('settings.analysis.categories.basic.title') === 'Basic Modules' ? 'en' : 'zh';

  const name = (block.name as any)[lang] || block.name.en;
  const description = (block.description as any)[lang] || block.description.en;

  const hasMultipleModes = availableModes.length > 1;
  const isBasic = block.category === 'basic';

  return (
    <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-gray-900 dark:text-white">
            {name}
          </h4>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {description}
          </p>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3">
          {/* Enable Toggle - disabled for basic blocks (always enabled) */}
          <label className={`relative inline-flex items-center ${isBasic ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
            <input
              type="checkbox"
              checked={config.enabled}
              onChange={(e) => onChange?.({ enabled: e.target.checked })}
              disabled={readonly || isBasic}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
          </label>

          {/* Basic modules: Always show "both" badge */}
          {isBasic && (
            <span className="px-3 py-1.5 bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 rounded-lg text-sm font-medium">
              {t('settings.analysis.modes.both')}
            </span>
          )}

          {/* Other modules: Mode Selector when enabled */}
          {!isBasic && config.enabled && hasMultipleModes && (
            <div className="inline-flex rounded-lg bg-gray-100 dark:bg-gray-700 p-1 gap-1">
              {availableModes.map((mode) => {
                const isActive = config.mode === mode;
                return (
                  <button
                    key={mode}
                    onClick={() => onChange?.({ mode: mode as BlockRunMode })}
                    disabled={readonly}
                    className={`
                      px-3 py-1.5 rounded-md text-sm font-medium transition-all
                      ${isActive
                        ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                      }
                      ${readonly ? 'cursor-not-allowed opacity-50' : ''}
                    `}
                  >
                    {t(`settings.analysis.modes.${mode}`)}
                  </button>
                );
              })}
            </div>
          )}

          {/* Other modules: Single mode badge */}
          {!isBasic && config.enabled && !hasMultipleModes && (
            <span className="px-3 py-1.5 bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 rounded-lg text-sm font-medium">
              {t(`settings.analysis.modes.${availableModes[0]}`)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
