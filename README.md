# PaperFuse Desktop

<p align="center">
  <img src="assets/banner.svg" alt="PaperFuse Desktop Banner">
</p>

<p align="center">
  <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="License: MIT"></a>
  <a href="https://github.com/pillumina/paperfuse-desktop"><img src="https://img.shields.io/badge/macOS-14%2B-blue" alt="macOS"></a>
  <a href="https://tauri.app/"><img src="https://img.shields.io/badge/Tauri-2.0-FFC131?logo=tauri&logoColor=000" alt="Tauri"></a>
  <a href="https://react.dev/"><img src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=000" alt="React"></a>
</p>

<p align="center">
  <i>A macOS desktop application for automated research paper discovery and AI-powered analysis</i>
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#installation">Installation</a> •
  <a href="#quick-start">Quick Start</a> •
  <a href="#development">Development</a>
</p>

---

---

## ✨ Features

### 📚 Paper Management
- **Automated Paper Fetching** - Fetch papers from ArXiv based on your research topics
- **Smart Filtering** - Papers are automatically scored and filtered by AI relevance
- **PDF Download & Preview** - Download PDFs locally and open in your preferred PDF viewer
- **Organize with Collections** - Group papers into custom collections for better organization
- **Advanced Search & Filter** - Full-text search with filters by date, score, tags, and topics
- **Spam Management** - Mark irrelevant papers as spam to train the filter
- **Multiple View Modes** - Choose between list and grid view for browsing papers
- **Batch Operations** - Select multiple papers for batch delete, spam marking, or re-analysis
- **Quick Re-analyze** - One-click re-analysis directly from paper cards

### 🤖 AI-Powered Analysis
- **Intelligent Classification** - Automatically categorize papers by research topics
- **Quality Assessment** - AI scores papers on novelty, effectiveness, and completeness
- **Key Insights Extraction** - Get concise summaries of main contributions
- **Algorithm Flowcharts** - Visual representation of algorithms in Mermaid diagrams
- **Technical Details** - Extracted formulas, algorithms, and code availability
- **Complexity Analysis** - Time and space complexity with LaTeX math rendering
- **Multi-LLM Support** - Works with GLM (ZhipuAI) and Claude (Anthropic)
- **Analysis Modes** - Choose between standard (quick) or full (comprehensive) analysis
- **Smart Retry** - Automatically retries failed operations without wasting API credits

### 🌐 Internationalization
- **Bilingual Interface** - Full support for English and Chinese (简体中文)
- **Language Selection** - Choose analysis output language independently of UI language
- **Complete Translation** - All UI elements, dialogs, and messages are localized

### 🎨 User Experience
- **Native macOS Look & Feel** - Built with Tauri for a truly native experience
- **Dark Mode** - Automatic system theme detection with manual override
- **Keyboard Shortcuts** - Power-user friendly keyboard navigation
- **Responsive Design** - Clean interface with smooth animations
- **Local Storage** - All data stored locally on your Mac (SQLite)
- **Hover Previews** - Quick preview of paper details on hover

### ⏰ Automation
- **Scheduled Fetches** - Set up automatic daily or weekly paper fetches
- **Background Processing** - Fetch and analyze papers in the background
- **Smart Notifications** - Get notified when new papers arrive

## 📋 Requirements

- **macOS**: 14.0 (Sonoma) or later
- **Architecture**: Intel (x86_64) or Apple Silicon (arm64)
- **RAM**: 4GB minimum, 8GB recommended
- **Disk Space**: 500MB for app, additional space for paper data

## 🚀 Installation

### From DMG (Recommended)

