# Tasks: {{FEATURE_NAME}}

**Input**: Design documents from `/specs/{{FEATURE_DIR}}/`
**Prerequisites**: plan.md (required), research.md, data-model.md, contracts/

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions

## Phase 3.1: Setup
{{SETUP_TASKS}}

## Phase 3.2: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.3
**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**
{{TEST_TASKS}}

## Phase 3.3: Core Implementation (ONLY after tests are failing)
{{IMPLEMENTATION_TASKS}}

## Phase 3.4: Integration
{{INTEGRATION_TASKS}}

## Phase 3.5: Polish
{{POLISH_TASKS}}

## Dependencies
{{DEPENDENCIES}}

## Parallel Execution Groups
{{PARALLEL_GROUPS}}

## Task Validation
*GATE: Checked by main() before returning*

{{VALIDATION_CHECKLIST}}

## Notes
- [P] tasks = different files, no dependencies
- Verify tests fail before implementing
- Commit after each task
- Avoid: vague tasks, same file conflicts
