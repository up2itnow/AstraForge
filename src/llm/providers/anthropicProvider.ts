/**
 * Anthropic Provider Implementation
 */

import { BaseLLMProvider } from './baseProvider';
import { LLMConfig, LLMResponse } from '../interfaces';

export class AnthropicProvider extends BaseLLMProvider {
  private readonly baseUrl = 'https://api.anthropic.com/v1';

  async query(prompt: string, config: LLMConfig): Promise<LLMResponse> {
    const sanitizedPrompt = this.sanitizePrompt(prompt);

    const response = await this.makeRequest(
      `${this.baseUrl}/messages`,
      {
        model: config.model,
        max_tokens: config.maxTokens || 1000,
        messages: [{ role: 'user', content: sanitizedPrompt }],
        temperature: config.temperature || 0.7,
      },
      {
        'x-api-key': config.key,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
      }
    );

    return {
      content: response.data.content[0].text,
      usage: this.extractUsage(response.data),
      metadata: {
        model: response.data.model,
        stopReason: response.data.stop_reason,
      },
    };
  }

  async validateConfig(config: LLMConfig): Promise<boolean> {
    try {
      // Anthropic doesn't have a models endpoint, so we test with a minimal query
      await this.query('Hi', config);
      return true;
    } catch {
      return false;
    }
  }

  async getAvailableModels(_config: LLMConfig): Promise<string[]> {
    // Anthropic doesn't provide a models endpoint, return known models
    return [
      'claude-3-opus-20240229',
      'claude-3-sonnet-20240229',
      'claude-3-haiku-20240307',
      'claude-2.1',
      'claude-2.0',
    ];
  }
}
