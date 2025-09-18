export interface RetryOptions {
  retries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
}

export async function withRetry<T>(fn: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const retries = options.retries ?? 3;
  const base = options.baseDelayMs ?? 300;
  const max = options.maxDelayMs ?? 3000;

  let attempt = 0;
  let lastError: unknown;

  while (attempt <= retries) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt === retries) break;
      const jitter = Math.random() * base;
      const delay = Math.min(max, base * Math.pow(2, attempt)) + jitter;
      await new Promise(res => setTimeout(res, delay));
      attempt += 1;
    }
  }
  throw lastError as Error;
}
