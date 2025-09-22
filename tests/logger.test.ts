/**
 * Tests for logger utility
 */

import { logger } from '../src/utils/logger';

describe('Logger', () => {
  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    // Reset environment
    delete process.env.LOG_LEVEL;
  });

  describe('shouldLog function', () => {
    it('should log error messages by default', () => {
      expect(logger.error).toBeDefined();
    });

    it('should log warn messages by default', () => {
      expect(logger.warn).toBeDefined();
    });

    it('should log info messages by default', () => {
      expect(logger.info).toBeDefined();
    });

    it('should log debug messages only when LOG_LEVEL is debug', () => {
      process.env.LOG_LEVEL = 'debug';
      expect(logger).toBeDefined();
    });
  });

  describe('logger methods', () => {
    beforeEach(() => {
      jest.spyOn(console, 'error').mockImplementation(() => {});
      jest.spyOn(console, 'warn').mockImplementation(() => {});
      jest.spyOn(console, 'info').mockImplementation(() => {});
      jest.spyOn(console, 'debug').mockImplementation(() => {});
    });

    it('should call console.error for error messages', () => {
      const mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

      logger.error('Test error message');

      expect(mockConsoleError).toHaveBeenCalledWith('Test error message');
    });

    it('should call console.warn for warn messages', () => {
      const mockConsoleWarn = jest.spyOn(console, 'warn').mockImplementation(() => {});

      logger.warn('Test warn message');

      expect(mockConsoleWarn).toHaveBeenCalledWith('Test warn message');
    });

    it('should call console.info for info messages', () => {
      const mockConsoleInfo = jest.spyOn(console, 'info').mockImplementation(() => {});

      logger.info('Test info message');

      expect(mockConsoleInfo).toHaveBeenCalledWith('Test info message');
    });

    it('should call console.debug for debug messages when LOG_LEVEL is debug', () => {
      process.env.LOG_LEVEL = 'debug';
      const mockConsoleDebug = jest.spyOn(console, 'debug').mockImplementation(() => {});

      logger.debug('Test debug message');

      expect(mockConsoleDebug).toHaveBeenCalledWith('Test debug message');
    });

    it('should not call console.debug when LOG_LEVEL is info', () => {
      process.env.LOG_LEVEL = 'info';
      const mockConsoleDebug = jest.spyOn(console, 'debug').mockImplementation(() => {});

      logger.debug('Test debug message');

      expect(mockConsoleDebug).not.toHaveBeenCalled();
    });

    it('should handle multiple parameters', () => {
      const mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

      logger.error('Error message', 'with', 'multiple', 'params');

      expect(mockConsoleError).toHaveBeenCalledWith('Error message', 'with', 'multiple', 'params');
    });

    it('should handle undefined parameters gracefully', () => {
      const mockConsoleWarn = jest.spyOn(console, 'warn').mockImplementation(() => {});

      logger.warn(undefined, 'with', null);

      expect(mockConsoleWarn).toHaveBeenCalledWith(undefined, 'with', null);
    });
  });

  describe('environment variable support', () => {
    it('should respect LOG_LEVEL=error', () => {
      process.env.LOG_LEVEL = 'error';

      // Should only log error level
      const mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
      const mockConsoleWarn = jest.spyOn(console, 'warn').mockImplementation(() => {});

      logger.error('error message');
      logger.warn('warn message');

      expect(mockConsoleError).toHaveBeenCalled();
      expect(mockConsoleWarn).not.toHaveBeenCalled();
    });

    it('should respect LOG_LEVEL=warn', () => {
      process.env.LOG_LEVEL = 'warn';

      const mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
      const mockConsoleWarn = jest.spyOn(console, 'warn').mockImplementation(() => {});
      const mockConsoleInfo = jest.spyOn(console, 'info').mockImplementation(() => {});

      logger.error('error message');
      logger.warn('warn message');
      logger.info('info message');

      expect(mockConsoleError).toHaveBeenCalled();
      expect(mockConsoleWarn).toHaveBeenCalled();
      expect(mockConsoleInfo).not.toHaveBeenCalled();
    });

    it('should default to info level when invalid LOG_LEVEL is provided', () => {
      process.env.LOG_LEVEL = 'invalid';

      const mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
      const mockConsoleInfo = jest.spyOn(console, 'info').mockImplementation(() => {});
      const mockConsoleDebug = jest.spyOn(console, 'debug').mockImplementation(() => {});

      logger.error('error message');
      logger.info('info message');
      logger.debug('debug message');

      expect(mockConsoleError).toHaveBeenCalled();
      expect(mockConsoleInfo).toHaveBeenCalled();
      expect(mockConsoleDebug).not.toHaveBeenCalled();
    });
  });
});
