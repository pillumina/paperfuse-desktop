// ============================================
// App Constants
// ============================================

export const APP_NAME = 'PaperFuse';
export const APP_VERSION = '0.1.0';

// Database
export const DB_NAME = 'paperfuse.db';
export const DB_VERSION = 1;

// Storage paths (relative to app data directory)
export const CACHE_DIR = 'cache';
export const PAPERS_CACHE_DIR = 'cache/papers';
export const BACKUP_DIR = 'backups';

// Fetch defaults
export const DEFAULT_DAYS_BACK = 3;
export const DEFAULT_MAX_PAPERS = 50;
export const DEFAULT_ANALYSIS_DEPTH = 'standard' as const;

// Score thresholds
export const DEFAULT_MIN_SCORE_THRESHOLD = 7;
export const DEFAULT_MIN_SCORE_TO_SAVE = 5;

// Pagination
export const DEFAULT_PAGE_SIZE = 20;

// Refresh intervals (milliseconds)
export const CACHE_REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes
export const FETCH_STATUS_POLL_INTERVAL = 500; // 500ms

// Topic colors
export const TOPIC_COLORS = [
  'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
  'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
] as const;

// LLM Model defaults
export const GLM_MODELS = {
  QUICK: 'glm-4.5-flash',
  DEEP: 'glm-4.7',
} as const;

export const CLAUDE_MODELS = {
  QUICK: 'claude-haiku',
  DEEP: 'claude-sonnet',
} as const;

// ArXiv categories
export const ARXIV_CATEGORIES = [
  { value: 'cs.AI', label: 'Artificial Intelligence' },
  { value: 'cs.CL', label: 'Computation and Language' },
  { value: 'cs.LG', label: 'Machine Learning' },
  { value: 'cs.CV', label: 'Computer Vision' },
  { value: 'cs.RO', label: 'Robotics' },
  { value: 'cs.DC', label: 'Distributed Computing' },
  { value: 'cs.DB', label: 'Databases' },
  { value: 'cs.CR', label: 'Cryptography and Security' },
  { value: 'stat.ML', label: 'Statistics - Machine Learning' },
] as const;

// Keyboard shortcuts
export const KEYBOARD_SHORTCUTS = {
  SEARCH: 'Cmd+K',
  NEW_FETCH: 'Cmd+N',
  SETTINGS: 'Cmd+,',
  CLOSE_WINDOW: 'Cmd+W',
  SHORTCUTS: 'Cmd+/',
} as const;

// Error messages
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network error. Please check your connection.',
  API_ERROR: 'API request failed. Please check your API key.',
  DATABASE_ERROR: 'Database error. Please restart the app.',
  INVALID_API_KEY: 'Invalid API key. Please check your settings.',
  FETCH_FAILED: 'Failed to fetch papers. Please try again.',
  ANALYSIS_FAILED: 'Analysis failed. Please try again.',
} as const;
