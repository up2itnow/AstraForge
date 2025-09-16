/**
 * LLM Provider Registry
 * Exports all available providers
 */

export { BaseLLMProvider } from './baseProvider';
export { OpenAIProvider } from './openaiProvider';
export { AnthropicProvider } from './anthropicProvider';
export { XAIProvider } from './xaiProvider';
export { OpenRouterProvider } from './openrouterProvider';

import { OpenAIProvider } from './openaiProvider';
import { AnthropicProvider } from './anthropicProvider';
import { XAIProvider } from './xaiProvider';
import { OpenRouterProvider } from './openrouterProvider';
import { LLMProvider } from '../interfaces';

/**
 * Provider registry for easy instantiation
 */
export const providerRegistry: Record<string, new () => LLMProvider> = {
  OpenAI: OpenAIProvider,
  Anthropic: AnthropicProvider,
  xAI: XAIProvider,
  OpenRouter: OpenRouterProvider,
};

/**
 * Create provider instance by name
 */
export function createProvider(providerName: string): LLMProvider {
  const ProviderClass = providerRegistry[providerName];
  if (!ProviderClass) {
    throw new Error(`Unknown provider: ${providerName}`);
  }
  return new ProviderClass();
}
