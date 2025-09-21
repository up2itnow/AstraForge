/**
 * Refactored LLM Manager with modular provider architecture
 * Supports parallel requests, caching, and clean provider abstraction
 */

import * as vscode from 'vscode';
import {
  LLMConfig,
  LLMProvider,
  LLMRequestMetric,
  LLMResponse,
  ProviderMetricsSummary
} from './interfaces';
import { createProvider } from './providers';
import { LLMCache } from './cache';

export class LLMManager {
  private panel: LLMConfig[] = [];
  private providers = new Map<string, LLMProvider>();
  private cache: LLMCache;
  private readonly maxConcurrentRequests: number;
  private readonly maxMetricsRetention = 500;
  private readonly providerPricing: Record<LLMConfig['provider'], { prompt: number; completion: number }>;
  private requestMetrics: LLMRequestMetric[] = [];

  constructor() {
    const panelConfig = vscode.workspace
      .getConfiguration('astraforge')
      .get<LLMConfig[] | undefined>('llmPanel');

    this.panel = Array.isArray(panelConfig) ? panelConfig : [];
    this.cache = new LLMCache(
      3600, // 1 hour TTL
      60, // 60 requests per minute
      60000 // 1 minute window
    );
    this.maxConcurrentRequests = vscode.workspace
      .getConfiguration('astraforge')
      .get('maxConcurrentRequests', 3);

    this.providerPricing = {
      OpenAI: { prompt: 0.03, completion: 0.06 },
      Anthropic: { prompt: 0.025, completion: 0.05 },
      xAI: { prompt: 0.02, completion: 0.04 },
      OpenRouter: { prompt: 0.02, completion: 0.04 }
    };

    this.initializeProviders();
  }

  /**
   * Initialize providers for all configured LLMs
   */
  private initializeProviders(): void {
    if (this.panel.length === 0) {
      return;
    }

    for (const config of this.panel) {
      if (!this.providers.has(config.provider)) {
        try {
          const provider = createProvider(config.provider);
          this.providers.set(config.provider, provider);
        } catch (error) {
          console.error(`Failed to initialize provider ${config.provider}:`, error);
        }
      }
    }
  }

  private recordMetric(
    config: LLMConfig,
    latencyMs: number,
    usage: LLMResponse['usage'] | undefined,
    success: boolean,
    error: unknown,
    requestId?: string
  ): void {
    const promptTokens = usage?.promptTokens ?? 0;
    const completionTokens = usage?.completionTokens ?? 0;
    const totalTokens = usage?.totalTokens ?? promptTokens + completionTokens;
    const costUsd = success ? this.calculateCost(config.provider, promptTokens, completionTokens) : 0;

    const metric: LLMRequestMetric = {
      provider: config.provider,
      model: config.model,
      success,
      timestamp: Date.now(),
      latencyMs,
      promptTokens,
      completionTokens,
      totalTokens,
      costUsd,
      requestId,
      errorMessage: success ? undefined : error instanceof Error ? error.message : String(error)
    };

    this.requestMetrics.push(metric);
    if (this.requestMetrics.length > this.maxMetricsRetention) {
      this.requestMetrics = this.requestMetrics.slice(-this.maxMetricsRetention);
    }
  }

  private calculateCost(
    provider: LLMConfig['provider'],
    promptTokens: number,
    completionTokens: number
  ): number {
    const pricing = this.providerPricing[provider];
    if (!pricing) {
      return 0;
    }

    const promptCost = (promptTokens * pricing.prompt) / 1000;
    const completionCost = (completionTokens * pricing.completion) / 1000;
    return Number((promptCost + completionCost).toFixed(6));
  }

  /**
   * Query a specific LLM by index with caching and error handling
   */
  async queryLLM(index: number, prompt: string, requestId?: string): Promise<string> {
    const config = this.panel[index];
    if (!config) {
      return 'No LLM configured at index ' + index;
    }

    // Check cache first
    const cachedResponse = this.cache.get(prompt, config.provider, config.model);
    if (cachedResponse) {
      return cachedResponse.response;
    }

    // Check throttling
    if (this.cache.isThrottled(config.provider)) {
      return 'Rate limit exceeded. Please try again later.';
    }

    const startTime = Date.now();

    try {
      const provider = this.providers.get(config.provider);
      if (!provider) {
        throw new Error(`Provider ${config.provider} not initialized`);
      }

      const response: LLMResponse = await provider.query(prompt, config);
      const latency = Date.now() - startTime;

      // Cache the response
      this.cache.set(prompt, config.provider, config.model, response.content, response.usage);

      this.recordMetric(config, latency, response.usage, true, undefined, requestId);

      return response.content;
    } catch (error: any) {
      const latency = Date.now() - startTime;
      this.recordMetric(config, latency, undefined, false, error, requestId);
      vscode.window.showErrorMessage(`LLM query failed: ${error.message}. Falling back...`);

      // Fallback to primary LLM
      if (index !== 0) {
        const fallbackRequestId = requestId ? `${requestId}:fallback` : undefined;
        return this.queryLLM(0, prompt, fallbackRequestId);
      }

      return `Error: ${error.message}`;
    }
  }

