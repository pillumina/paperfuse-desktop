#![allow(dead_code)]

use crate::models::{Settings, LLMProvider, ScheduleFrequency};
use sqlx::{SqlitePool, Row};
use thiserror::Error;

#[derive(Error, Debug)]
pub enum SettingsError {
    #[error("Database error: {0}")]
    Database(#[from] sqlx::Error),
    #[error("Setting not found: {0}")]
    NotFound(String),
    #[error("Serialization error: {0}")]
    Serialization(String),
}

pub type Result<T> = std::result::Result<T, SettingsError>;

/// Repository for settings database operations
pub struct SettingsRepository {
    pool: SqlitePool,
}

impl SettingsRepository {
    pub fn new(pool: &SqlitePool) -> Self {
        Self { pool: pool.clone() }
    }

    /// Get all settings
    pub async fn get_all(&self) -> Result<Settings> {
        let rows = sqlx::query("SELECT * FROM settings")
            .fetch_all(&self.pool)
            .await?;

        println!("[SettingsRepository::get_all] Loaded {} rows from database", rows.len());

        let mut settings = Settings::default();

        for row in rows {
            let key: String = row.get("key");
            let value: String = row.get("value");

            match key.as_str() {
                "llm_provider" => {
                    settings.llm_provider = match value.as_str() {
                        "glm" => LLMProvider::Glm,
                        "claude" => LLMProvider::Claude,
                        _ => LLMProvider::Glm,
                    };
                }
                "glm_api_key" => settings.glm_api_key = Some(value),
                "claude_api_key" => settings.claude_api_key = Some(value),
                "glm_quick_model" => settings.glm_quick_model = Some(value),
                "glm_deep_model" => settings.glm_deep_model = Some(value),
                "claude_quick_model" => settings.claude_quick_model = Some(value),
                "claude_deep_model" => settings.claude_deep_model = Some(value),
                "topics" => {
                    settings.topics = serde_json::from_str(&value)
                        .map_err(|e| SettingsError::Serialization(e.to_string()))?;
                }
                "schedule_enabled" => {
                    settings.schedule_enabled = value == "true";
                }
                "schedule_frequency" => {
                    settings.schedule_frequency = match value.as_str() {
                        "daily" => ScheduleFrequency::Daily,
                        "weekly" => ScheduleFrequency::Weekly,
                        _ => ScheduleFrequency::Daily,
                    };
                }
                "schedule_time" => settings.schedule_time = Some(value),
                "schedule_week_days" => {
                    settings.schedule_week_days = Some(
                        serde_json::from_str(&value)
                            .map_err(|e| SettingsError::Serialization(e.to_string()))?
                    );
                }
                "arxiv_categories" => {
                    settings.arxiv_categories = Some(
                        serde_json::from_str(&value)
                            .map_err(|e| SettingsError::Serialization(e.to_string()))?
                    );
                }
                "latex_download_path" => {
                    settings.latex_download_path = Some(value);
                }
                "deep_analysis_mode" => {
                    settings.deep_analysis_mode = Some(value);
                }
                "retry_config" => {
                    settings.retry_config = Some(
                        serde_json::from_str(&value)
                            .map_err(|e| SettingsError::Serialization(e.to_string()))?
                    );
                }
                _ => {}
            }
        }

        println!("[SettingsRepository::get_all] Returning settings: provider={:?}, has_glm_key={}, has_claude_key={}, topics_count={}",
            settings.llm_provider,
            settings.glm_api_key.is_some(),
            settings.claude_api_key.is_some(),
            settings.topics.len()
        );
        for (i, topic) in settings.topics.iter().enumerate() {
            println!("[SettingsRepository::get_all] Topic {}: key={}, label={}, keywords={:?}", i, topic.key, topic.label, topic.keywords);
        }

        // Define all default topics (for new users and to add missing topics for existing users)
        let default_topics = vec![
            crate::models::TopicConfig {
                key: "rl".to_string(),
                label: "Reinforcement Learning".to_string(),
                description: "RL algorithms, training methods, exploration, exploitation, policy optimization, value functions, actor-critic, PPO, DQN, SARSA, reward shaping, hierarchical RL, etc.".to_string(),
                color: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200".to_string(),
                enabled: true,
                arxiv_categories: Some(vec!["cs.AI".to_string(), "cs.LG".to_string(), "stat.ML".to_string()]),
                max_papers_per_day: Some(10),
                deep_analysis_count: Some(3),
                quick_score_threshold: Some(7),
                keywords: Some(vec!["reinforcement".to_string(), "reinforcement learning".to_string(), "policy gradient".to_string(), "q-learning".to_string(), "actor-critic".to_string(), "ppo".to_string(), "dqn".to_string(), "rlhf".to_string(), "rlaif".to_string()]),
            },
            crate::models::TopicConfig {
                key: "llm".to_string(),
                label: "Large Language Models".to_string(),
                description: "LLM architecture, training, alignment, capabilities, language models, transformers for NLP, GPT, BERT, T5, scaling laws, pre-training, fine-tuning, instruction tuning, etc.".to_string(),
                color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200".to_string(),
                enabled: true,
                arxiv_categories: Some(vec!["cs.AI".to_string(), "cs.CL".to_string(), "cs.LG".to_string()]),
                max_papers_per_day: Some(10),
                deep_analysis_count: Some(3),
                quick_score_threshold: Some(7),
                keywords: Some(vec!["language model".to_string(), "llm".to_string(), "gpt".to_string(), "transformer".to_string(), "attention".to_string(), "pretraining".to_string(), "finetuning".to_string(), "alignment".to_string(), "llm inference".to_string(), "large language".to_string()]),
            },
            crate::models::TopicConfig {
                key: "inference".to_string(),
                label: "Inference & Systems".to_string(),
                description: "LLM inference optimization, quantization, distillation, serving systems, vLLM, TensorRT-LLM, deployment, latency optimization, throughput improvements, batch processing, etc.".to_string(),
                color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200".to_string(),
                enabled: true,
                arxiv_categories: Some(vec!["cs.AI".to_string(), "cs.LG".to_string(), "cs.DC".to_string()]),
                max_papers_per_day: Some(8),
                deep_analysis_count: Some(2),
                quick_score_threshold: Some(8),
                keywords: Some(vec!["inference".to_string(), "quantization".to_string(), "distillation".to_string(), "speculative".to_string(), "kv cache".to_string(), "acceleration".to_string(), "optimization".to_string(), "serving".to_string(), "latency".to_string(), "throughput".to_string()]),
            },
            // Additional topics (disabled by default)
            crate::models::TopicConfig {
                key: "moe".to_string(),
                label: "Mixture-of-Experts (MoE)".to_string(),
                description: "Mixture-of-Experts (MoE) models, sparse activation, expert routing, load balancing, Switch Transformer, GLaM, expert selection, MoE inference optimization, conditional computation, etc.".to_string(),
                color: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200".to_string(),
                enabled: false,
                arxiv_categories: Some(vec!["cs.AI".to_string(), "cs.LG".to_string(), "stat.ML".to_string()]),
                max_papers_per_day: Some(10),
                deep_analysis_count: Some(3),
                quick_score_threshold: Some(7),
                keywords: Some(vec!["mixture of experts".to_string(), "moe".to_string(), "sparse".to_string(), "expert routing".to_string(), "switch transformer".to_string(), "load balancing".to_string(), "conditional computation".to_string()]),
            },
            crate::models::TopicConfig {
                key: "embodied".to_string(),
                label: "Embodied AI".to_string(),
                description: "Embodied AI, robot learning, vision-language-action models, Sim-to-Real transfer, manipulation policies, navigation, multimodal perception for robotics, physical interaction, etc.".to_string(),
                color: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200".to_string(),
                enabled: false,
                arxiv_categories: Some(vec!["cs.AI".to_string(), "cs.RO".to_string(), "cs.LG".to_string()]),
                max_papers_per_day: Some(10),
                deep_analysis_count: Some(3),
                quick_score_threshold: Some(7),
                keywords: Some(vec!["embodied".to_string(), "robotics".to_string(), "manipulation".to_string(), "navigation".to_string(), "sim-to-real".to_string(), "vla".to_string(), "vision-language-action".to_string()]),
            },
            crate::models::TopicConfig {
                key: "world_model".to_string(),
                label: "World Models".to_string(),
                description: "World models, environment simulation, predictive models, model-based RL, Dreamer, world representation, dynamics learning, planning with learned models, etc.".to_string(),
                color: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200".to_string(),
                enabled: false,
                arxiv_categories: Some(vec!["cs.AI".to_string(), "cs.LG".to_string(), "stat.ML".to_string()]),
                max_papers_per_day: Some(10),
                deep_analysis_count: Some(3),
                quick_score_threshold: Some(7),
                keywords: Some(vec!["world model".to_string(), "model-based".to_string(), "predictive model".to_string(), "dreamer".to_string(), "dynamics".to_string(), "planning".to_string(), "environment model".to_string()]),
            },
            crate::models::TopicConfig {
                key: "multimodal".to_string(),
                label: "Multimodal AI".to_string(),
                description: "Multimodal learning, vision-language models, CLIP, visual question answering, image generation, multimodal reasoning, cross-modal alignment, etc.".to_string(),
                color: "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200".to_string(),
                enabled: false,
                arxiv_categories: Some(vec!["cs.AI".to_string(), "cs.CL".to_string(), "cs.CV".to_string(), "cs.LG".to_string()]),
                max_papers_per_day: Some(10),
                deep_analysis_count: Some(3),
                quick_score_threshold: Some(7),
                keywords: Some(vec!["multimodal".to_string(), "vision-language".to_string(), "clip".to_string(), "vqa".to_string(), "cross-modal".to_string(), "alignment".to_string(), "image generation".to_string()]),
            },
        ];

        // Store original length to detect if we added topics
        let original_len = settings.topics.len();

        // If topics is empty, populate with all defaults
        // If topics exist, add any missing default topics
        if settings.topics.is_empty() {
            println!("[SettingsRepository::get_all] No topics found, populating with all defaults");
            settings.topics = default_topics;
        } else {
            // Check for missing default topics and add them
            let existing_keys: std::collections::HashSet<String> = settings.topics.iter().map(|t| t.key.clone()).collect();
            let mut added_count = 0;

            for default_topic in &default_topics {
                if !existing_keys.contains(&default_topic.key) {
                    println!("[SettingsRepository::get_all] Adding missing default topic: {}", default_topic.key);
                    settings.topics.push(default_topic.clone());
                    added_count += 1;
                }
            }

            if added_count > 0 {
                println!("[SettingsRepository::get_all] Added {} missing default topics", added_count);
            }
        }

        // Auto-save topics to database if they were modified
        if settings.topics.len() != original_len {
            println!("[SettingsRepository::get_all] Auto-saving topics to database");
            let topics_json = serde_json::to_string(&settings.topics)
                .map_err(|e| SettingsError::Serialization(e.to_string()))?;
            sqlx::query("INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now')) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at")
                .bind("topics")
                .bind(&topics_json)
                .execute(&self.pool)
                .await?;
            println!("[SettingsRepository::get_all] Default topics saved to database");
        }

        // Set default ArXiv categories ONLY if never configured (None)
        // Don't override if user explicitly set an empty array or custom categories
        if settings.arxiv_categories.is_none() {
            println!("[SettingsRepository::get_all] No ArXiv categories configured, setting defaults");
            settings.arxiv_categories = Some(vec![
                "cs.AI".to_string(),
                "cs.LG".to_string(),
                "stat.ML".to_string(),
            ]);
        } else {
            println!("[SettingsRepository::get_all] ArXiv categories loaded: {:?} ({} categories)",
                settings.arxiv_categories,
                settings.arxiv_categories.as_ref().map_or(0, |c| c.len())
            );
        }

        Ok(settings)
    }

