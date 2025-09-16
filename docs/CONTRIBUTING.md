# Contributing to AstraForge IDE

Welcome to AstraForge! We're excited to have you contribute to the future of AI-powered development tools.

## 🚀 Quick Start

### Prerequisites

- **Node.js**: 18.x or 20.x (recommended)
- **VS Code**: 1.80.0 or higher
- **Git**: Latest version
- **API Keys**: At least one LLM provider (OpenAI, Anthropic, xAI, or OpenRouter)

### Development Setup

1. **Fork and Clone**
   ```bash
   git clone https://github.com/YOUR_USERNAME/AstraForge.git
   cd AstraForge
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Configure Environment**
   ```bash
   cp .env.example .env
   # Add your API keys to .env
   ```

4. **Build and Test**
   ```bash
   npm run compile
   npm run lint
   npm run test
   ```

5. **Launch in VS Code**
   - Press `F5` to run the extension in a new Extension Development Host window
   - Or use `Run > Start Debugging` from the menu

## 🏗️ Project Structure

```
AstraForge/
├── src/
│   ├── extension.ts          # Main extension entry point
│   ├── llm/                  # LLM provider management
│   │   ├── interfaces.ts     # Provider contracts
│   │   ├── llmManager.ts     # Main LLM orchestrator
│   │   ├── cache.ts          # Request caching and throttling
│   │   └── providers/        # Individual provider implementations
│   ├── workflow/             # Development workflow management
│   ├── db/                   # Vector database integration
│   ├── git/                  # Git operations
│   ├── providers/            # VS Code webview providers
│   ├── testing/              # API testing utilities
│   └── utils/                # Shared utilities
├── tests/                    # Test suites
├── media/                    # Extension assets
└── docs/                     # Documentation
```

## 🧪 Testing

### Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run in watch mode
npm run test:watch

# Run specific test file
npm test -- tests/llmManager.test.ts
```

### Writing Tests

- **Unit Tests**: Test individual components in isolation
- **Integration Tests**: Test component interactions
- **Mocking**: Use Jest mocks for external dependencies

Example test structure:
```typescript
describe('ComponentName', () => {
  beforeEach(() => {
    // Setup mocks and test data
  });

  describe('methodName', () => {
    it('should handle normal case', () => {
      // Test implementation
    });

    it('should handle error case', () => {
      // Error handling test
    });
  });
});
```

## 🔍 Code Quality

### Linting and Formatting

```bash
# Check linting
npm run lint

# Auto-fix linting issues
npm run lint:fix

# Format code
npm run format

# Check formatting
npm run format:check

# Type checking
npm run type-check
```

### Code Standards

- **TypeScript**: Strict mode enabled
- **ESLint**: Follow configured rules
- **Prettier**: Consistent formatting
- **JSDoc**: Document public APIs
- **Error Handling**: Always handle errors gracefully

### Complexity Limits

- **Cyclomatic Complexity**: Max 10 per function
- **Function Length**: Max 50 lines (warning)
- **File Length**: Keep modules focused and cohesive

## 🎯 Architecture Guidelines

### LLM Provider Development

When adding a new LLM provider:

1. **Implement the Interface**
   ```typescript
   export class NewProvider extends BaseLLMProvider {
     async query(prompt: string, config: LLMConfig): Promise<LLMResponse> {
       // Implementation
     }
     
     async validateConfig(config: LLMConfig): Promise<boolean> {
       // Validation logic
     }
     
     async getAvailableModels(config: LLMConfig): Promise<string[]> {
       // Model listing
     }
   }
   ```

2. **Register the Provider**
   ```typescript
   // In src/llm/providers/index.ts
   export const providerRegistry: Record<string, new () => LLMProvider> = {
     // ... existing providers
     NewProvider: NewProvider,
   };
   ```

3. **Add Tests**
   ```typescript
   describe('NewProvider', () => {
     // Comprehensive test coverage
   });
   ```

### Security Considerations

- **Input Validation**: Always validate user inputs
- **API Key Security**: Never log or expose API keys
- **Sanitization**: Clean all user-provided content
- **Rate Limiting**: Respect provider rate limits

### Performance Best Practices

- **Lazy Loading**: Load modules only when needed
- **Caching**: Cache expensive operations
- **Concurrency**: Use controlled parallelism
- **Memory Management**: Clean up resources properly

## 📝 Commit Guidelines

We use [Conventional Commits](https://conventionalcommits.org/) for automated versioning and changelog generation.

### Commit Format

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### Types

- **feat**: New feature
- **fix**: Bug fix
- **docs**: Documentation changes
- **style**: Code style changes (formatting, etc.)
- **refactor**: Code changes that neither fix a bug nor add a feature
- **perf**: Performance improvements
- **test**: Adding or updating tests
- **chore**: Maintenance tasks
- **ci**: CI/CD changes

### Examples

```bash
feat(llm): add support for Claude 3.5 Sonnet
fix(cache): resolve race condition in concurrent requests
docs(readme): update installation instructions
refactor(workflow): extract common phase logic
test(llm): add integration tests for provider validation
```

## 🔄 Pull Request Process

### Before Submitting

1. **Run Quality Checks**
   ```bash
   npm run lint
   npm run test:coverage
   npm run type-check
   ```

2. **Update Documentation**
   - Update README if adding features
   - Add JSDoc comments for new APIs
   - Update CHANGELOG if needed

3. **Test Thoroughly**
   - Manual testing in VS Code
   - Run full test suite
   - Test with multiple LLM providers

### PR Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] Tests added/updated
```

## 🐛 Debugging

### Extension Debugging

1. **Launch Debug Session**
   - Press `F5` in VS Code
   - Set breakpoints in TypeScript files
   - Use Developer Tools in the Extension Host

2. **View Logs**
   ```bash
   # Extension Host output
   View > Output > Extension Host

   # Debug console
   View > Debug Console
   ```

3. **Common Issues**
   - **Module not found**: Check import paths
   - **API errors**: Verify API keys and network
   - **Performance**: Use profiling tools

### LLM Provider Debugging

```typescript
// Enable debug logging
const provider = new OpenAIProvider();
provider.query(prompt, config).catch(error => {
  console.error('Provider error:', error);
  // Handle gracefully
});
```

## 📚 Resources

### Documentation

- [VS Code Extension API](https://code.visualstudio.com/api)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Jest Testing Framework](https://jestjs.io/docs/getting-started)

### LLM Provider APIs

- [OpenAI API Documentation](https://platform.openai.com/docs)
- [Anthropic API Documentation](https://docs.anthropic.com/)
- [xAI API Documentation](https://docs.x.ai/)
- [OpenRouter API Documentation](https://openrouter.ai/docs)

### Tools and Extensions

- **VS Code Extensions**: ESLint, Prettier, GitLens
- **Browser Tools**: React DevTools, Vue DevTools
- **Testing**: Jest Runner, Coverage Gutters

## 🤝 Community

### Getting Help

- **GitHub Issues**: Bug reports and feature requests
- **Discussions**: General questions and ideas
- **Discord**: Real-time community chat (coming soon)

### Code of Conduct

We are committed to providing a welcoming and inclusive environment. Please:

- Be respectful and professional
- Focus on constructive feedback
- Help others learn and grow
- Report inappropriate behavior

## 🎉 Recognition

Contributors are recognized in:

- **README**: Contributor list
- **Releases**: Release notes mention contributors
- **GitHub**: Contributor graphs and statistics

Thank you for contributing to AstraForge! Together, we're building the future of AI-assisted development. 🚀