  /**
   * Parallel voting system with improved accuracy and fuzzy matching
   */
  async voteOnDecision(
    prompt: string,
    options: string[],
    providerNames?: string[],
    requestId?: string
  ): Promise<string> {
    const configs = this.getConfigsByProviders(providerNames);

    if (configs.length === 0 || options.length === 0) {
      return options[0] || 'No options provided';
    }

    const votes = new Map<string, number>(options.map(opt => [opt, 0]));

    // Enhanced voting prompt
    const votePrompt = `${prompt}

Please vote on ONE of these options: ${options.join(', ')}
Respond with ONLY the option you choose, exactly as written.`;

    // Create voting promises with concurrency limit
    const votePromises = configs.map(async ({ index, config }) => {
      try {
        const response = await this.queryLLM(
          index,
          votePrompt,
          requestId ? `${requestId}:${config.provider}` : undefined
        );
        return { response, success: true, index };
      } catch {
        return { response: options[0], success: false, index };
      }
    });

    // Execute with controlled concurrency
    const results = await this.executeWithConcurrencyLimit(votePromises);

    // Process votes with fuzzy matching
    results.forEach(result => {
      const response = result.response.toLowerCase().trim();
      const voted = options.find(
        opt =>
          response.includes(opt.toLowerCase()) ||
          opt.toLowerCase().includes(response) ||
          this.calculateSimilarity(response, opt.toLowerCase()) > 0.7
      );

      if (voted) {
        votes.set(voted, (votes.get(voted) || 0) + 1);
      }
    });

    // Find majority winner with tie-breaking
    let max = 0;
    let winner = options[0];
    votes.forEach((count, opt) => {
      if (count > max || (count === max && opt === options[0])) {
        max = count;
        winner = opt;
      }
    });

    // Enhanced logging for audit trail
    const voteResults = Array.from(votes.entries()).map(([option, count]) => ({ option, count }));
    console.log(
      `Vote results for "${prompt.substring(0, 50)}...": ${JSON.stringify(voteResults)}, Winner: ${winner}`
    );

    return winner;
  }

  /**
   * Conference system for collaborative discussion
   */
  async conference(
    prompt: string,
    providerNames?: string[],
    requestId?: string
  ): Promise<string> {
    const configs = this.getConfigsByProviders(providerNames);
    if (configs.length === 0) {
      return 'No LLMs configured for conference';
    }

    let discussion = prompt;
    const discussionHistory: string[] = [prompt];

    // Sequential discussion with each LLM
    for (const { config, index } of configs) {
      const response = await this.queryLLM(
        index,
        discussion,
        requestId ? `${requestId}:${config.provider}` : undefined
      );
      const contribution = `\nLLM ${index + 1} (${config.role} - ${config.provider}): ${response}`;
      discussion += contribution;
      discussionHistory.push(contribution);
    }

    return discussion;
  }

