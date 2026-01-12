/**
 * Topics Configuration for Desktop App
 *
 * Desktop app uses local database storage instead of environment variables.
 * Topics are managed through the Settings UI and stored in SQLite.
 */

export interface TopicConfig {
  /** Unique identifier stored in database */
  key: string;
  /** Display label shown in UI */
  label: string;
  /** Detailed description for classification prompt */
  description: string;
  /** Tailwind CSS color classes for badges */
  color: string;
  /** Optional: ArXiv categories for fetching (default: ['cs.AI', 'cs.LG']) */
  arxivCategories?: string[];
  /** Optional: Max papers per day (default: 10) */
  maxPapersPerDay?: number;
  /** Optional: Number of papers to deep analyze (default: 3) */
  deepAnalysisCount?: number;
  /** Optional: Quick score threshold for deep analysis (default: 7) */
  quickScoreThreshold?: number;
  /** Optional: Keywords for additional relevance filtering */
  keywords?: string[];
}

/**
 * Domain configuration derived from TopicConfig
 */
export interface DomainConfig {
  tag: string;
  arxivCategories: string[];
  maxPapersPerDay: number;
  deepAnalysisCount: number;
  quickScoreThreshold: number;
  keywords: string[];
}

// Cache for topics (will be loaded from database in production)
let cachedTopics: TopicConfig[] | null = null;

/**
 * Get all topic configurations
 * In production, this will load from the local database
 */
export function getTopics(): TopicConfig[] {
  if (cachedTopics) {
    return cachedTopics;
  }

  // Default topics
  const defaults: TopicConfig[] = [
    {
      key: 'rl',
      label: 'Reinforcement Learning',
      description: 'RL algorithms, training methods, exploration, exploitation, policy optimization, value functions, actor-critic, PPO, DQN, SARSA, reward shaping, hierarchical RL, etc.',
      color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      arxivCategories: ['cs.AI', 'cs.LG', 'stat.ML'],
      maxPapersPerDay: 10,
      deepAnalysisCount: 3,
      quickScoreThreshold: 7,
      keywords: ['reinforcement', 'reinforcement learning', 'policy gradient', 'q-learning', 'actor-critic', 'ppo', 'dqn', 'rlhf', 'rlaif'],
    },
    {
      key: 'llm',
      label: 'Large Language Models',
      description: 'LLM architecture, training, alignment, capabilities, language models, transformers for NLP, GPT, BERT, T5, scaling laws, pre-training, fine-tuning, instruction tuning, etc.',
      color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      arxivCategories: ['cs.AI', 'cs.CL', 'cs.LG'],
      maxPapersPerDay: 10,
      deepAnalysisCount: 3,
      quickScoreThreshold: 7,
      keywords: ['language model', 'llm', 'gpt', 'transformer', 'attention', 'pretraining', 'finetuning', 'alignment', 'llm inference', 'large language'],
    },
    {
      key: 'inference',
      label: 'Inference & Systems',
      description: 'LLM inference optimization, quantization, distillation, serving systems, vLLM, TensorRT-LLM, deployment, latency optimization, throughput improvements, batch processing, etc.',
      color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      arxivCategories: ['cs.AI', 'cs.LG', 'cs.DC'],
      maxPapersPerDay: 8,
      deepAnalysisCount: 2,
      quickScoreThreshold: 8,
      keywords: ['inference', 'quantization', 'distillation', 'speculative', 'kv cache', 'acceleration', 'optimization', 'serving', 'latency', 'throughput'],
    },
    // Additional topics (disabled by default for new users)
    {
      key: 'moe',
      label: 'Mixture-of-Experts (MoE)',
      description: 'Mixture-of-Experts (MoE) models, sparse activation, expert routing, load balancing, Switch Transformer, GLaM, expert selection, MoE inference optimization, conditional computation, etc.',
      color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
      arxivCategories: ['cs.AI', 'cs.LG', 'stat.ML'],
      maxPapersPerDay: 10,
      deepAnalysisCount: 3,
      quickScoreThreshold: 7,
      keywords: ['mixture of experts', 'moe', 'sparse', 'expert routing', 'switch transformer', 'load balancing', 'conditional computation'],
    },
    {
      key: 'embodied',
      label: 'Embodied AI',
      description: 'Embodied AI, robot learning, vision-language-action models, Sim-to-Real transfer, manipulation policies, navigation, multimodal perception for robotics, physical interaction, etc.',
      color: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
      arxivCategories: ['cs.AI', 'cs.RO', 'cs.LG'],
      maxPapersPerDay: 10,
      deepAnalysisCount: 3,
      quickScoreThreshold: 7,
      keywords: ['embodied', 'robotics', 'manipulation', 'navigation', 'sim-to-real', 'vla', 'vision-language-action'],
    },
    {
      key: 'world_model',
      label: 'World Models',
      description: 'World models, environment simulation, predictive models, model-based RL, Dreamer, world representation, dynamics learning, planning with learned models, etc.',
      color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
      arxivCategories: ['cs.AI', 'cs.LG', 'stat.ML'],
      maxPapersPerDay: 10,
      deepAnalysisCount: 3,
      quickScoreThreshold: 7,
      keywords: ['world model', 'model-based', 'predictive model', 'dreamer', 'dynamics', 'planning', 'environment model'],
    },
    {
      key: 'multimodal',
      label: 'Multimodal AI',
      description: 'Multimodal learning, vision-language models, CLIP, visual question answering, image generation, multimodal reasoning, cross-modal alignment, etc.',
      color: 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200',
      arxivCategories: ['cs.AI', 'cs.CL', 'cs.CV', 'cs.LG'],
      maxPapersPerDay: 10,
      deepAnalysisCount: 3,
      quickScoreThreshold: 7,
      keywords: ['multimodal', 'vision-language', 'clip', 'vqa', 'cross-modal', 'alignment', 'image generation'],
    },
  ];

  cachedTopics = defaults;
  return defaults;
}

