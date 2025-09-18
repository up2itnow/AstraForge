// Jest setup file for global configurations
import 'jest';
// Global test timeout
jest.setTimeout(30000);
// Mock console methods to reduce noise in tests
global.console = {
    ...console,
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
};
// Mock file system for testing
const mockFs = {
    readFileSync: jest.fn(),
    writeFileSync: jest.fn(),
    existsSync: jest.fn(() => false),
    mkdirSync: jest.fn()
};
// Global mocks
global.mockFs = mockFs;
//# sourceMappingURL=setup.js.map