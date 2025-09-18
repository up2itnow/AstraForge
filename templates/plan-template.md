# Implementation Plan: {{FEATURE_NAME}}

**Branch**: `{{BRANCH_NAME}}` | **Date**: {{DATE}} | **Spec**: {{SPEC_LINK}}
**Input**: Feature specification from `/specs/{{FEATURE_DIR}}/spec.md`

## Summary
{{SUMMARY}}

## Technical Context
**Language/Version**: {{LANGUAGE}}
**Primary Dependencies**: {{DEPENDENCIES}}
**Storage**: {{STORAGE}}
**Testing**: {{TESTING}}
**Target Platform**: {{TARGET_PLATFORM}}
**Project Type**: {{PROJECT_TYPE}}
**Performance Goals**: {{PERFORMANCE_GOALS}}
**Constraints**: {{CONSTRAINTS}}
**Scale/Scope**: {{SCALE}}

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

{{CONSTITUTION_CHECK}}

## Project Structure

### Documentation (this feature)
```
specs/{{FEATURE_DIR}}/
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0 output (/plan command)
├── data-model.md        # Phase 1 output (/plan command)
├── quickstart.md        # Phase 1 output (/plan command)
├── contracts/           # Phase 1 output (/plan command)
└── tasks.md             # Phase 2 output (/tasks command - NOT created by /plan)
```

### Source Code (repository root)
{{PROJECT_STRUCTURE}}

## Phase 0: Outline & Research
{{RESEARCH_PHASE}}

## Phase 1: Design & Contracts
*Prerequisites: research.md complete*

{{DESIGN_PHASE}}

## Phase 2: Task Planning Approach
*This section describes what the /tasks command will do - DO NOT execute during /plan*

{{TASK_PLANNING}}

## Progress Tracking
*This checklist is updated during execution flow*

{{PROGRESS_TRACKING}}

---
*Based on AstraForge Constitution - See `/memory/constitution.md`*
