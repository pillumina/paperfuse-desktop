import { useQuery, useMutation, useQueryClient, UseMutationResult } from '@tanstack/react-query';
import { invoke } from '@tauri-apps/api/core';
import type { Collection, CreateCollectionInput, UpdateCollectionInput, Paper } from '../lib/types';

// Query keys
export const collectionKeys = {
  all: ['collections'] as const,
  detail: (id: string) => ['collections', id] as const,
  papers: (id: string) => ['collections', id, 'papers'] as const,
  forPaper: (paperId: string) => ['collections', 'paper', paperId] as const,
};

/**
 * Get all collections
 */
export function useCollections() {
  return useQuery({
    queryKey: collectionKeys.all,
    queryFn: () => invoke<Collection[]>('get_collections'),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Get collection by ID
 */
export function useCollection(id: string) {
  return useQuery({
    queryKey: collectionKeys.detail(id),
    queryFn: () => invoke<Collection>('get_collection', { id }),
    enabled: !!id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Get papers in a collection
 */
export function useCollectionPapers(collectionId: string, limit: number = 100) {
  return useQuery({
    queryKey: collectionKeys.papers(collectionId),
    queryFn: () => invoke<Paper[]>('get_collection_papers', { collectionId, limit }),
    enabled: !!collectionId,
    staleTime: 1000 * 30, // 30 seconds
  });
}

/**
 * Get collections for a paper
 */
export function usePaperCollections(paperId: string) {
  return useQuery({
    queryKey: collectionKeys.forPaper(paperId),
    queryFn: () => invoke<Collection[]>('get_paper_collections', { paperId }),
    enabled: !!paperId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Create collection mutation
 */
export function useCreateCollection(): UseMutationResult<
  Collection,
  Error,
  CreateCollectionInput
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateCollectionInput) =>
      invoke<Collection>('create_collection', input as unknown as Record<string, unknown>),
    onSuccess: () => {
      // Invalidate and refetch collections
      queryClient.invalidateQueries({ queryKey: collectionKeys.all });
    },
  });
}

/**
 * Update collection mutation
 */
export function useUpdateCollection(): UseMutationResult<
  Collection,
  Error,
  { id: string } & UpdateCollectionInput
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...updates }: { id: string } & UpdateCollectionInput) =>
      invoke<Collection>('update_collection', { id, ...updates }),
    onSuccess: (_, variables) => {
      // Invalidate and refetch collections and the specific collection
      queryClient.invalidateQueries({ queryKey: collectionKeys.all });
      queryClient.invalidateQueries({ queryKey: collectionKeys.detail(variables.id) });
    },
  });
}

/**
 * Delete collection mutation
 */
export function useDeleteCollection(): UseMutationResult<
  void,
  Error,
  string
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => invoke('delete_collection', { id }),
    onSuccess: () => {
      // Invalidate and refetch collections
      queryClient.invalidateQueries({ queryKey: collectionKeys.all });
    },
  });
}

/**
 * Add paper to collection mutation
 */
export function useAddPaperToCollection(): UseMutationResult<
  void,
  Error,
  { collectionId: string; paperId: string }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ collectionId, paperId }: { collectionId: string; paperId: string }) =>
      invoke('add_paper_to_collection', { collectionId, paperId }),
    onSuccess: (_, variables) => {
      // Invalidate collections, collection papers, and paper collections
      queryClient.invalidateQueries({ queryKey: collectionKeys.all });
      queryClient.invalidateQueries({ queryKey: collectionKeys.papers(variables.collectionId) });
      queryClient.invalidateQueries({ queryKey: collectionKeys.forPaper(variables.paperId) });
    },
  });
}

/**
 * Remove paper from collection mutation
 */
export function useRemovePaperFromCollection(): UseMutationResult<
  void,
  Error,
  { collectionId: string; paperId: string }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ collectionId, paperId }: { collectionId: string; paperId: string }) =>
      invoke('remove_paper_from_collection', { collectionId, paperId }),
    onSuccess: (_, variables) => {
      // Invalidate collections, collection papers, and paper collections
      queryClient.invalidateQueries({ queryKey: collectionKeys.all });
      queryClient.invalidateQueries({ queryKey: collectionKeys.papers(variables.collectionId) });
      queryClient.invalidateQueries({ queryKey: collectionKeys.forPaper(variables.paperId) });
    },
  });
}
