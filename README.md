# AstraForge IDE

> **AI-powered self-improving IDE extension for turning ideas into applications
> with LLM panels**

[![CI/CD Pipeline](https://github.com/username/AstraForge/actions/workflows/ci.yml/badge.svg)](https://github.com/username/AstraForge/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Overview

AstraForge IDE is a revolutionary VS Code extension that transforms project
ideas into fully functional applications using multi-agent LLM collaboration,
vector-based context retrieval, and automated workflow management. Built with
visionary AI principles, it embodies the future of autonomous development.

## Features

### ✅ Implemented Features

- **Multi-LLM Panel**: Support for OpenAI, Anthropic, xAI (Grok), and OpenRouter
  with modular provider architecture
- **Modular Architecture**: Clean provider interface for easy addition of new
  LLM APIs
- **Request Caching**: LLM response caching with TTL and throttling to optimize
  performance
- **Parallel Processing**: Concurrent LLM requests with configurable limits
  using Promise.all
- **Input Security**: Comprehensive input validation and sanitization for all
  user inputs
- **Lazy Loading**: Optimized VS Code extension activation with on-demand module
  loading
- **Git Integration**: Basic automated commits and version control
- **Workflow Foundation**: Phase-based development structure (Planning →
  Prototyping → Testing → Deployment)
- **Configuration Management**: Environment-based configuration with .env
  support
- **Code Quality**: ESLint + Prettier configuration with TypeScript best
  practices
- **CI/CD Pipeline**: GitHub Actions for automated testing, linting, and
  deployment
- **Semantic Versioning**: Conventional commits with automated changelog
  generation

### 🚧 In Development

- **Vector Context**: Smart context retrieval using vector embeddings (basic
  implementation exists)
- **Enhanced Workflow**: Advanced phased development with user oversight and
  feedback
- **LLM Voting System**: Multi-agent consensus building for decision making
- **Reinforcement Learning**: Workflow optimization based on user feedback
- **Testing Framework**: Comprehensive unit and integration test coverage
- **Performance Optimization**: Vector DB indexing and advanced caching
  strategies

### 📋 Planned Features

- **LanceDB Integration**: Short-term session memory separation from long-term
  storage
- **PostgreSQL Support**: Long-term persistent memory storage
- **Real-time Collaboration**: WebSocket-based multi-user development sessions
- **Advanced Security**: Secret scanning, API key encryption, and audit trails
- **VS Code Marketplace**: Official extension publication with marketplace
  features
- **Documentation**: Complete API docs, ADRs, and contributor guides
- **Analytics**: Usage metrics, performance monitoring, and user behavior
  insights

## Quick Start

### Prerequisites

- VS Code 1.80.0 or higher
- Node.js 18.x or 20.x
- Git configured in your system

### Installation

1. **Clone the repository**:

   ```bash
   git clone https://github.com/username/AstraForge.git
   cd AstraForge
   ```

2. **Install dependencies**:

   ```bash
   npm install
   ```

3. **Build the extension**:

   ```bash
   npm run compile
   ```

4. **Load in VS Code**:
   - Press `F5` to run the extension in a new Extension Development Host window
   - Or install the `.vsix` package from releases

### Configuration

1. **Setup Environment Variables**:

   ```bash
   cp .env.example .env
   # Edit .env and add your API keys
   ```

2. **Setup LLM Panel**:
   - Open Command Palette (`Ctrl+Shift+P`)
   - Run "AstraForge: Setup LLM Panel"
   - Configure 3-5 LLMs with your API keys from different providers for optimal
     collaboration

3. **Configure Performance Settings**:
   ```bash
   # In your .env file
   MAX_CONCURRENT_REQUESTS=3
   ENABLE_REQUEST_CACHING=true
   CACHE_TTL=3600
   ```

## Usage

### Basic Workflow

1. **Idea Submission**: Describe your project in natural language
2. **LLM Conference**: Multiple AI agents discuss and refine the concept
3. **Phased Execution**: Automated development through structured phases
4. **User Oversight**: Review and approve suggestions at key decision points
5. **Continuous Improvement**: System learns and optimizes from feedback

### Advanced Features

- **Custom Refinements**: Provide specific instructions for complex requirements
- **Innovation Suggestions**: AI proposes cutting-edge enhancements
- **Vector Context**: Intelligent retrieval of relevant project information
- **Archive Management**: Automatic cleanup and organization of project
  artifacts

## Development

### Project Structure

```
AstraForge/
├── src/                    # Source code
│   ├── extension.ts       # Main extension entry point
│   ├── providers/         # UI providers (setup, ignition)
│   ├── llm/              # LLM management and APIs
│   ├── db/               # Vector database implementation
│   ├── workflow/         # Workflow and phase management
│   └── git/              # Git integration utilities
├── tests/                # Test suites
├── media/                # Extension assets
├── archive/              # Archived/deprecated files
└── docs/                 # Documentation
```

### Scripts

- `npm run compile` - Build TypeScript
- `npm run watch` - Watch mode for development
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix linting issues
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check code formatting
- `npm run type-check` - TypeScript type checking without compilation
- `npm test` - Run tests
- `npm run test:coverage` - Run tests with coverage
- `npm run test:watch` - Run tests in watch mode
- `npm run package` - Package extension as VSIX
- `npm run clean` - Clean build artifacts

### Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Quality

- **Complexity**: Max cyclomatic complexity of 10
- **Coverage**: Minimum 85% test coverage
- **Linting**: ESLint with TypeScript support
- **Architecture**: Modular design with clear separation of concerns

## Roadmap

### Phase 1: Foundation ✅

- [x] Project restructuring and cleanup
- [x] Core extension architecture
- [x] Multi-LLM provider support
- [x] Basic workflow management

### Phase 2: Core Functionality (In Progress)

- [ ] Enhanced AI collaboration features
- [ ] Real vector embedding integration
- [ ] Reinforcement learning for workflow optimization
- [ ] Advanced multi-agent isolation

### Phase 3: Testing and Documentation

- [ ] Comprehensive test suite (85% coverage target)
- [ ] API documentation and ADRs
- [ ] Security auditing and key encryption

### Phase 4: Deployment and Iteration

- [ ] VS Code Marketplace publication
- [ ] Feedback loop implementation
- [ ] WebSocket collaboration features
- [ ] Performance optimization

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file
for details.

## Acknowledgments

- Built with the vision of autonomous AI development
- Inspired by the future of human-AI collaboration
- Powered by cutting-edge LLM technology

---

*"The future of coding is not about replacing developers, but about amplifying human creativity through AI collaboration."* - AstraForge Vision

### Line endings

This repository enforces consistent line endings via `.gitattributes`. Most text files use LF; Windows scripts use CRLF.

```gitattributes
* text=auto eol=lf
*.ps1 text eol=crlf
*.cmd text eol=crlf
*.bat text eol=crlf
*.sh text eol=lf
```
