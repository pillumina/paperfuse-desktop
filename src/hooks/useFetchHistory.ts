import { useQuery } from '@tanstack/react-query';
import { invoke } from '@tauri-apps/api/core';
import { FetchHistoryEntry } from '../lib/types';

interface UseFetchHistoryOptions {
  limit?: number;
  enabled?: boolean;
  refetchInterval?: number;
}

export function useFetchHistory(options: UseFetchHistoryOptions = {}) {
  const {
    limit = 50,
    enabled = true,
    refetchInterval,
  } = options;

  return useQuery<FetchHistoryEntry[]>({
    queryKey: ['fetch-history', limit],
    queryFn: () => invoke<FetchHistoryEntry[]>('get_fetch_history', { limit }),
    staleTime: 1000 * 60, // 1 minute
    enabled,
    refetchInterval,
  });
}
