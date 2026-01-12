import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ThemeProvider } from '../../contexts/ThemeContext';
import { ThemeToggle } from './ThemeToggle';

function wrapper({ children }: { children: React.ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}

describe('ThemeToggle', () => {
  it('renders three theme buttons', () => {
    render(<ThemeToggle />, { wrapper });
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(3);
  });

  it('has light theme button', () => {
    render(<ThemeToggle />, { wrapper });
    const lightButton = screen.getByTitle('Light theme');
    expect(lightButton).toBeInTheDocument();
  });

  it('has dark theme button', () => {
    render(<ThemeToggle />, { wrapper });
    const darkButton = screen.getByTitle('Dark theme');
    expect(darkButton).toBeInTheDocument();
  });

  it('has system theme button', () => {
    render(<ThemeToggle />, { wrapper });
    const systemButton = screen.getByTitle('System theme');
    expect(systemButton).toBeInTheDocument();
  });
});
