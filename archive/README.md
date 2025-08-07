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