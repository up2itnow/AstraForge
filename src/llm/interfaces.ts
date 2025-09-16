/**
 * LLM Provider Interfaces for AstraForge
 * Provides clean abstraction for different LLM providers
 */

export interface LLMConfig {
  provider: 'OpenAI' | 'Anthropic' | 'xAI' | 'OpenRouter';
  key: string;
  model: string;
  role: 'primary' | 'secondary';
  maxTokens?: number;
  temperature?: number;
}

export interface LLMResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  metadata?: Record<string, any>;
}

export interface LLMProvider {
  /**
   * Query the LLM with a prompt
   * @param prompt The input prompt
   * @param config Provider configuration
   * @returns Promise resolving to LLM response
   */
  query(prompt: string, config: LLMConfig): Promise<LLMResponse>;

  /**
   * Validate API key and configuration
   * @param config Provider configuration
   * @returns Promise resolving to validation result
   */
  validateConfig(config: LLMConfig): Promise<boolean>;

  /**
   * Get available models for this provider
   * @param config Provider configuration
   * @returns Promise resolving to available models
   */
  getAvailableModels(config: LLMConfig): Promise<string[]>;
}

export interface VoteResult {
  option: string;
  votes: number;
  confidence: number;
}

export interface ConferenceResult {
  finalResult: string;
  discussionHistory: string[];
  consensus: number; // 0-1 scale
}