    /// Save all settings
    pub async fn save_all(&self, settings: &Settings) -> Result<()> {
        let now = chrono::Utc::now().format("%Y-%m-%dT%H:%M:%S%.3fZ").to_string();

        println!("[SettingsRepository::save_all] Saving settings: provider={:?}, has_glm_key={}, has_claude_key={}",
            settings.llm_provider,
            settings.glm_api_key.is_some(),
            settings.claude_api_key.is_some()
        );

        // Helper to save a single key-value pair
        async fn save<'a>(
            pool: &SqlitePool,
            now: &'a str,
            key: &'a str,
            value: &'a str,
        ) -> sqlx::Result<()> {
            sqlx::query(
                "INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)
                 ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at"
            )
            .bind(key)
            .bind(value)
            .bind(now)
            .execute(pool)
            .await?;
            Ok(())
        }

        // Save each setting
        save(&self.pool, &now, "llm_provider", match settings.llm_provider {
            LLMProvider::Glm => "glm",
            LLMProvider::Claude => "claude",
        }).await?;

        if let Some(ref key) = settings.glm_api_key {
            save(&self.pool, &now, "glm_api_key", key).await?;
        }

        if let Some(ref key) = settings.claude_api_key {
            save(&self.pool, &now, "claude_api_key", key).await?;
        }

