# ADR 002: Testing Interface Design

**Date**: 2025-01-06  
**Status**: Accepted  
**Context**: Need for dedicated interface to test LLM APIs, vector queries, and workflows without running the full extension.

## Decision

Implement a hybrid CLI/UI testing interface with the following architecture:

### Core Components

1. **CLI Interface** (`src/testing/apiTester.ts`)
   - Command-line tool for batch testing
   - JSON output for automation
   - Benchmarking capabilities (latency, throughput)
   - Support for multiple API providers

2. **UI Interface** (`src/testing/apiTesterProvider.ts`)
   - VS Code webview panel for interactive testing
   - Encrypted API key storage
   - Real-time response display
   - Visual feedback and error handling

3. **Shared Core** (`src/testing/apiTesterCore.ts`)
   - Common API testing logic
   - Reuse existing LLM libraries
   - Unified error handling and logging

### Design Principles

- **Modularity**: Separate CLI and UI, shared core
- **Reusability**: Leverage existing `llmManager.ts` and `vectorDB.ts`
- **Security**: Encrypted API key storage
- **Performance**: Async operations, parallel testing
- **Hardware Optimization**: Leverage 128GB RAM for batch operations

### Wireframes

#### CLI Interface
```bash
astraforge test --api openai --prompt "Test prompt" --key YOUR_KEY
astraforge test --api openrouter --model gpt-4 --batch prompts.txt
astraforge test --vector --query "similar documents" --topk 5
```

#### UI Interface
```
┌─────────────────────────────────────┐
│ AstraForge API Tester              │
├─────────────────────────────────────┤
│ API Provider: [OpenAI ▼]           │
│ API Key: [••••••••••••••••] [Test] │
│ Model: [gpt-4 ▼]                   │
├─────────────────────────────────────┤
│ Prompt:                            │
│ [Enter your test prompt here...]   │
├─────────────────────────────────────┤
│ [Test Single] [Test Batch] [Clear] │
├─────────────────────────────────────┤
│ Results:                            │
│ ┌─────────────────────────────────┐ │
│ │ Response: "Test response..."   │ │
│ │ Latency: 245ms                 │ │
│ │ Status: ✅ Success             │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

### Integration Points

1. **Extension Registration**: Add command `astraforge.testAPIs`
2. **Existing Managers**: Extend `LLMManager` with test mode
3. **Vector DB**: Add query testing capabilities
4. **Workflow Simulation**: Mock phase execution for testing

### Security Considerations

- API keys encrypted in VS Code settings
- No key logging in console output
- Secure key validation before testing
- Rate limiting for API calls

### Performance Targets

- CLI: <100ms startup, <500ms per test
- UI: <200ms response display
- Batch: Parallel processing for multiple tests
- Memory: Efficient handling of large response sets

## Consequences

### Positive
- Immediate testing capability without full extension
- Automated testing for CI/CD pipelines
- Better debugging and development experience
- Hardware-optimized performance

### Risks
- Additional complexity in extension
- Security considerations for API keys
- Potential rate limiting from APIs

### Mitigation
- Modular design minimizes complexity
- Encrypted key storage
- Rate limiting and retry logic
