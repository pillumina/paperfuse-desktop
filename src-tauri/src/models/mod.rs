pub mod paper;
pub mod settings;
pub mod collection;

pub use paper::{Paper, ArxivPaper, AuthorInfo, KeyFormula, Algorithm, FlowDiagram};
pub use settings::{
    Settings, LLMProvider, ScheduleFrequency, TopicConfig,
    FetchOptions, FetchResult, FetchStatus, FetchStatusState,
    ScheduleStatus, ScheduleRun, ScheduleRunStatus,
    compute_topics_hash,
};
pub use collection::{Collection, CollectionWithPaperCount, CreateCollection, UpdateCollection};

// Re-export fetch history types from database module
pub use crate::database::{FetchHistoryEntry, PaperSummary};
