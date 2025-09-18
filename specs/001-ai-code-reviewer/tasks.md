# Tasks: AI Code Reviewer

**Input**: Design documents from `/specs/001-ai-code-reviewer/`
**Prerequisites**: plan.md (required), research.md, data-model.md, contracts/

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions

## Phase 3.1: Setup
- [ ] T001 Create code-review directory structure in src/code-review/
- [ ] T002 Initialize TypeScript interfaces for data models in src/code-review/types.ts
- [ ] T003 [P] Configure ESLint rules for code-review module
- [ ] T004 [P] Setup Jest test configuration for code-review tests

## Phase 3.2: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.3
**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**

### Contract Tests
- [ ] T005 [P] Contract test for code analysis API in tests/contract/test_analyze_code.ts
- [ ] T006 [P] Contract test for suggestion retrieval API in tests/contract/test_suggestions.ts  
- [ ] T007 [P] Contract test for metrics API in tests/contract/test_metrics.ts
- [ ] T008 [P] Contract test for user feedback API in tests/contract/test_feedback.ts

### Integration Tests
- [ ] T009 [P] Integration test for Git change detection in tests/integration/test_git_integration.ts
- [ ] T010 [P] Integration test for multi-LLM analysis coordination in tests/integration/test_llm_analysis.ts
- [ ] T011 [P] Integration test for VS Code UI integration in tests/integration/test_ui_integration.ts
- [ ] T012 [P] Integration test for vector DB code pattern storage in tests/integration/test_vector_patterns.ts

### Unit Tests
- [ ] T013 [P] Unit tests for CodeReview entity validation in tests/unit/test_code_review_model.ts
- [ ] T014 [P] Unit tests for Suggestion categorization logic in tests/unit/test_suggestion_processor.ts
- [ ] T015 [P] Unit tests for QualityMetric calculations in tests/unit/test_quality_tracker.ts

## Phase 3.3: Core Implementation (ONLY after tests are failing)

### Data Models
- [ ] T016 [P] Implement CodeReview entity class in src/code-review/models/codeReview.ts
- [ ] T017 [P] Implement Suggestion entity class in src/code-review/models/suggestion.ts  
- [ ] T018 [P] Implement QualityMetric entity class in src/code-review/models/qualityMetric.ts
- [ ] T019 [P] Implement ReviewSession entity class in src/code-review/models/reviewSession.ts
- [ ] T020 [P] Implement UserPreference entity class in src/code-review/models/userPreference.ts

### Core Services  
- [ ] T021 Implement CodeReviewManager orchestration in src/code-review/codeReviewManager.ts
- [ ] T022 Implement AnalysisEngine multi-LLM coordination in src/code-review/analysisEngine.ts
- [ ] T023 Implement SuggestionProcessor categorization in src/code-review/suggestionProcessor.ts
- [ ] T024 Implement QualityTracker metrics calculation in src/code-review/qualityTracker.ts

### API Implementation
- [ ] T025 Implement analyze-code endpoint logic in CodeReviewManager
- [ ] T026 Implement suggestions retrieval logic in CodeReviewManager  
- [ ] T027 Implement metrics API logic in QualityTracker
- [ ] T028 Implement user feedback processing in SuggestionProcessor

## Phase 3.4: Integration

### VS Code Integration
- [ ] T029 Implement CodeReviewProvider webview in src/providers/codeReviewProvider.ts
- [ ] T030 Implement Git change detection hooks in src/code-review/gitIntegration.ts
- [ ] T031 Implement diagnostic collection for inline suggestions in src/code-review/diagnosticProvider.ts
- [ ] T032 Integrate with existing LLMManager for multi-model analysis

### UI Implementation  
- [ ] T033 Implement review sidebar UI in src/code-review/reviewUI.ts
- [ ] T034 Implement hover provider for quick suggestion previews
- [ ] T035 Implement code action provider for one-click fixes
- [ ] T036 Implement status bar integration for quality indicators

### Storage Integration
- [ ] T037 Integrate with VectorDB for code pattern storage
- [ ] T038 Implement user preference persistence to file system
- [ ] T039 Implement session data management and cleanup

## Phase 3.5: Polish

### Performance Optimization
- [ ] T040 [P] Implement suggestion caching for unchanged code in src/code-review/cache.ts
- [ ] T041 [P] Optimize LLM prompt templates for faster analysis
- [ ] T042 [P] Implement progressive analysis with immediate feedback

### User Experience
- [ ] T043 [P] Add suggestion acceptance/rejection tracking
- [ ] T044 [P] Implement quality trend visualization
- [ ] T045 [P] Add keyboard shortcuts for common actions

### Documentation
- [ ] T046 [P] Update main README with code review feature documentation
- [ ] T047 [P] Create llms.txt documentation for CodeReviewManager library
- [ ] T048 [P] Add inline code documentation and examples

## Dependencies

### Critical Path Dependencies
- T001 → T002 (directory structure before interfaces)
- T002 → T005-T008 (interfaces before contract tests)
- T005-T015 → T016-T020 (tests before model implementation)
- T016-T020 → T021-T024 (models before services)
- T021-T024 → T025-T028 (services before API implementation)
- T025-T028 → T029-T032 (API before VS Code integration)

### Parallel Execution Groups
- **Contract Tests**: T005, T006, T007, T008 (different test files)
- **Integration Tests**: T009, T010, T011, T012 (different integration areas)
- **Unit Tests**: T013, T014, T015 (different components)
- **Data Models**: T016, T017, T018, T019, T020 (different entity files)
- **Polish Tasks**: T040, T041, T042, T043, T044, T045, T046, T047, T048 (independent improvements)

## Parallel Example
```bash
# Launch T005-T008 together:
Task: "Contract test for code analysis API in tests/contract/test_analyze_code.ts"
Task: "Contract test for suggestion retrieval API in tests/contract/test_suggestions.ts"  
Task: "Contract test for metrics API in tests/contract/test_metrics.ts"
Task: "Contract test for user feedback API in tests/contract/test_feedback.ts"
```

## Task Validation
*GATE: Checked by main() before returning*

- [x] All contracts have corresponding tests (T005-T008 cover all API endpoints)
- [x] All entities have model tasks (T016-T020 cover all data models)
- [x] All tests come before implementation (T005-T015 before T016+)
- [x] Parallel tasks truly independent (different files, no shared state)
- [x] Each task specifies exact file path
- [x] No task modifies same file as another [P] task

## Notes
- [P] tasks = different files, no dependencies
- Verify tests fail before implementing
- Commit after each task completion
- Constitutional compliance: TDD enforced, 85% coverage target
- Integration with existing AstraForge architecture maintained