1. Download the latest `PaperFuse_<version>_universal.dmg` from the [Releases](https://github.com/pillumina/paperfuse-desktop/releases) page
2. Open the DMG file
3. Drag PaperFuse to your Applications folder
4. Launch PaperFuse from Applications

**Note**: The universal DMG works on both Intel and Apple Silicon Macs.

### Building from Source

#### Prerequisites

```bash
# Install Homebrew (if not already installed)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install dependencies
brew install node rust
```

#### Build Steps

```bash
# Clone the repository
git clone https://github.com/pillumina/paperfuse-desktop.git
cd paperfuse-desktop

# Install dependencies
npm install

# Run in development mode
npm run tauri dev

# Build for production (creates DMG)
npm run tauri build
```

The built DMG will be in `src-tauri/target/release/bundle/dmg/`.

## 🎯 Quick Start

### 1. Configure API Key

Go to **Settings** > **API** and add your LLM provider API key:

- **GLM (智谱 AI)**: Get your API key from [https://open.bigmodel.cn/](https://open.bigmodel.cn/)
- **Claude (Anthropic)**: Get your API key from [https://console.anthropic.com/](https://console.anthropic.com/)

### 2. Choose Language

Go to **Settings** > **General** to select your preferred UI language (English or Chinese).

### 3. Configure Storage

Go to **Settings** > **Storage** to set where papers are saved:
- **LaTeX Download Path** - Where LaTeX sources are saved (default: `~/Documents/PaperFuse/latex`)
- **PDF Download Path** - Where PDF files are saved (default: `~/Documents/PaperFuse/pdfs`)

### 4. Add Research Topics

1. Go to **Settings** > **Topics**
2. Click **"Add Topic"**
3. Enter a topic name (e.g., "Machine Learning")
4. Add ArXiv categories (see [ArXiv taxonomy](https://arxiv.org/category_taxonomy))
   - Examples: `cs.AI`, `cs.LG`, `cs.CV`, `stat.ML`
5. Save

### 5. Fetch Papers

1. Click **"Fetch Papers"** on the home page
2. Select topics to fetch from
3. Choose analysis mode:
   - **Standard**: Quick analysis of introduction and conclusion
   - **Full**: Comprehensive analysis including algorithms, complexity, and flowcharts
4. Wait for papers to be fetched and analyzed
5. Browse results in list or grid view

### 6. Organize & Read

- **Create Collections** to group related papers
- **Download PDFs** for offline reading in your preferred PDF viewer
- **Read AI summaries** and key insights
- **View algorithm flowcharts** for technical understanding
- **Filter by score, date, or topics**
- **Use batch operations** to manage multiple papers at once

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd+K` | Open keyboard shortcuts help |
| `Cmd+L` | Switch language (English/中文) |
| `Cmd+N` | Start new fetch |
| `Cmd+,` | Open settings |
| `Cmd+1` | Navigate to Home |
| `Cmd+2` | Navigate to Papers |
| `Cmd+3` | Navigate to Collections |
| `Cmd+4` | Navigate to Settings |
| `Cmd+5` | Navigate to Spam |
| `/` | Focus search box |
| `Space` | Select/Deselect paper (in selection mode) |
| `Shift+Click` | Select range of papers |
| `Escape` | Close dialog or cancel selection |

## 🏗️ Project Structure

```
paperfuse-desktop/
├── src/                          # Frontend (React 19 + TypeScript + Vite)
│   ├── components/               # React components
│   │   ├── collections/          # Collection management
│   │   ├── common/              # Shared components (MermaidRenderer, LaTeXRenderer, etc.)
│   │   ├── fetch/               # Fetch dialog and progress
│   │   ├── papers/              # Paper cards, lists, and actions
│   │   ├── settings/            # Settings pages
│   │   └── ui/                  # Reusable UI components
│   ├── contexts/                 # React contexts (Theme, Language, Keyboard, etc.)
│   ├── hooks/                    # Custom React hooks
│   ├── locales/                  # Internationalization (en, zh)
│   ├── pages/                    # Page components
│   ├── lib/                      # Utility functions and types
│   └── styles/                   # Global styles
├── src-tauri/                    # Backend (Rust)
│   ├── src/
│   │   ├── analysis/            # Modular analysis system
│   │   ├── arxiv.rs             # ArXiv API client
│   │   ├── commands/            # Tauri commands
│   │   ├── database/            # Database layer (SQLite)
│   │   ├── fetch.rs             # Fetch pipeline orchestration
│   │   ├── html_parser.rs       # HTML parsing from arxiv.org/html
│   │   ├── latex_parser.rs      # LaTeX parsing for math and algorithms
│   │   ├── llm/                 # LLM client (GLM, Claude)
│   │   ├── llm_cache.rs         # LLM response caching
│   │   ├── models/              # Data models
│   │   ├── retry/               # Retry logic with exponential backoff
│   │   └── scheduler/           # Scheduled fetch logic
│   ├── migrations/               # Database migrations
│   ├── Cargo.toml               # Rust dependencies
│   └── tauri.conf.json          # Tauri configuration
└── .github/workflows/           # CI/CD workflows
```

## 🛠️ Development

### Prerequisites

- **Node.js**: 20+ ([Download](https://nodejs.org/))
- **npm**: Comes with Node.js
- **Rust**: Latest stable ([Install](https://www.rust-lang.org/tools/install))
- **Xcode Command Line Tools**: `xcode-select --install`

### Setup

```bash
# Clone the repository
git clone https://github.com/pillumina/paperfuse-desktop.git
cd paperfuse-desktop

# Install dependencies
npm install

# Run development server (frontend only)
npm run dev

# Run Tauri dev mode (full stack)
npm run tauri dev
```

### Testing

```bash
# Run frontend tests
npm run test

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage

# Run Rust tests
cd src-tauri && cargo test
```

### Building

```bash
# Build for production (creates DMG)
npm run tauri build

# The DMG will be in:
# src-tauri/target/<arch>-apple-darwin/release/bundle/dmg/
```

### Code Quality

```bash
# Type check (not available in current config)
# Use build instead for type checking
npm run build
```

## 🔄 CI/CD

This project uses GitHub Actions for automated builds:

- **Automated Testing**: Tests run on every push and pull request
- **DMG Building**: macOS DMGs are built automatically on releases
- **Multi-Architecture Support**: Separate builds for Intel (x86_64) and Apple Silicon (arm64)
- **Universal Binary**: A universal DMG supporting both architectures is created automatically

See [`.github/workflows/build-macos.yml`](.github/workflows/build-macos.yml) for the workflow configuration.

## 📊 Database Schema

The app uses SQLite with the following main tables:

- `papers` - Paper metadata, AI analysis results, and local file paths (PDF/LaTeX)
- `collections` - User-created collections
- `paper_collections` - Many-to-many relationship between papers and collections
- `fetch_history` - History of paper fetches
- `topics` - Research topics for filtering
- `settings` - Application settings including storage paths, API keys, and analysis configuration

## 🐛 Troubleshooting

### Schedule not working

- Check that you've granted necessary permissions in **System Preferences** > **Privacy & Security** > **Automation**
- Verify the schedule time format is correct (HH:MM)
- Check that topics are configured with ArXiv categories
- View the console log for detailed error messages

### API errors

- Verify your API key is correct
- Check that you have sufficient API quota
- Ensure network connectivity to the LLM provider
- Try switching to a different LLM provider

### Build errors

- Ensure Xcode Command Line Tools are installed: `xcode-select --install`
- Verify Rust is up to date: `rustup update`
- Clear build cache: `rm -rf src-tauri/target node_modules`
- Reinstall dependencies: `npm install`

### Paper analysis issues

- Check that the paper has successfully fetched from ArXiv
- Verify your API key has available quota
- Some papers may not have full text available for analysis
- Check the console for detailed LLM response errors
- Try re-analyzing with a different mode or language

## 🗺️ Roadmap

### Recently Completed ✨

- [x] **Faster Paper Analysis** - HTML-first content extraction for faster, more reliable analysis
- [x] **Smarter Content Filtering** - Automatically excludes References, Appendix, and other non-essential sections
- [x] **More Reliable Retry** - Automatic LLM response caching prevents wasting API credits on failures
- [x] PDF download and preview - Download PDFs locally and open in system default viewer
- [x] Configurable storage paths - Set custom paths for LaTeX and PDF downloads
- [x] Sort state persistence - Remember user's sort preferences across navigation
- [x] Collection indicator badges - Visual indicators for papers in collections
- [x] Collection quick filter - Fast filter to show only papers in collections
- [x] Analysis language selection - Choose Chinese or English for AI analysis output
- [x] Optimized paper card layout - Improved grid view with better overflow handling

### Upcoming Features 🎯

#### 📊 Research Progress Dashboard
Visual analytics for your research journey
- Weekly/monthly reading statistics with time tracking
- Topic distribution charts showing research focus areas
- Trend analysis comparing reading activity over time
- Hot topic tracking with paper count visualization
- Personal research velocity and productivity metrics

#### 🔍 Semantic Search
Natural language search powered by local embeddings
- Search using natural language queries (e.g., "transformer applications in RL")
- Support for mixed Chinese-English queries
- Local vector embeddings for privacy protection
- Semantic similarity ranking beyond keyword matching
- Context-aware result highlighting

#### ⚡ Quick Compare Mode
Side-by-side paper comparison for efficient evaluation
- Multi-paper comparison table with key metrics
- Novelty scores, methodology, datasets side by side
- One-click export to LaTeX/Markdown tables
- Visual diff for algorithm flows and formulas
- Customizable comparison dimensions

#### 🎯 Smart Recommendations
Personalized paper suggestions based on your behavior
- Reading history analysis to recommend similar papers
- Collection-based content recommendations
- Citation graph traversal for related work discovery
- Preference learning from scoring patterns
- Multi-factor ranking (relevance + novelty + impact)

#### 📚 Deep Reading Workspace
Integrated environment for focused paper study
- Split-view with AI summary and annotations always visible
- In-app PDF highlighting and note-taking
- AI Q&A chat mode based on paper content
- Note export to Markdown/Notion/Obsidian
- One-click access to citation/reference papers

#### 📝 Literature Review Generator
AI-assisted review paper creation
- Auto-generate review from collections or topics
- Organize by timeline, methodology, or themes
- Extract and synthesize key conclusions
- Auto-create comparison tables and figures
- Export to publication-ready LaTeX/Markdown

### In Progress 🚧

- [ ] Conference deadline tracker - Major conference deadlines with submission reminders
- [ ] Smart deduplication - Merge ArXiv preprints with published versions
- [ ] Export papers to BibTeX/EndNote/Zotero
- [ ] Advanced search with boolean operators
- [ ] Custom AI prompts for analysis

### Planned Features 📋

- [ ] Citation graph and related papers
- [ ] Cloud sync for collections and settings
- [ ] Plugins system for custom analysis
- [ ] Additional language support (Japanese, Korean, etc.)
- [ ] Paper ranking by impact factor
- [ ] Automatic citation extraction
- [ ] Reference management integration

### Under Consideration 💭

- [ ] Windows and Linux support
- [ ] Collaboration features (shared collections)
- [ ] Mobile companion app
- [ ] Web-based version

## 🤝 Contributing

Contributions are welcome! Please feel free to submit issues and pull requests.

### Development Workflow

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Commit: `git commit -m 'Add amazing feature'`
5. Push: `git push origin feature/amazing-feature`
6. Open a Pull Request

### Code Style

- Follow the existing code style
- Use TypeScript strict mode
- Write tests for new features
- Update documentation as needed
- Ensure i18n keys are added for any new UI text

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Tauri](https://tauri.app/) - Framework for building desktop applications with web technologies
- [React](https://react.dev/) - The library for web and native user interfaces
- [ArXiv](https://arxiv.org/) - Open access to scholarly articles
- [Lucide](https://lucide.dev/) - Beautiful & consistent icon toolkit
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS framework
- [Mermaid](https://mermaid.js.org/) - Diagram generation
- [KaTeX](https://katex.org/) - Fast web-ready LaTeX math rendering
- [GLM (ZhipuAI)](https://open.bigmodel.cn/) - AI model provider
- [Anthropic Claude](https://console.anthropic.com/) - AI model provider

## 📮 Contact

For questions, suggestions, or issues, please [open an issue](https://github.com/pillumina/paperfuse-desktop/issues) on GitHub.

---

<div align="center">

**Made with ❤️ by researchers, for researchers**

</div>
