import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useCollections, useCreateCollection, useUpdateCollection, useDeleteCollection } from '../useCollections';

// Mock Tauri invoke
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

import { invoke } from '@tauri-apps/api/core';

describe('useCollections', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    vi.clearAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );

  describe('useCollections', () => {
    it('should fetch collections successfully', async () => {
      const mockCollections = [
        {
          id: '1',
          name: 'Collection 1',
          description: 'Description 1',
          color: 'bg-blue-500',
          paper_count: 5,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
        {
          id: '2',
          name: 'Collection 2',
          description: null,
          color: null,
          paper_count: 3,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ];

      vi.mocked(invoke).mockResolvedValue(mockCollections);

      const { result } = renderHook(() => useCollections(), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockCollections);
    });

    it('should handle errors', async () => {
      vi.mocked(invoke).mockRejectedValue(new Error('Failed to fetch'));

      const { result } = renderHook(() => useCollections(), { wrapper });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });
  });

  describe('useCreateCollection', () => {
    it('should create collection successfully', async () => {
      const newCollection = {
        id: '123',
        name: 'New Collection',
        description: 'Test description',
        color: 'bg-green-500',
        paper_count: 0,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      vi.mocked(invoke).mockResolvedValue(newCollection);

      const { result } = renderHook(() => useCreateCollection(), { wrapper });

      const mutation = result.current;

      await mutation.mutateAsync({
        name: 'New Collection',
        description: 'Test description',
        color: 'bg-green-500',
      });

      expect(invoke).toHaveBeenCalledWith('create_collection', {
        name: 'New Collection',
        description: 'Test description',
        color: 'bg-green-500',
      });
    });

    it('should invalidate collections query on success', async () => {
      const newCollection = {
        id: '123',
        name: 'New Collection',
        description: null,
        color: null,
        paper_count: 0,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      vi.mocked(invoke).mockResolvedValue(newCollection);

      const { result } = renderHook(() => useCreateCollection(), { wrapper });

      const spy = vi.spyOn(queryClient, 'invalidateQueries');

      await result.current.mutateAsync({
        name: 'New Collection',
      });

      // Verify invalidation
      await waitFor(() => {
        expect(spy).toHaveBeenCalledWith({
          queryKey: ['collections'],
        });
      });

      spy.mockRestore();
    });
  });

  describe('useUpdateCollection', () => {
    it('should update collection successfully', async () => {
      const updatedCollection = {
        id: '123',
        name: 'Updated Collection',
        description: 'Updated description',
        color: 'bg-purple-500',
        paper_count: 5,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z',
      };

      vi.mocked(invoke).mockResolvedValue(updatedCollection);

      const { result } = renderHook(() => useUpdateCollection(), { wrapper });

      await result.current.mutateAsync({
        id: '123',
        name: 'Updated Collection',
        description: 'Updated description',
        color: 'bg-purple-500',
      });

      expect(invoke).toHaveBeenCalledWith('update_collection', {
        id: '123',
        name: 'Updated Collection',
        description: 'Updated description',
        color: 'bg-purple-500',
      });
    });
  });

  describe('useDeleteCollection', () => {
    it('should delete collection successfully', async () => {
      vi.mocked(invoke).mockResolvedValue(undefined);

      const { result } = renderHook(() => useDeleteCollection(), { wrapper });

      await result.current.mutateAsync('123');

      expect(invoke).toHaveBeenCalledWith('delete_collection', {
        id: '123',
      });
    });

    it('should invalidate collections query on success', async () => {
      vi.mocked(invoke).mockResolvedValue(undefined);

      const { result } = renderHook(() => useDeleteCollection(), { wrapper });

      const spy = vi.spyOn(queryClient, 'invalidateQueries');

      await result.current.mutateAsync('123');

      await waitFor(() => {
        expect(spy).toHaveBeenCalledWith({
          queryKey: ['collections'],
        });
      });

      spy.mockRestore();
    });
  });
});
