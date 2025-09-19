/**
 * Jest setup configuration
 */

// Set test environment
process.env.NODE_ENV = 'test';

// Mock VS Code API
jest.mock('vscode', () => ({
  workspace: {
    getConfiguration: jest.fn(() => ({
      get: jest.fn((key: string) => {
        if (key === 'llmPanel') {
          return [
            {
              provider: 'openai',
              model: 'gpt-3.5-turbo',
              role: 'primary'
            }
          ];
        }
        if (key === 'maxConcurrentRequests') {
          return 3;
        }
        return undefined;
      }),
    })),
    workspaceFolders: [{ uri: { fsPath: '/test' } }],
    fs: {
      createDirectory: jest.fn(),
      writeFile: jest.fn(),
      readFile: jest.fn(),
    },
  },
  window: {
    showInformationMessage: jest.fn(),
    showErrorMessage: jest.fn(),
    showWarningMessage: jest.fn(),
    showQuickPick: jest.fn(),
    showInputBox: jest.fn(),
    showTextDocument: jest.fn(),
  },
  Uri: {
    file: jest.fn((path: string) => ({ fsPath: path })),
  },
}), { virtual: true });

// Mock console methods to reduce noise during testing
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Set up global test timeout
jest.setTimeout(30000);

// Mock VS Code environment
Object.defineProperty(global, 'acquireVsCodeApi', {
  value: () => ({
    getState: jest.fn(),
    setState: jest.fn(),
    postMessage: jest.fn(),
  }),
});

// Mock file system for testing
const mockFs = {
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
  existsSync: jest.fn(() => false),
  mkdirSync: jest.fn()
};

// Global mocks
(global as any).mockFs = mockFs;
