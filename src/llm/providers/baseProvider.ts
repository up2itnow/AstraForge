/**
 * Base LLM Provider Implementation
 * Provides common functionality for all LLM providers
 */

import axios, { AxiosResponse } from 'axios';
import { LLMProvider, LLMConfig, LLMResponse } from '../interfaces';

export abstract class BaseLLMProvider implements LLMProvider {
  protected readonly timeout: number = 30000;
  protected readonly maxRetries: number = 3;

  abstract query(prompt: string, config: LLMConfig): Promise<LLMResponse>;
  abstract validateConfig(config: LLMConfig): Promise<boolean>;
  abstract getAvailableModels(config: LLMConfig): Promise<string[]>;

  /**
   * Make HTTP request with retry logic
   */
  protected async makeRequest(
    url: string,
    data: any,
    headers: Record<string, string>,
    retries: number = this.maxRetries
  ): Promise<AxiosResponse> {
    try {
      return await axios.post(url, data, {
        headers,
        timeout: this.timeout,
      });
    } catch (error: any) {
      if (retries > 0 && this.isRetryableError(error)) {
        await this.delay(1000 * (this.maxRetries - retries + 1));
        return this.makeRequest(url, data, headers, retries - 1);
      }
      throw error;
    }
  }

  /**
   * Check if error is retryable
   */
  protected isRetryableError(error: any): boolean {
    return (
      error.code === 'ECONNRESET' ||
      error.code === 'ETIMEDOUT' ||
      (error.response && [429, 502, 503, 504].includes(error.response.status))
    );
  }

  /**
   * Delay execution
   */
  protected delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Sanitize input prompt
   */
  protected sanitizePrompt(prompt: string): string {
    return prompt.trim().replace(/[\x00-\x1F\x7F]/g, '');
  }

  /**
   * Extract usage information from response
   */
  protected extractUsage(response: any): LLMResponse['usage'] {
    if (response.usage) {
      return {
        promptTokens: response.usage.prompt_tokens || 0,
        completionTokens: response.usage.completion_tokens || 0,
        totalTokens: response.usage.total_tokens || 0,
      };
    }
    return undefined;
  }
}
