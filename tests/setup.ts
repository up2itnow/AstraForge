/**
 * Jest setup configuration
 */

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
