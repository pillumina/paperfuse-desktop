pub mod papers;
pub mod settings;
pub mod fetch;
pub mod schedule;
pub mod collections;
pub mod analysis;

// Re-export all commands
pub use papers::*;
pub use settings::*;
pub use fetch::*;
pub use schedule::*;
pub use collections::*;
pub use analysis::*;

// Explicitly re-export new analysis config commands
pub use settings::{get_available_blocks, get_analysis_config, save_analysis_config};
