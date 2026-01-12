# PaperFuse Desktop

<div align="center">

**A macOS desktop application for automated research paper discovery and AI-powered analysis**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![macOS](https://img.shields.io/badge/macOS-14%2B-blue)](https://github.com/pillumina/paperfuse-desktop)
[![Tauri](https://img.shields.io/badge/Tauri-2.0-FFC131?logo=tauri&logoColor=000)](https://tauri.app/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=000)](https://react.dev/)

[Features](#features) • [Installation](#installation) • [Quick Start](#quick-start) • [Development](#development)

</div>

---

## ✨ Features

### 📚 Paper Management
- **Automated Paper Fetching** - Fetch papers from ArXiv based on your research topics
- **Smart Filtering** - Papers are automatically scored and filtered by AI relevance
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

### 3. Add Research Topics

1. Go to **Settings** > **Topics**
2. Click **"Add Topic"**
3. Enter a topic name (e.g., "Machine Learning")
4. Add ArXiv categories (see [ArXiv taxonomy](https://arxiv.org/category_taxonomy))
   - Examples: `cs.AI`, `cs.LG`, `cs.CV`, `stat.ML`
5. Save

### 4. Fetch Papers

1. Click **"Fetch Papers"** on the home page
2. Select topics to fetch from
3. Choose analysis mode:
   - **Standard**: Quick analysis of introduction and conclusion
   - **Full**: Comprehensive analysis including algorithms, complexity, and flowcharts
4. Wait for papers to be fetched and analyzed
5. Browse results in list or grid view

### 5. Organize & Read

- **Create Collections** to group related papers
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
│   │   ├── arxiv.rs             # ArXiv API client
│   │   ├── commands/            # Tauri commands
│   │   ├── database/            # Database layer (SQLite)
│   │   ├── fetch.rs             # Fetch pipeline orchestration
│   │   ├── llm/                 # LLM client (GLM, Claude)
│   │   ├── latex_parser.rs      # LaTeX parsing for math and algorithms
│   │   ├── retry/               # Retry logic with exponential backoff
│   │   ├── scheduler/           # Scheduled fetch logic
│   │   └── types.rs             # Shared types
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

- `papers` - Paper metadata and analysis results
- `collections` - User-created collections
- `paper_collections` - Many-to-many relationship between papers and collections
- `fetch_history` - History of paper fetches
- `topics` - Research topics for filtering
- `settings` - Application settings

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

### Planned Features

- [ ] Export papers to BibTeX/EndNote/Zotero
- [ ] PDF annotation and highlighting
- [ ] Advanced search with boolean operators
- [ ] Citation graph and related papers
- [ ] Custom AI prompts for analysis
- [ ] Cloud sync for collections
- [ ] Plugins system
- [ ] Additional language support

### Under Consideration

- [ ] Windows and Linux support
- [ ] Collaboration features
- [ ] Integration with reference managers
- [ ] Mobile companion app

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
