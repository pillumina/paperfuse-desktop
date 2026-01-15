pub mod papers;
pub mod settings;
pub mod fetch;
pub mod schedule;
pub mod collections;
pub mod analysis;
pub mod platform;

// Re-export all commands
pub use papers::*;
pub use settings::*;
pub use fetch::*;
pub use schedule::*;
pub use collections::*;
pub use analysis::*;
pub use platform::*;