        if let Some(ref model) = settings.glm_quick_model {
            save(&self.pool, &now, "glm_quick_model", model).await?;
        }

        if let Some(ref model) = settings.glm_deep_model {
            save(&self.pool, &now, "glm_deep_model", model).await?;
        }

        if let Some(ref model) = settings.claude_quick_model {
            save(&self.pool, &now, "claude_quick_model", model).await?;
        }

        if let Some(ref model) = settings.claude_deep_model {
            save(&self.pool, &now, "claude_deep_model", model).await?;
        }

        let topics_json = serde_json::to_string(&settings.topics)
            .map_err(|e| SettingsError::Serialization(e.to_string()))?;
        save(&self.pool, &now, "topics", &topics_json).await?;

        save(&self.pool, &now, "schedule_enabled", if settings.schedule_enabled { "true" } else { "false" }).await?;

        save(&self.pool, &now, "schedule_frequency", match settings.schedule_frequency {
            ScheduleFrequency::Daily => "daily",
            ScheduleFrequency::Weekly => "weekly",
        }).await?;

        if let Some(ref time) = settings.schedule_time {
            save(&self.pool, &now, "schedule_time", time).await?;
        }

        if let Some(ref days) = settings.schedule_week_days {
            let days_json = serde_json::to_string(days)
                .map_err(|e| SettingsError::Serialization(e.to_string()))?;
            save(&self.pool, &now, "schedule_week_days", &days_json).await?;
        }

