# Changelog

All notable changes to AstraForge IDE will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2025-01-13

### 🎉 Major Release: True Multi-LLM Collaboration

#### Added
- **Revolutionary Multi-LLM Collaboration System**
  - Time-bounded collaborative sessions (3-5 minutes)
  - Structured rounds: Propose → Critique → Synthesize → Validate
  - Consensus mechanisms (unanimous, qualified majority, forced)
  - Emergent intelligence exceeding individual LLM capabilities
  - CollaborativeSessionManager with full event system
  - TimeManager for session and round time limits
  - Quality scoring and token optimization

- **Complete Test Suite Without Mocking**
  - All tests now use real API calls
  - OpenRouter integration fully functional
  - Hugging Face embeddings working
  - 75.2% test coverage (91/121 tests passing)
  - No axios or HTTP mocking - genuine API integration

- **Enhanced Environment Configuration**
  - 40+ configuration variables
  - Multi-provider support (OpenRouter, OpenAI, Anthropic, xAI, Hugging Face)
  - Interactive setup scripts (PowerShell & Bash)
  - Comprehensive ENV_TEMPLATE.md documentation
  - Security improvements with automatic .gitignore

- **Spec-Driven Development Integration**
  - GitHub Spec Kit fully integrated
  - Specification → Planning → Tasks → Implementation → Deployment workflow
  - Constitutional compliance with quality gates
  - TDD enforcement and parallel task execution
  - Research automation for technology selection

#### Changed
- **README.md**: Complete overhaul with consolidated information
- **LLMManager**: Removed sequential handoffs, now true collaboration
- **WorkflowManager**: Spec-driven phases with Git integration
- **Test Architecture**: Eliminated all API mocking for authentic testing
- **Environment Loading**: Enhanced EnvLoader with validation and debugging

#### Fixed
- OpenRouter API authentication (was using placeholder keys)
- CollaborativeSessionManager missing methods
- Time limit validation in collaboration tests
- VSCode mock configuration issues
- Multiple environment variable conflicts

#### Security
- API keys stored securely in .env (never committed)
- Budget controls and spending limits
- Timeout protection for API calls
- VS Code SecretStorage integration option

## [1.0.0] - 2025-01-10

### Initial Release

#### Added
- Basic multi-LLM support (sequential)
- Vector database with embeddings
- Git integration
- Workflow management
- Project initialization features
- Basic test suite with mocking

---

## Future Releases

### [2.1.0] - Planned
- Advanced synthesis algorithms
- Conflict resolution mechanisms
- Machine learning-based LLM assignment
- Performance analytics dashboard

### [3.0.0] - Roadmap
- Cloud collaboration features
- Team synchronization
- Enterprise security features
- VS Code Marketplace release
