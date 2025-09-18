# Implementation Plan: AI Code Reviewer

**Branch**: `001-ai-code-reviewer-20250913` | **Date**: 2025-09-13 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-ai-code-reviewer/spec.md`

## Summary
Implement an AI-powered code reviewer for AstraForge that integrates with VS Code's Git extension to provide intelligent code analysis, suggestions, and quality tracking using multi-LLM collaboration and the existing vector database infrastructure.

## Technical Context
**Language/Version**: TypeScript 5.1+  
**Primary Dependencies**: VS Code API, existing LLMManager, VectorDB, GitManager  
**Storage**: Vector DB for code embeddings and patterns, File system for preferences  
**Testing**: Jest with 85% coverage requirement  
**Target Platform**: VS Code Extension (AstraForge)  
**Project Type**: single (extension enhancement)  
**Performance Goals**: <2s analysis time, <100MB memory footprint  
**Constraints**: VS Code API limitations, LLM token limits, existing architecture integration  
**Scale/Scope**: Single workspace, multiple concurrent reviews, historical data retention

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Simplicity**:
- Projects: 1 (enhancing existing AstraForge extension) ✅
- Using framework directly: Yes (VS Code API, existing managers) ✅
- Single data model: Yes (unified review data structure) ✅
- Avoiding patterns: Yes (no unnecessary abstractions) ✅

**Architecture**:
- Every feature as library: Yes (CodeReviewManager as standalone library) ✅
- Libraries: [CodeReviewManager: AI-powered code analysis and suggestion engine]
- CLI per library: [code-review --analyze, --metrics, --history] ✅
- Library docs planned: Yes (llms.txt format) ✅

**Testing (NON-NEGOTIABLE)**:
- RED-GREEN-Refactor enforced: Yes (TDD mandatory) ✅
- Tests before implementation: Yes (contract tests first) ✅
- Order followed: Contract→Integration→E2E→Unit ✅
- Real dependencies used: Yes (actual VS Code API, real LLMs) ✅
- Integration tests planned: Yes (Git integration, LLM responses, UI updates) ✅

**Observability**:
- Structured logging included: Yes (review sessions, performance metrics) ✅
- Error context sufficient: Yes (analysis failures, LLM errors, user actions) ✅

**Versioning**:
- Version assigned: 1.1.0 (minor feature addition to AstraForge) ✅
- BUILD increments planned: Yes (each commit increments build) ✅
- Breaking changes handled: No breaking changes (pure addition) ✅

**Violations**: None - full constitutional compliance ✅

## Project Structure

### Documentation (this feature)
```
specs/001-ai-code-reviewer/
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0 output (/plan command)
├── data-model.md        # Phase 1 output (/plan command)
├── quickstart.md        # Phase 1 output (/plan command)
├── contracts/           # Phase 1 output (/plan command)
└── tasks.md             # Phase 2 output (/tasks command - NOT created by /plan)
```

### Source Code (repository root)
```
src/
├── code-review/         # NEW: AI code review functionality
│   ├── codeReviewManager.ts     # Main review orchestration
│   ├── analysisEngine.ts        # Multi-LLM analysis coordination
│   ├── suggestionProcessor.ts   # Suggestion categorization and ranking
│   ├── qualityTracker.ts        # Metrics and historical tracking
│   └── reviewUI.ts              # VS Code UI integration
├── providers/           # EXISTING: Add code review provider
│   └── codeReviewProvider.ts    # NEW: VS Code webview provider
tests/
├── contract/            # Contract tests for review APIs
├── integration/         # Git integration, LLM integration tests
└── unit/               # Individual component tests
```

## Phase 0: Outline & Research

**Research Tasks**:

**R001**: Research VS Code Git API integration patterns
- Rationale: Need to hook into file change detection and Git workflow
- Alternatives: File system watchers, manual triggers, Git hooks
- Decision: Use VS Code's Git extension API for seamless integration with existing workflow

**R002**: Research LLM prompt engineering for code analysis
- Rationale: Different LLMs excel at different types of code analysis
- Alternatives: Single model approach, ensemble methods, specialized prompts per model
- Decision: Multi-prompt strategy with model-specific strengths (OpenAI for bugs, Anthropic for architecture, xAI for performance)

**R003**: Research code quality metrics and industry standards
- Rationale: Need standardized, meaningful metrics for tracking improvement
- Alternatives: Custom metrics, industry standards (SonarQube, CodeClimate), hybrid approach
- Decision: Hybrid approach using established metrics (cyclomatic complexity, maintainability index) enhanced with AI-generated insights

**R004**: Research VS Code extension UI patterns for code suggestions
- Rationale: Need intuitive, non-intrusive way to display suggestions
- Alternatives: Sidebar panel, inline decorations, hover providers, diagnostic collections
- Decision: Combination approach - diagnostics for inline markers, sidebar for detailed suggestions, hover for quick previews

## Phase 1: Design & Contracts

*Prerequisites: research.md complete*

1. **Data Model**: Define unified data structures for CodeReview, Suggestion, QualityMetric, ReviewSession, and UserPreference entities with proper relationships and validation rules

2. **API Contracts**:
   - POST /analyze-code: Trigger analysis for specific files or changesets
   - GET /suggestions/{reviewId}: Retrieve suggestions for a review session  
   - POST /feedback: Submit user feedback on suggestions
   - GET /metrics: Retrieve quality metrics and trends
   - GET /history: Access historical review data

3. **Contract Tests**:
   - Test analysis request/response schemas
   - Test suggestion data structures and validation
   - Test metrics calculation and aggregation
   - Test user preference persistence and retrieval

4. **Test Scenarios**:
   - Integration test: Full code review workflow from file change to suggestion display
   - Integration test: Multi-LLM analysis coordination and result merging
   - Integration test: Quality metric calculation and historical tracking
   - Integration test: User feedback processing and learning adaptation

5. **Quickstart**: Step-by-step validation guide for manual testing of core review workflow, suggestion display, and metrics tracking

## Phase 2: Task Planning Approach
*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:
- Load design documents (contracts, data model, quickstart)
- Generate contract test tasks for each API endpoint [P]
- Generate model creation tasks for each entity [P]  
- Generate integration test tasks for each user scenario
- Generate implementation tasks following TDD order

**Ordering Strategy**:
- TDD order: Tests before implementation
- Dependency order: Models → Services → UI → Integration
- Mark [P] for parallel execution (independent files)

**Estimated Output**: 18-22 numbered, ordered tasks following constitutional TDD principles

## Progress Tracking
*This checklist is updated during execution flow*

**Phase Status**:
- [x] Phase 0: Research complete (/plan command)
- [x] Phase 1: Design complete (/plan command)  
- [x] Phase 2: Task planning complete (/plan command - describe approach only)
- [ ] Phase 3: Tasks generated (/tasks command)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS
- [x] Post-Design Constitution Check: PASS  
- [x] All NEEDS CLARIFICATION resolved
- [x] Complexity deviations documented: None

---
*Based on AstraForge Constitution v1.0.0 - See `/memory/constitution.md`*
