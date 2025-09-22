# Archive Directory

This directory contains deprecated, outdated, or one-time use files that have been moved from active development to maintain a clean codebase.

## Archive Structure
- `/src/` - Archived source code and scripts
- `/tests/` - Single-use or deprecated test files
- `/docs/` - Outdated documentation versions
- `/config/` - Deprecated configuration files
- `/scripts/` - One-time utility scripts
- `/rl/` - Experimental RL model variants
- `/deploy/` - Old deployment configurations

## Archive Log

### 2025-09-22 - Pre-Commit Cleanup
- **Files**: `eslint_*.txt` (multiple ESLint output files) → `archive/temp/`
  - **Reason**: Multiple debugging sessions for ESLint configuration
  - **Replacement**: Single consolidated ESLint configuration in `eslint.config.js`
  - **Status**: Safe to archive - debugging artifacts

- **File**: `src/llm/llmManager.ts.backup` → `archive/src/llmManager.ts.backup`
  - **Reason**: Backup file from LLM manager modifications
  - **Replacement**: Updated version in `src/llm/llmManager.ts`
  - **Status**: Safe to archive - superseded by active version

- **Directories**: `temp_folder/`, `test_invalid/` → `archive/temp/`
  - **Reason**: Temporary directories used for testing and data extraction
  - **Replacement**: Integrated functionality in main codebase
  - **Status**: Safe to archive - temporary test artifacts

- **Files**: `extraction_log.txt`, `test_prompts.txt`, `tatus` → `archive/temp/`
  - **Reason**: Log files and temporary test data from development
  - **Replacement**: Integrated logging and testing in main codebase
  - **Status**: Safe to archive - development artifacts

- **Directory**: `coverage/` → `archive/build/`
  - **Reason**: Test coverage reports from development
  - **Replacement**: Can be regenerated with `npm run test:coverage`
  - **Status**: Safe to archive - build artifacts

- **Files**: `scripts/run-codacy-tests.js`, `scripts/run-codacy-tests.js.map`, `scripts/run-codacy-tests.ts` → `archive/scripts/`
  - **Reason**: Duplicate script versions
  - **Replacement**: Main version `scripts/run-codacy-tests.cjs`
  - **Status**: Safe to archive - keep only main version

- **File**: `.codacy/logs/codacy-cli.log` → `archive/build/codacy-cli.log`
  - **Reason**: Codacy CLI execution log from development
  - **Replacement**: Can be regenerated with Codacy CLI
  - **Status**: Safe to archive - build artifact

### 2024-01-XX - Phase 3A Cleanup
- **File**: `temp_folder/extract_astraforge.py` → `archive/src/extract_astraforge_v1.py`
  - **Reason**: One-time extraction script used for initial project setup
  - **Replacement**: Automated workflow integration in `workflowManager.ts`
  - **Status**: Safe to archive - functionality superseded

- **File**: `temp_folder/response.txt` → `archive/src/initial_response_data.txt`
  - **Reason**: Initial project data used for extraction; no longer needed
  - **Replacement**: Dynamic data handling in LLM workflows
  - **Status**: Safe to archive - static data no longer relevant

## Retention Policy
- Archived files are retained for potential recovery needs
- Quarterly reviews to assess if archived items can be permanently removed
- All archive moves are documented with date, reason, and replacement info