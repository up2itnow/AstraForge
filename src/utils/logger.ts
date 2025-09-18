/**
 * Lightweight logger wrapper to centralize logging and avoid console.* lint warnings.
 * Allows level-based filtering via LOG_LEVEL env (error|warn|info|debug).
 */

type LogLevel = 'error' | 'warn' | 'info' | 'debug';

const levelOrder: Record<LogLevel, number> = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

const envLevel = (process.env.LOG_LEVEL as LogLevel) || 'info';
const currentLevel = levelOrder[envLevel] ?? levelOrder.info;

function shouldLog(level: LogLevel): boolean {
  return levelOrder[level] <= currentLevel;
}

export const logger = {
  error(message?: unknown, ...optionalParams: unknown[]): void {
    if (shouldLog('error')) {
      // eslint-disable-next-line no-console, @typescript-eslint/no-explicit-any
      console.error(message as any, ...optionalParams as any[]);
    }
  },
  warn(message?: unknown, ...optionalParams: unknown[]): void {
    if (shouldLog('warn')) {
      // eslint-disable-next-line no-console, @typescript-eslint/no-explicit-any
      console.warn(message as any, ...optionalParams as any[]);
    }
  },
  info(message?: unknown, ...optionalParams: unknown[]): void {
    if (shouldLog('info')) {
      // eslint-disable-next-line no-console, @typescript-eslint/no-explicit-any
      console.log(message as any, ...optionalParams as any[]);
    }
  },
  debug(message?: unknown, ...optionalParams: unknown[]): void {
    if (shouldLog('debug')) {
      // eslint-disable-next-line no-console, @typescript-eslint/no-explicit-any
      console.debug(message as any, ...optionalParams as any[]);
    }
  },
};


