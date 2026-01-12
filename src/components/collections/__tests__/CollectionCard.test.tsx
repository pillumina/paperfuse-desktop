import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CollectionCard } from '../CollectionCard';

// Mock dependencies
vi.mock('sonner');

describe('CollectionCard', () => {
  const mockCollection = {
    id: '123',
    name: 'Test Collection',
    description: 'Test description',
    color: 'bg-blue-500',
    paper_count: 5,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z',
  };

  const Wrapper = ({ children }: { children: React.ReactNode }) => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };

  it('should render collection details', () => {
    render(
      <Wrapper>
        <CollectionCard
          collection={mockCollection}
          onDelete={vi.fn()}
          onEdit={vi.fn()}
          onClick={vi.fn()}
        />
      </Wrapper>
    );

    expect(screen.getByText('Test Collection')).toBeInTheDocument();
    expect(screen.getByText('Test description')).toBeInTheDocument();
    expect(screen.getByText('5 papers')).toBeInTheDocument();
  });

  it('should render without description', () => {
    const collectionWithoutDesc = {
      ...mockCollection,
      description: null,
    };

    render(
      <Wrapper>
        <CollectionCard
          collection={collectionWithoutDesc}
          onDelete={vi.fn()}
          onEdit={vi.fn()}
          onClick={vi.fn()}
        />
      </Wrapper>
    );

    expect(screen.getByText('Test Collection')).toBeInTheDocument();
    expect(screen.queryByText('Test description')).not.toBeInTheDocument();
  });

  it('should call onClick when card is clicked', async () => {
    const handleClick = vi.fn();

    render(
      <Wrapper>
        <CollectionCard
          collection={mockCollection}
          onDelete={vi.fn()}
          onEdit={vi.fn()}
          onClick={handleClick}
        />
      </Wrapper>
    );

    const card = screen.getByText('Test Collection').closest('div');
    fireEvent.click(card!);

    expect(handleClick).toHaveBeenCalledWith('123');
  });

  it('should call onEdit when edit button is clicked', async () => {
    const handleEdit = vi.fn();

    render(
      <Wrapper>
        <CollectionCard
          collection={mockCollection}
          onDelete={vi.fn()}
          onEdit={handleEdit}
          onClick={vi.fn()}
        />
      </Wrapper>
    );

    const editButton = screen.getAllByRole('button').find(
      btn => btn.querySelector('svg')?.getAttribute('class')?.includes('w-4 h-4')
    );

    await userEvent.click(editButton!);

    expect(handleEdit).toHaveBeenCalledWith(mockCollection);
  });

  it('should show action buttons on hover', async () => {
    render(
      <Wrapper>
        <CollectionCard
          collection={mockCollection}
          onDelete={vi.fn()}
          onEdit={vi.fn()}
          onClick={vi.fn()}
        />
      </Wrapper>
    );

    const card = screen.getByText('Test Collection').closest('.group');

    // Buttons should be hidden initially
    const buttons = card!.querySelectorAll('.opacity-0');
    expect(buttons.length).toBeGreaterThan(0);

    // Hover over card
    fireEvent.mouseOver(card!);

    // Wait for opacity transition
    await waitFor(() => {
      const visibleButtons = card!.querySelectorAll('.opacity-100, .group-hover\\:opacity-100');
      expect(visibleButtons.length).toBeGreaterThan(0);
    });
  });

  it('should render correct color bar', () => {
    render(
      <Wrapper>
        <CollectionCard
          collection={mockCollection}
          onDelete={vi.fn()}
          onEdit={vi.fn()}
          onClick={vi.fn()}
        />
      </Wrapper>
    );

    // Find the color bar directly by class
    const colorBar = document.querySelector('.h-2.bg-blue-500');

    expect(colorBar).toBeInTheDocument();
  });
});
