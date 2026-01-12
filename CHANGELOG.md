# Changelog

All notable changes to PaperFuse Desktop will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] - 2025-01-08

### Features

#### Core Functionality
- ArXiv paper fetching with configurable topics and categories
- AI-powered paper classification using GLM or Claude LLM providers
- Automatic relevance scoring and filtering
- Deep analysis with AI summaries and key insights
- Algorithm flowcharts in Mermaid diagrams
- Collections for organizing papers
- Spam management with bulk operations
- Local SQLite database for paper storage

#### User Interface
- Clean, modern macOS native UI with list and grid view options
- Dark mode with system preference detection and manual override
- Smooth page transitions and animations
- Loading skeletons for better perceived performance
- Empty states for no data scenarios
- Modal dialogs for confirmations
- Toast notifications for user feedback
- Responsive design for various screen sizes

#### Search and Filter
- Real-time search across title, summary, and AI summary
- Quick filter chips for common scenarios
- Tag-based filtering
- Date range filtering (Today, 7 days, 30 days, All time)
- Fetched date range filtering
- Relevance score slider
- Code availability filter
- Topic-based filtering

#### Collections
- Create custom collections to organize papers
- Add/remove papers to/from collections
- Bulk operations for adding papers
- Collection cards with paper counts
- View papers by collection

#### Spam Management
- Mark papers as spam to train the filter
- View all spam papers in dedicated page
- Bulk restore spam papers
- Bulk delete spam papers
- Clear all spam
- Multi-select mode for batch operations

#### Scheduling
- Daily and weekly scheduled fetches
- launchd integration for macOS
- Automatic paper fetching at configured times
- Consecutive failure tracking with auto-disable

#### Keyboard Shortcuts
- `Cmd+K` - Open keyboard shortcuts help
- `Cmd+N` - Start new fetch
- `Cmd+,` - Open settings
- `Cmd+1` - Navigate to Home
- `Cmd+2` - Navigate to Papers
- `Cmd+3` - Navigate to Collections
- `Cmd+4` - Navigate to Settings
- `Cmd+5` - Navigate to Spam
- `Space` - Select/deselect paper (in selection mode)
- `Escape` - Close dialog or cancel selection

### Technical
- Comprehensive error handling with retry logic
- LLM retry configuration with exponential backoff
- Database migrations for schema versioning
- Tauri 2.0 with React 19
- TypeScript strict mode for type safety
- Tailwind CSS 4 for styling
- Virtual scrolling for large paper lists
- Auto-animate for smooth list transitions

### CI/CD
- GitHub Actions workflow for automated builds
- Multi-architecture support (Intel x86_64 and Apple Silicon arm64)
- Universal binary creation for distribution
- Automated testing on push and PR

### Documentation
- Comprehensive README with installation and usage instructions
- MIT License

### Known Limitations
- macOS only (macOS 14.0+)
- Notes feature not yet implemented
- Export to BibTeX/EndNote/Zotero not yet implemented

### Dependencies
- @tanstack/react-query ^5.90.16
- @tauri-apps/api ^2
- react ^19.1.0
- react-router-dom ^7.11.0
- sonner ^2.0.7
- tailwindcss ^4.1.18
- vitest ^4.0.16

[Unreleased]: https://github.com/pillumina/paperfuse-desktop/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/pillumina/paperfuse-desktop/releases/tag/v0.1.0
