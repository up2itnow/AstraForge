/**
 * OpenAI Provider Implementation
 */

import { BaseLLMProvider } from './baseProvider';
import { LLMConfig, LLMResponse } from '../interfaces';

export class OpenAIProvider extends BaseLLMProvider {
  private readonly baseUrl = 'https://api.openai.com/v1';

  async query(prompt: string, config: LLMConfig): Promise<LLMResponse> {
    const sanitizedPrompt = this.sanitizePrompt(prompt);

    const response = await this.makeRequest(
      `${this.baseUrl}/chat/completions`,
      {
        model: config.model,
        messages: [{ role: 'user', content: sanitizedPrompt }],
        max_tokens: config.maxTokens || 1000,
        temperature: config.temperature || 0.7,
      },
      {
        Authorization: `Bearer ${config.key}`,
        'Content-Type': 'application/json',
      }
    );

    return {
      content: response.data.choices[0].message.content,
      usage: this.extractUsage(response.data),
      metadata: {
        model: response.data.model,
        finishReason: response.data.choices[0].finish_reason,
      },
    };
  }

  async validateConfig(config: LLMConfig): Promise<boolean> {
    try {
      const response = await this.makeRequest(`${this.baseUrl}/models`, null, {
        Authorization: `Bearer ${config.key}`,
        'Content-Type': 'application/json',
      });
      return response.status === 200;
    } catch {
      return false;
    }
  }

  async getAvailableModels(config: LLMConfig): Promise<string[]> {
    try {
      const response = await this.makeRequest(`${this.baseUrl}/models`, null, {
        Authorization: `Bearer ${config.key}`,
        'Content-Type': 'application/json',
      });

      return response.data.data
        .filter((model: any) => model.id.includes('gpt'))
        .map((model: any) => model.id)
        .sort();
    } catch {
      return ['gpt-4', 'gpt-3.5-turbo']; // fallback
    }
  }
}
