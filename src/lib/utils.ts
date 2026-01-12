import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Utility function to merge Tailwind CSS classes
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format date to localized string
 */
export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Format date with relative time
 */
export function formatRelativeTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return formatDate(d);
}

/**
 * Truncate text to specified length
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

/**
 * Format score with color class (0-100 scale)
 * Uses standard Tailwind colors: green (>=90), blue (>=70), yellow (>=50), red (<50)
 */
export function getScoreColor(score: number | null): string {
  if (score === null) return 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400';
  if (score >= 90) return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
  if (score >= 70) return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
  if (score >= 50) return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
  return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
}

/**
 * Sleep for specified milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
