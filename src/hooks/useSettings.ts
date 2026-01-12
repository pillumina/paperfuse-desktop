import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { invoke } from '@tauri-apps/api/core';
import type { Settings } from '../lib/types';

export interface CacheStats {
  total_entries: number;
  unique_papers: number;
  unique_configs: number;
  oldest_entry: string | null;
  newest_entry: string | null;
}

/**
 * Get all settings
 * Refetches on mount and window focus to ensure data is fresh
 */
export function useSettings() {
  return useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const result = await invoke<Settings>('get_settings');
      console.log('[useSettings] Fetched settings from backend:', {
        provider: result.llmProvider,
        hasGlmKey: !!result.glmApiKey,
        hasClaudeKey: !!result.claudeApiKey,
        glmKeyLength: result.glmApiKey?.length || 0,
        claudeKeyLength: result.claudeApiKey?.length || 0,
      });
      return result;
    },
    staleTime: 1000 * 30, // 30 seconds - shorter to get updates faster
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });
}

/**
 * Save settings mutation
 * Immediately updates the cache after successful save
 */
export function useSaveSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (settings: Settings) => {
      console.log('[useSaveSettings] Saving settings:', {
        provider: settings.llmProvider,
        hasGlmKey: !!settings.glmApiKey,
        hasClaudeKey: !!settings.claudeApiKey,
      });
      try {
        const result = await invoke('save_settings', { settings });
        console.log('[useSaveSettings] Settings saved successfully');
        return result;
      } catch (error) {
        console.error('[useSaveSettings] Failed to save settings:', error);
        throw error;
      }
    },
    onSuccess: async (_, variables) => {
      console.log('[useSaveSettings] Mutation succeeded, updating cache');
      // The backend returns (), so we need to refetch to get the actual saved settings
      // First, update the cache with what we tried to save (optimistic update)
      queryClient.setQueryData(['settings'], variables);
      // Then invalidate to trigger a refetch from backend
      await queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
    onError: (error) => {
      console.error('[useSaveSettings] Mutation failed:', error);
    },
  });
}

/**
 * Get cache statistics
 */
export function useCacheStats() {
  return useQuery({
    queryKey: ['cache_stats'],
    queryFn: async () => {
      const result = await invoke<CacheStats>('get_cache_stats');
      console.log('[useCacheStats] Fetched cache stats:', result);
      return result;
    },
    staleTime: 1000 * 10, // 10 seconds
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });
}

/**
 * Clear cache mutation
 */
export function useClearCache() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      console.log('[useClearCache] Clearing cache...');
      try {
        const result = await invoke<number>('clear_cache');
        console.log('[useClearCache] Cache cleared successfully, entries affected:', result);
        return result;
      } catch (error) {
        console.error('[useClearCache] Failed to clear cache:', error);
        throw error;
      }
    },
    onSuccess: async () => {
      console.log('[useClearCache] Mutation succeeded, invalidating cache stats query');
      // Invalidate cache stats query to trigger refetch
      await queryClient.invalidateQueries({ queryKey: ['cache_stats'] });
    },
    onError: (error) => {
      console.error('[useClearCache] Mutation failed:', error);
    },
  });
}
