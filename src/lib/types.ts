// ============================================
// Core Types for PaperFuse Desktop
// ============================================

export type PaperTag = string;
export type AnalysisDepth = 'none' | 'basic' | 'standard' | 'full';

// Analysis block types for modular configuration
export type BlockDepth = 'standard' | 'full';
export type BlockRunMode = 'standard' | 'full' | 'both';

export type BlockCategory = 'basic' | 'core' | 'technical' | 'engineering';

export type OutputSchema =
  | 'single_string'
  | 'string_array'
  | 'structured_quality'
  | 'algorithm_list'
  | 'formula_list'
  | 'flowchart'
  | 'paper_reference_list'
  | 'code_links';

export interface I18nText {
  en: string;
  zh: string;
}

export interface AnalysisBlockConfig {
  id: string;
  name: I18nText;
  description: I18nText;
  category: BlockCategory;
  defaultEnabled: boolean;
  supportedModes: BlockDepth[];
  defaultMode: BlockRunMode;
  order: number;
  dependsOn?: string[];
  outputSchema: OutputSchema;
}

export interface UserBlockConfig {
  blockId: string;
  enabled: boolean;
  mode: BlockRunMode;
}

export interface UserAnalysisConfig {
  blocks: UserBlockConfig[];
}

export interface AuthorInfo {
  name: string;
  affiliation: string | null;
}

export interface TagWithCount {
  tag: string;
  count: number;
}

export interface Paper {
  id: string;
  arxiv_id: string;
  title: string;
  authors: AuthorInfo[];
  summary: string | null;
  ai_summary: string | null;
  key_insights: string[] | null;
  engineering_notes: string | null;
  code_links: string[] | null;
  tags: string[];
  topics: string[]; // Topics associated with this paper (e.g., 'rl', 'llm', 'inference')
  published_date: string;
  arxiv_url: string;
  pdf_url: string;
  filter_score: number | null;
  filter_reason: string | null;
  is_deep_analyzed: boolean;
  version: number;
  created_at: string;
  updated_at: string;
  key_formulas: KeyFormula[] | null;
  algorithms: Algorithm[] | null;
  flow_diagram: FlowDiagram | null;
  analysis_type: AnalysisDepth | null;

  // Deep Analysis V2 fields
  code_available: boolean;
  novelty_score: number | null;
  novelty_reason: string | null;
  effectiveness_score: number | null;
  effectiveness_reason: string | null;
  experiment_completeness_score: number | null;
  experiment_completeness_reason: string | null;
  algorithm_flowchart: string | null;
  time_complexity: string | null;
  space_complexity: string | null;
  analysis_mode: 'standard' | 'full' | null;
  analysis_incomplete: boolean;
  related_papers?: RelatedPaper[];

  // HTML parsing fields
  content_source?: 'html' | 'latex' | 'abstract' | null;
  estimated_tokens?: number | null;
  available_sections?: string[] | null;
}

export interface KeyFormula {
  latex: string;
  name: string;
  description: string;
}

export interface Algorithm {
  name: string;
  steps: string[];
  complexity?: string;
}

export interface FlowDiagram {
  format: 'mermaid' | 'text';
  content: string;
}

export type PaperRelationship =
  | 'builds_on'
  | 'improves_upon'
  | 'competing_with'
  | 'cited_by'
  | 'similar_to';

export interface RelatedPaper {
  arxivId: string;
  title: string;
  relationship: PaperRelationship;
  relevanceScore?: number | null;  // Optional for robustness
  reason?: string | null;         // Optional for robustness
}

// ============================================
// Domain Configuration Types
// ============================================

export interface TopicConfig {
  key: string;
  label: string;
  description: string;
  color: string;
  enabled?: boolean; // Whether this topic is active/enabled
  arxivCategories?: string[];
  maxPapersPerDay?: number;
  deepAnalysisCount?: number;
  quickScoreThreshold?: number;
  keywords?: string[];
}

export interface DomainConfig {
  tag: string;
  arxivCategories: string[];
  maxPapersPerDay: number;
  deepAnalysisCount: number;
  quickScoreThreshold: number;
  keywords: string[];
}

// ============================================
// Settings Types
// ============================================

export type LLMProvider = 'glm' | 'claude';

export type ScheduleRunStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface ScheduleStatus {
  enabled: boolean;
  next_run_time: string | null;
  last_run_time: string | null;
  last_run_status: ScheduleRunStatus | null;
  consecutive_failures: number;
}

export interface ScheduleRun {
  id: string;
  started_at: string;
  completed_at: string | null;
  status: ScheduleRunStatus;
  papers_fetched: number;
  papers_saved: number;
  error_message: string | null;
}

