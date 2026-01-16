import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { invoke } from '@tauri-apps/api/core';
import type { Paper, TagWithCount } from '../lib/types';

/**
 * Options for fetching papers
 */
export interface UsePapersOptions {
  limit?: number;
  offset?: number;
}

/**
 * Fetch paginated papers
 */
export function usePapers(options: UsePapersOptions = {}) {
  const { limit = 20, offset = 0 } = options;

  return useQuery({
    queryKey: ['papers', { limit, offset }],
    queryFn: () => invoke<Paper[]>('get_papers', { limit, offset }),
    staleTime: 1000 * 60 * 5, // 5 minutes - data doesn't change that often
    refetchOnWindowFocus: false, // Don't refetch on window focus to prevent jitter
    refetchOnMount: false, // Don't refetch on mount if data is fresh
  });
}

/**
 * Fetch all papers (for extracting tags and topics)
 * Uses a large limit to get all papers
 */
export function useAllPapers() {
  return useQuery({
    queryKey: ['papers', 'all'],
    queryFn: () => invoke<Paper[]>('get_papers', { limit: 10000, offset: 0 }),
    staleTime: 1000 * 30, // 30 seconds - shorter for more responsive updates
    refetchOnWindowFocus: true,
  });
}

/**
 * Extract all unique tags and topics from papers
 */
export function useAvailableTags() {
  const { data: papers } = useAllPapers();

  const availableTags = new Set<string>();

  papers?.forEach((paper) => {
    // Add paper tags
    paper.tags?.forEach((tag) => availableTags.add(tag));
  });

  return {
    availableTags: Array.from(availableTags).sort(),
    isLoading: !papers,
  };
}

/**
 * Fetch tags with frequency counts (sorted by popularity)
 */
export function useTagsWithCounts(limit: number = 20) {
  return useQuery({
    queryKey: ['tags', 'with-counts', limit],
    queryFn: () => invoke<TagWithCount[]>('get_tags_with_counts', { limit }),
    staleTime: 1000 * 60, // 1 minute - tags don't change that frequently
    refetchOnWindowFocus: true,
  });
}

/**
 * Fetch a single paper by ID
 */
export function usePaperById(id: string | undefined) {
  return useQuery({
    queryKey: ['paper', id],
    queryFn: () => invoke<Paper | null>('get_paper_by_id', { id: id! }),
    enabled: !!id,
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
}

/**
 * Search papers by query string
 */
export function useSearchPapers(query: string, limit: number = 20) {
  return useQuery({
    queryKey: ['papers', 'search', query, limit],
    queryFn: () => invoke<Paper[]>('search_papers', { query, limit }),
    enabled: query.length >= 2, // Only search when query has 2+ chars
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

/**
 * Fetch papers filtered by tag
 */
export function usePapersByTag(tag: string | null, limit: number = 20, offset: number = 0) {
  return useQuery({
    queryKey: ['papers', 'tag', tag, limit, offset],
    queryFn: () => invoke<Paper[]>('get_papers_by_tag', { tag: tag!, limit, offset }),
    enabled: !!tag,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Get total paper count
 */
export function usePaperCount() {
  return useQuery({
    queryKey: ['paperCount'],
    queryFn: () => invoke<number>('get_paper_count'),
    staleTime: 1000 * 60 * 5, // 5 minutes - count doesn't change that often
    refetchOnWindowFocus: false, // Don't refetch on window focus to prevent jitter
  });
}

/**
 * Delete a paper mutation
 */
export function useDeletePaper() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      console.log('[useDeletePaper] Calling delete_paper Tauri command with id:', id);
      try {
        const result = await invoke('delete_paper', { id });
        console.log('[useDeletePaper] delete_paper command succeeded:', result);
        return result;
      } catch (error) {
        console.error('[useDeletePaper] delete_paper command failed:', error);
        throw error;
      }
    },
    onSuccess: () => {
      console.log('[useDeletePaper] Mutation succeeded, invalidating queries');
      // Invalidate and refetch papers queries
      queryClient.invalidateQueries({ queryKey: ['papers'] });
      queryClient.invalidateQueries({ queryKey: ['paperCount'] });
    },
    onError: (error) => {
      console.error('[useDeletePaper] Mutation failed:', error);
    },
  });
}
