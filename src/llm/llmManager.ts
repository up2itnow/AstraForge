/**
 * Refactored LLM Manager with modular provider architecture
 * Supports parallel requests, caching, and clean provider abstraction
 */

import * as vscode from 'vscode';
import { LLMConfig, LLMProvider, LLMResponse, VoteResult, ConferenceResult } from './interfaces';
import { createProvider } from './providers';
import { LLMCache } from './cache';

export class LLMManager {
  private panel: LLMConfig[] = [];
  private providers = new Map<string, LLMProvider>();
  private cache: LLMCache;
  private readonly maxConcurrentRequests: number;

  constructor() {
    this.panel = vscode.workspace.getConfiguration('astraforge').get('llmPanel', []);
    this.cache = new LLMCache(
      3600, // 1 hour TTL
      60,   // 60 requests per minute
      60000 // 1 minute window
    );
    this.maxConcurrentRequests = vscode.workspace
      .getConfiguration('astraforge')
      .get('maxConcurrentRequests', 3);

    this.initializeProviders();
  }

  /**
   * Initialize providers for all configured LLMs
   */
  private initializeProviders(): void {
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

  /**
   * Query a specific LLM by index with caching and error handling
   */
  async queryLLM(index: number, prompt: string): Promise<string> {
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

    try {
      const provider = this.providers.get(config.provider);
      if (!provider) {
        throw new Error(`Provider ${config.provider} not initialized`);
      }

      const response = await provider.query(prompt, config);
      
      // Cache the response
      this.cache.set(prompt, config.provider, config.model, response.content, response.usage);
      
      return response.content;
    } catch (error: any) {
      vscode.window.showErrorMessage(`LLM query failed: ${error.message}. Falling back...`);
      
      // Fallback to primary LLM
      if (index !== 0) {
        return this.queryLLM(0, prompt);
      }
      
      return `Error: ${error.message}`;
    }
  }

  /**
   * Parallel voting system with improved accuracy and fuzzy matching
   */
  async voteOnDecision(prompt: string, options: string[]): Promise<string> {
    if (this.panel.length === 0 || options.length === 0) {
      return options[0] || 'No options provided';
    }

    const votes = new Map<string, number>(options.map(opt => [opt, 0]));
    
    // Enhanced voting prompt
    const votePrompt = `${prompt}

Please vote on ONE of these options: ${options.join(', ')}
Respond with ONLY the option you choose, exactly as written.`;

    // Create voting promises with concurrency limit
    const votePromises = this.panel.map(async (_, i) => {
      try {
        const response = await this.queryLLM(i, votePrompt);
        return { response, success: true, index: i };
      } catch {
        return { response: options[0], success: false, index: i };
      }
    });

    // Execute with controlled concurrency
    const results = await this.executeWithConcurrencyLimit(votePromises);
    
    // Process votes with fuzzy matching
    results.forEach(result => {
      const response = result.response.toLowerCase().trim();
      const voted = options.find(opt => 
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
    console.log(`Vote results for "${prompt.substring(0, 50)}...": ${JSON.stringify(voteResults)}, Winner: ${winner}`);
    
    return winner;
  }

  /**
   * Conference system for collaborative discussion
   */
  async conference(prompt: string): Promise<string> {
    if (this.panel.length === 0) {
      return 'No LLMs configured for conference';
    }

    let discussion = prompt;
    const discussionHistory: string[] = [prompt];

    // Sequential discussion with each LLM
    for (let i = 0; i < this.panel.length; i++) {
      const config = this.panel[i];
      const response = await this.queryLLM(i, discussion);
      const contribution = `\nLLM ${i + 1} (${config.role} - ${config.provider}): ${response}`;
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
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));

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
}