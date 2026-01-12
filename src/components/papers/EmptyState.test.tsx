import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EmptyState } from './EmptyState';

// Mock react-router-dom
vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}));

describe('EmptyState', () => {
  describe('default (no-papers)', () => {
    it('renders no papers message', () => {
      render(<EmptyState />);
      expect(screen.getByText('No papers yet')).toBeInTheDocument();
    });

    it('shows description', () => {
      render(<EmptyState />);
      expect(screen.getByText(/Fetch your first papers from ArXiv/i)).toBeInTheDocument();
    });

    it('has two action buttons', () => {
      render(<EmptyState />);
      const buttons = screen.getAllByRole('button');
      expect(buttons).toHaveLength(2);
    });
  });

  describe('no-results', () => {
    it('renders no papers found message', () => {
      render(<EmptyState type="no-results" />);
      expect(screen.getByText('No papers found')).toBeInTheDocument();
    });

    it('shows search query in message', () => {
      render(<EmptyState type="no-results" searchQuery="machine learning" />);
      expect(screen.getByText(/No papers match "machine learning"/)).toBeInTheDocument();
    });

    it('shows clear filters button', () => {
      render(<EmptyState type="no-results" />);
      expect(screen.getByRole('button', { name: 'Clear Filters' })).toBeInTheDocument();
    });
  });

  describe('no-collections', () => {
    it('renders no collections message', () => {
      render(<EmptyState type="no-collections" />);
      expect(screen.getByText('No collections yet')).toBeInTheDocument();
    });

    it('shows description for collections', () => {
      render(<EmptyState type="no-collections" />);
      expect(screen.getByText(/Create collections to organize/i)).toBeInTheDocument();
    });
  });

  describe('no-network', () => {
    it('renders connection error message', () => {
      render(<EmptyState type="no-network" />);
      expect(screen.getByText('Connection error')).toBeInTheDocument();
    });

    it('shows retry button', () => {
      render(<EmptyState type="no-network" />);
      expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
    });

    it('shows connection error description', () => {
      render(<EmptyState type="no-network" />);
      expect(screen.getByText(/Unable to connect to the server/i)).toBeInTheDocument();
    });
  });
});