  /**
   * Validate all configured LLM providers
   */
  async validateAllConfigurations(): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};

    const validationPromises = this.panel.map(async (config, index) => {
      const provider = this.providers.get(config.provider);
      if (!provider) {
        return { index, valid: false };
      }

      try {
        const valid = await provider.validateConfig(config);
        return { index, valid };
      } catch {
        return { index, valid: false };
      }
    });

    const validationResults = await Promise.all(validationPromises);

    validationResults.forEach(result => {
      const config = this.panel[result.index];
      results[`${config.provider}-${result.index}`] = result.valid;
    });

    return results;
  }

  /**
   * Get available models for all providers
   */
  async getAvailableModels(): Promise<Record<string, string[]>> {
    const models: Record<string, string[]> = {};

    for (const [providerName, provider] of this.providers.entries()) {
      const config = this.panel.find(c => c.provider === providerName);
      if (config) {
        try {
          models[providerName] = await provider.getAvailableModels(config);
        } catch {
          models[providerName] = [];
        }
      }
    }

    return models;
  }

  getPanelConfigurations(): LLMConfig[] {
    return [...this.panel];
  }

  getRequestMetrics(providerName?: string): LLMRequestMetric[] {
    if (!providerName) {
      return [...this.requestMetrics];
    }

    const normalized = providerName.toLowerCase();
    return this.requestMetrics.filter(metric => metric.provider.toLowerCase() === normalized);
  }

  getProviderMetricsSummary(): ProviderMetricsSummary[] {
    const summaryMap = new Map<
      string,
      {
        provider: ProviderMetricsSummary['provider'];
        model: string;
        totalRequests: number;
        successfulRequests: number;
        latencySum: number;
        costSum: number;
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
        lastUpdated: number;
      }
    >();

    for (const metric of this.requestMetrics) {
      const key = `${metric.provider}:${metric.model}`;
      if (!summaryMap.has(key)) {
        summaryMap.set(key, {
          provider: metric.provider,
          model: metric.model,
          totalRequests: 0,
          successfulRequests: 0,
          latencySum: 0,
          costSum: 0,
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0,
          lastUpdated: metric.timestamp
        });
      }

      const entry = summaryMap.get(key)!;
      entry.totalRequests += 1;
      entry.lastUpdated = Math.max(entry.lastUpdated, metric.timestamp);

      if (metric.success) {
        entry.successfulRequests += 1;
        entry.latencySum += metric.latencyMs;
        entry.costSum += metric.costUsd;
        entry.promptTokens += metric.promptTokens;
        entry.completionTokens += metric.completionTokens;
        entry.totalTokens += metric.totalTokens;
      }
    }

    return Array.from(summaryMap.values()).map(entry => ({
      provider: entry.provider,
      model: entry.model,
      totalRequests: entry.totalRequests,
      successfulRequests: entry.successfulRequests,
      successRate: entry.totalRequests > 0 ? entry.successfulRequests / entry.totalRequests : 0,
      avgLatencyMs: entry.successfulRequests > 0 ? entry.latencySum / entry.successfulRequests : 0,
      avgCostUsd: entry.successfulRequests > 0 ? entry.costSum / entry.successfulRequests : 0,
      promptTokens: entry.promptTokens,
      completionTokens: entry.completionTokens,
      totalTokens: entry.totalTokens,
      lastUpdated: entry.lastUpdated
    }));
  }

  getMetricsSnapshot(): { requests: LLMRequestMetric[]; providers: ProviderMetricsSummary[] } {
    return {
      requests: this.getRequestMetrics(),
      providers: this.getProviderMetricsSummary()
    };
  }

  estimateCost(
    provider: LLMConfig['provider'],
    promptTokens: number,
    completionTokens: number
  ): number {
    return this.calculateCost(provider, promptTokens, completionTokens);
  }

  estimateCostFromTotalTokens(
    provider: LLMConfig['provider'],
    totalTokens: number,
    completionRatio: number = 0.5
  ): number {
    if (totalTokens <= 0) {
      return 0;
    }

    const completionTokens = Math.round(totalTokens * completionRatio);
    const promptTokens = Math.max(totalTokens - completionTokens, 0);
    return this.calculateCost(provider, promptTokens, completionTokens);
  }

  async queryByProvider(
    providerName: string,
    prompt: string,
    model?: string,
    requestId?: string
  ): Promise<string> {
    const index = this.findConfigIndex(providerName, model);
    if (index === -1) {
      if (this.panel.length > 0) {
        const fallbackRequestId = requestId ? `${requestId}:fallback` : undefined;
        return this.queryLLM(0, prompt, fallbackRequestId);
      }
      throw new Error(`No LLM configuration found for provider: ${providerName}`);
    }

    return this.queryLLM(index, prompt, requestId);
  }

  private findConfigIndex(providerName: string, model?: string): number {
    const normalized = providerName.toLowerCase();

    if (model) {
      const exactMatch = this.panel.findIndex(
        config =>
          config.provider.toLowerCase() === normalized && config.model.toLowerCase() === model.toLowerCase()
      );
      if (exactMatch !== -1) {
        return exactMatch;
      }
    }

    return this.panel.findIndex(config => config.provider.toLowerCase() === normalized);
  }

  private getConfigsByProviders(providerNames?: string[]): { config: LLMConfig; index: number }[] {
    const entries = this.panel.map((config, index) => ({ config, index }));

    if (!providerNames || providerNames.length === 0) {
      return entries;
    }

    const normalizedOrder = providerNames.map(name => name.toLowerCase());

    return entries
      .filter(entry => normalizedOrder.includes(entry.config.provider.toLowerCase()))
      .sort(
        (a, b) =>
          normalizedOrder.indexOf(a.config.provider.toLowerCase()) -
          normalizedOrder.indexOf(b.config.provider.toLowerCase())
      );
  }

  /**
   * Execute promises with concurrency limit
   */
  private async executeWithConcurrencyLimit<T>(promises: Promise<T>[]): Promise<T[]> {
    const results: T[] = [];
    const executing: Promise<any>[] = [];

    for (const promise of promises) {
      const p = promise.then(result => {
        results.push(result);
        executing.splice(executing.indexOf(p), 1);
        return result;
      });

      executing.push(p);

      if (executing.length >= this.maxConcurrentRequests) {
        await Promise.race(executing);
      }
    }

    await Promise.all(executing);
    return results;
  }

  /**
   * Calculate string similarity for fuzzy matching
   */
  private calculateSimilarity(str1: string, str2: string): number {
    const maxLength = Math.max(str1.length, str2.length);
    if (maxLength === 0) return 1;

    const distance = this.levenshteinDistance(str1, str2);
    return (maxLength - distance) / maxLength;
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1)
      .fill(null)
      .map(() => Array(str1.length + 1).fill(null));

    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + indicator
        );
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): ReturnType<LLMCache['getStats']> {
    return this.cache.getStats();
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Generate response from a specific provider
   * Compatibility method to support existing API usage
   */
  async generateResponse(
    providerName: string,
    prompt: string,
    options?: { requestId?: string; model?: string }
  ): Promise<string> {
    return this.queryByProvider(providerName, prompt, options?.model, options?.requestId);
  }
}
