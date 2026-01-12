import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Skeleton, SkeletonCard, SkeletonText, LoadingSpinner } from './Skeleton';

describe('Skeleton Components', () => {
  describe('Skeleton', () => {
    it('renders with default classes', () => {
      const { container } = render(<Skeleton />);
      const skeleton = container.firstChild as HTMLElement;
      expect(skeleton).toHaveClass('animate-pulse', 'bg-gray-200', 'dark:bg-gray-700', 'rounded');
    });

    it('renders with custom className', () => {
      const { container } = render(<Skeleton className="h-10 w-20" />);
      const skeleton = container.firstChild as HTMLElement;
      expect(skeleton).toHaveClass('h-10', 'w-20');
    });

    it('has aria-hidden attribute', () => {
      const { container } = render(<Skeleton />);
      const skeleton = container.firstChild as HTMLElement;
      expect(skeleton).toHaveAttribute('aria-hidden', 'true');
    });
  });

  describe('SkeletonCard', () => {
    it('renders a card structure', () => {
      const { container } = render(<SkeletonCard />);
      const card = container.firstChild as HTMLElement;
      expect(card).toHaveClass('bg-white', 'dark:bg-gray-800', 'rounded-lg', 'border', 'p-4');
    });

    it('has multiple skeleton lines', () => {
      render(<SkeletonCard />);
      const skeletons = screen.getAllByRole('generic', { hidden: true });
      // Should have 4 skeleton elements (3 lines + container)
      expect(skeletons.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('SkeletonText', () => {
    it('renders default 3 lines', () => {
      const { container } = render(<SkeletonText />);
      const skeletons = container.querySelectorAll('div[class*="animate-pulse"]');
      expect(skeletons).toHaveLength(3);
    });

    it('renders custom number of lines', () => {
      const { container } = render(<SkeletonText lines={5} />);
      const skeletons = container.querySelectorAll('div[class*="animate-pulse"]');
      expect(skeletons).toHaveLength(5);
    });
  });

  describe('LoadingSpinner', () => {
    it('renders with default size', () => {
      render(<LoadingSpinner />);
      const spinner = document.querySelector('.border-4.border-gray-200') as HTMLElement;
      expect(spinner).toBeInTheDocument();
      expect(spinner).toHaveClass('w-8', 'h-8'); // md size
    });

    it('renders with small size', () => {
      render(<LoadingSpinner size="sm" />);
      const spinner = document.querySelector('.w-4.h-4') as HTMLElement;
      expect(spinner).toBeInTheDocument();
    });

    it('renders with large size', () => {
      render(<LoadingSpinner size="lg" />);
      const spinner = document.querySelector('.w-12.h-12') as HTMLElement;
      expect(spinner).toBeInTheDocument();
    });

    it('has animation class', () => {
      render(<LoadingSpinner />);
      const spinner = document.querySelector('.animate-spin') as HTMLElement;
      expect(spinner).toBeInTheDocument();
    });
  });
});