        if let Some(ref categories) = settings.arxiv_categories {
            let categories_json = serde_json::to_string(categories)
                .map_err(|e| SettingsError::Serialization(e.to_string()))?;
            save(&self.pool, &now, "arxiv_categories", &categories_json).await?;
        }

        if let Some(ref path) = settings.latex_download_path {
            save(&self.pool, &now, "latex_download_path", path).await?;
        }

        if let Some(ref mode) = settings.deep_analysis_mode {
            save(&self.pool, &now, "deep_analysis_mode", mode).await?;
        }

        if let Some(ref config) = settings.retry_config {
            let config_json = serde_json::to_string(config)
                .map_err(|e| SettingsError::Serialization(e.to_string()))?;
            save(&self.pool, &now, "retry_config", &config_json).await?;
        }

        Ok(())
    }

    /// Get a single setting value
    pub async fn get(&self, key: &str) -> Result<Option<String>> {
        let row = sqlx::query("SELECT value FROM settings WHERE key = ?")
            .bind(key)
            .fetch_optional(&self.pool)
            .await?;

        Ok(row.map(|r| r.get("value")))
    }

    /// Set a single setting value
    pub async fn set(&self, key: &str, value: &str) -> Result<()> {
        let now = chrono::Utc::now().format("%Y-%m-%dT%H:%M:%S%.3fZ").to_string();

        sqlx::query(
            "INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)
             ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at"
        )
        .bind(key)
        .bind(value)
        .bind(&now)
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    /// Delete a setting
    pub async fn delete(&self, key: &str) -> Result<()> {
        sqlx::query("DELETE FROM settings WHERE key = ?")
            .bind(key)
            .execute(&self.pool)
            .await?;

        Ok(())
    }
}
