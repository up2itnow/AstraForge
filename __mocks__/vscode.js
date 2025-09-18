// Mock for VS Code API in Jest tests with real environment variable support

const dotenv = require('dotenv');
dotenv.config();

module.exports = {
  workspace: {
    getConfiguration: jest.fn((section) => {
      return {
        get: jest.fn((key, defaultValue) => {
          if (key === 'llmPanel') {
            const modelsEnv = process.env.OPENROUTER_MODELS_TO_USE;
            if (!modelsEnv) {
              return [];
            }
            const models = modelsEnv.split(',').map(model => model.trim());
            const panel = models.map((model, index) => ({
              provider: 'OpenRouter',
              key: process.env.OPENROUTER_API_KEY,
              model: model,
              role: index === 0 ? 'primary' : 'secondary'
            }));
            return panel;
          }
          return defaultValue;
        }),
        update: jest.fn()
      };
    }),
    workspaceFolders: [{ uri: { fsPath: '/test/workspace' } }],
    fs: {
      readFile: jest.fn(),
      writeFile: jest.fn(),
      createDirectory: jest.fn()
    }
  },
  window: {
    showErrorMessage: jest.fn(),
    showInformationMessage: jest.fn(),
    showWarningMessage: jest.fn(),
    showQuickPick: jest.fn(() => Promise.resolve('Apply suggestions')),
    showInputBox: jest.fn(() => Promise.resolve('test input')),
    showTextDocument: jest.fn(),
    createOutputChannel: jest.fn(() => ({
      appendLine: jest.fn(),
      show: jest.fn()
    }))
  },
  commands: {
    registerCommand: jest.fn(),
    executeCommand: jest.fn()
  },
  Uri: {
    file: jest.fn((path) => ({ fsPath: path, toString: () => path })),
    joinPath: jest.fn((...paths) => ({ fsPath: paths.join('/') }))
  },
  ExtensionContext: jest.fn(),
  ViewColumn: {
    One: 1,
    Two: 2,
    Three: 3
  },
  WebviewViewResolveContext: jest.fn(),
  CancellationToken: {
    isCancellationRequested: false,
    onCancellationRequested: jest.fn()
  }
};