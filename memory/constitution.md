# AstraForge Development Constitution

## Core Principles

### I. AI-First Development
Every feature leverages AI collaboration for design, implementation, and optimization.
Multi-LLM panels provide diverse perspectives and reduce single-point-of-failure in decision making.
Vector-based context ensures decisions are informed by project history and best practices.

### II. Spec-Driven Development (NON-NEGOTIABLE)
Specifications are executable and directly generate implementations.
Requirements are validated through multi-agent collaboration before implementation begins.
Test-driven development is mandatory: Red-Green-Refactor cycle strictly enforced.

### III. Self-Improving Systems
Feedback loops capture user interactions and system performance.
Workflows adapt based on success patterns and failure analysis.
Knowledge base grows with each project, improving future recommendations.

### IV. Modular Architecture
Every feature starts as a standalone, testable library.
Clear separation of concerns with defined interfaces.
VS Code extension architecture supports pluggable components.

### V. Quality Gates (NON-NEGOTIABLE)
Constitution compliance checked at each phase.
Test coverage minimum 85% with real dependencies.
Performance benchmarks validated before deployment.
Security scans mandatory for external integrations.

## Simplicity Constraints
- Projects: 3 maximum (core extension, testing suite, documentation)
- Using framework directly (no wrapper classes unless justified)
- Single data model (no DTOs unless serialization differs)
- Avoiding patterns (no Repository/UoW without proven need)

## Architecture Requirements
- Every feature as library with CLI interface
- Text I/O protocol: stdin/args → stdout, errors → stderr
- Support JSON + human-readable formats
- Library documentation in llms.txt format

## Testing Standards (NON-NEGOTIABLE)
- TDD mandatory: Tests written → User approved → Tests fail → Then implement
- Red-Green-Refactor cycle strictly enforced
- Contract→Integration→E2E→Unit order followed
- Real dependencies used (actual DBs, not mocks)
- Integration tests for: new libraries, contract changes, shared schemas

## Observability
- Structured logging required
- Frontend logs → backend unified stream
- Error context sufficient for debugging
- Performance metrics captured

## Versioning & Breaking Changes
- MAJOR.MINOR.BUILD format
- BUILD increments on every change
- Breaking changes: parallel tests, migration plan
- Backward compatibility maintained where possible

**Version**: 1.0.0 | **Ratified**: 2025-09-13 | **Last Amended**: 2025-09-13