/**
 * Set topics (used by Settings UI)
 * In production, this will save to the local database
 */
export function setTopics(topics: TopicConfig[]): void {
  cachedTopics = topics;
  // TODO: Save to database
}

/**
 * Get topic label by key
 */
export function getTopicLabel(key: string): string {
  const topics = getTopics();
  const topic = topics.find(t => t.key === key);
  return topic?.label || key;
}

/**
 * Get topic color by key
 */
export function getTopicColor(key: string): string {
  const topics = getTopics();
  const topic = topics.find(t => t.key === key);
  return topic?.color || 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
}

/**
 * Get all valid topic keys
 */
export function getTopicKeys(): string[] {
  return getTopics().map(t => t.key);
}

/**
 * Validate if a key is a valid topic
 */
export function isValidTopic(key: string): boolean {
  return getTopicKeys().includes(key);
}

/**
 * Get domain configuration for a specific topic
 */
export function getDomainConfig(tag: string): DomainConfig | null {
  const topics = getTopics();
  const topic = topics.find(t => t.key === tag);

  if (!topic) {
    return null;
  }

  return {
    tag: topic.key,
    arxivCategories: topic.arxivCategories || ['cs.AI', 'cs.LG'],
    maxPapersPerDay: topic.maxPapersPerDay ?? 10,
    deepAnalysisCount: topic.deepAnalysisCount ?? 3,
    quickScoreThreshold: topic.quickScoreThreshold ?? 7,
    keywords: topic.keywords || [],
  };
}

/**
 * Get all domain configurations
 */
export function getAllDomainConfigs(): DomainConfig[] {
  const topics = getTopics();
  return topics.map(topic => ({
    tag: topic.key,
    arxivCategories: topic.arxivCategories || ['cs.AI', 'cs.LG'],
    maxPapersPerDay: topic.maxPapersPerDay ?? 10,
    deepAnalysisCount: topic.deepAnalysisCount ?? 3,
    quickScoreThreshold: topic.quickScoreThreshold ?? 7,
    keywords: topic.keywords || [],
  }));
}
