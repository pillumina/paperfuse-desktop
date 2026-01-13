//! Analysis block registry for managing available blocks

use crate::analysis::AnalysisBlockConfig;
use crate::analysis::blocks::get_all_blocks;
use std::collections::HashMap;
use std::sync::RwLock;

/// Global registry for analysis blocks
pub struct AnalysisRegistry {
    blocks: RwLock<HashMap<String, AnalysisBlockConfig>>,
}

impl AnalysisRegistry {
    /// Create a new registry with all built-in blocks registered
    pub fn new() -> Self {
        let blocks_map: HashMap<String, AnalysisBlockConfig> = get_all_blocks()
            .into_iter()
            .map(|b| (b.id.clone(), b))
            .collect();

        Self {
            blocks: RwLock::new(blocks_map),
        }
    }

    /// Get all registered blocks
    pub fn get_all(&self) -> Vec<AnalysisBlockConfig> {
        self.blocks
            .read()
            .unwrap()
            .values()
            .cloned()
            .collect()
    }

    /// Get a specific block by ID
    pub fn get(&self, id: &str) -> Option<AnalysisBlockConfig> {
        self.blocks
            .read()
            .unwrap()
            .get(id)
            .cloned()
    }

    /// Check if a block exists
    pub fn has(&self, id: &str) -> bool {
        self.blocks
            .read()
            .unwrap()
            .contains_key(id)
    }
}

// Global lazy instance
lazy_static::lazy_static! {
    /// Global analysis block registry
    pub static ref REGISTRY: AnalysisRegistry = AnalysisRegistry::new();
}