export interface RetryConfig {
  maxRetries: number;
  maxRetryDurationSecs: number;
  initialBackoffMs: number;
  maxBackoffMs: number;
  backoffMultiplier: number;
  jitterFactor: number;
  requestTimeoutSecs: number;
  retryOnRateLimit: boolean;
  retryOnServerError: boolean;
  retryOnNetworkError: boolean;
}

export interface Settings {
  llmProvider: LLMProvider;
  glmApiKey?: string;
  claudeApiKey?: string;
  glmQuickModel?: string;
  glmDeepModel?: string;
  claudeQuickModel?: string;
  claudeDeepModel?: string;
  topics: TopicConfig[];
  scheduleEnabled: boolean;
  scheduleFrequency: 'daily' | 'weekly';
  scheduleTime?: string; // HH:MM format
  scheduleWeekDays?: number[]; // 0-6 for Sunday-Saturday
  arxivCategories?: string[];
  latexDownloadPath?: string;
  pdfDownloadPath?: string;

  // Deep Analysis V2 setting
  deepAnalysisMode?: 'standard' | 'full';

  // Retry configuration
  retryConfig?: RetryConfig;

  // Async analysis configuration
  asyncAnalysisMode?: 'sync' | 'async'; // default: 'sync'
  maxConcurrentAnalyses?: number; // 1-5, default: 1
}

export const DEFAULT_SETTINGS: Settings = {
  llmProvider: 'glm',
  scheduleEnabled: false,
  scheduleFrequency: 'daily',
  topics: [],
  deepAnalysisMode: 'standard',
  asyncAnalysisMode: 'sync',
  maxConcurrentAnalyses: 1,
};

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  maxRetryDurationSecs: 300,
  initialBackoffMs: 1000,
  maxBackoffMs: 30000,
  backoffMultiplier: 2.0,
  jitterFactor: 0.1,
  requestTimeoutSecs: 120,
  retryOnRateLimit: true,
  retryOnServerError: true,
  retryOnNetworkError: true,
};

// ============================================
// App State Types
// ============================================

export interface FetchOptions {
  api_key: string;
  llm_provider: LLMProvider;
  quick_model?: string;
  deep_model?: string;
  categories: string[];
  max_papers: number;
  days_back?: number;
  date_from?: string;  // Custom start date in YYYY-MM-DD format
  date_to?: string;    // Custom end date in YYYY-MM-DD format
  min_relevance: number;
  deep_analysis: boolean;
  deep_analysis_threshold?: number;
  analysis_mode?: 'standard' | 'full';
  async_mode?: 'sync' | 'async'; // default: 'sync'
  max_concurrent?: number; // 1-5, default: 1
  language?: 'en' | 'zh'; // default: 'en'
  // Fetch by ID mode
  fetch_by_id?: boolean; // Enable fetch-by-ID mode instead of category search
  arxiv_ids?: string[];  // List of arXiv IDs for fetch-by-ID mode
}

export interface FetchResult {
  total_fetched: number;
  passed_filter: number;
  analyzed: number;
  deep_analyzed: number;
  stored: number;
  by_tag: Record<string, number>;
  duration_seconds: number;
}

export interface FetchStatus {
  status: 'idle' | 'fetching' | 'filtering' | 'analyzing' | 'completed' | 'error';
  progress: number;
  current_step: string;
  result?: FetchResult;
  error?: string;
  papers_found: number;
  papers_analyzed: number;
  papers_saved: number;
  papers_filtered: number;
  papers_duplicates: number;
  papers_cache_hits: number;
  errors: string[];
  // Async mode specific fields (snake_case to match Rust backend)
  queue_size?: number;
  active_tasks?: number;
  completed_tasks?: number;
  failed_tasks?: number;
  async_mode?: boolean;
}

// ============================================
// Note & Collection Types (Phase 2)
// ============================================

export interface Note {
  id: string;
  paper_id: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface Collection {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  paper_count: number;
  created_at: string;
  updated_at: string;
}

// Alias for Collection (for backwards compatibility)
export type CollectionWithPaperCount = Collection;

export interface CreateCollectionInput {
  name: string;
  description?: string;
  color?: string;
}

export interface UpdateCollectionInput {
  name?: string;
  description?: string;
  color?: string;
}

// ============================================
// Fetch History Types
// ============================================

export type FetchHistoryStatus = 'completed' | 'failed' | 'cancelled' | 'running';

export interface PaperSummary {
  id: string;
  title: string;
  arxiv_id: string;
}

export interface FetchHistoryEntry {
  id: string;
  started_at: string;
  completed_at: string | null;
  status: FetchHistoryStatus;
  papers_fetched: number;
  papers_analyzed: number;
  papers_saved: number;
  papers_filtered: number;
  llm_provider: string | null;
  max_papers: number | null;
  error_message: string | null;
  papers: PaperSummary[] | null;
}
