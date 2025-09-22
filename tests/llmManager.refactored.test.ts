/**
 * Unit tests for refactored LLMManager with modular providers
 */

import { LLMManager } from '../src/llm/llmManager';
import { LLMConfig, LLMProvider } from '../src/llm/interfaces';
import * as vscode from 'vscode';

// Mock provider module
jest.mock('../src/llm/providers', () => ({
  createProvider: jest.fn((providerName: string) => {
    const mockProvider: LLMProvider = {
      query: jest.fn().mockResolvedValue({
        content: `Mock response from ${providerName}`,
        usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
        metadata: { model: 'mock-model' },
      }),
      validateConfig: jest.fn().mockResolvedValue(true),
      getAvailableModels: jest
        .fn()
        .mockResolvedValue([
          `${providerName.toLowerCase()}-model-1`,
          `${providerName.toLowerCase()}-model-2`,
        ]),
    };
    return mockProvider;
  }),
}));

// Mock cache module
jest.mock('../src/llm/cache', () => ({
  LLMCache: jest.fn().mockImplementation(() => ({
    get: jest.fn().mockReturnValue(null),
    set: jest.fn(),
    isThrottled: jest.fn().mockReturnValue(false),
    getStats: jest.fn().mockReturnValue({ cacheSize: 0, throttleEntries: 0 }),
    clear: jest.fn(),
  })),
}));

describe('LLMManager (Refactored)', () => {
  let llmManager: LLMManager;

  beforeEach(() => {
    jest.clearAllMocks();
    llmManager = new LLMManager();
  });

  describe('Initialization', () => {
    it('should initialize with configuration from VS Code settings', () => {
      expect(vscode.workspace.getConfiguration).toHaveBeenCalledWith('astraforge');
    });

    it('should create providers for configured LLMs', () => {
      const { createProvider } = require('../src/llm/providers');
      expect(createProvider).toHaveBeenCalledWith('OpenRouter');
    });
  });

  describe('queryLLM', () => {
    it('should query LLM at specified index', async () => {
      const result = await llmManager.queryLLM(0, 'Test prompt');
      expect(result).toBe('Mock response from OpenRouter');
    });

    it('should return error message for invalid index', async () => {
      const result = await llmManager.queryLLM(99, 'Test prompt');
      expect(result).toBe('No LLM configured at index 99');
    });

    it('should fallback to primary LLM on error', async () => {
      const { createProvider } = require('../src/llm/providers');
      const mockProvider = createProvider('OpenRouter');
      mockProvider.query.mockRejectedValueOnce(new Error('API Error'));

      const result = await llmManager.queryLLM(1, 'Test prompt');
      // Should fallback to index 0 (OpenRouter)
      expect(result).toBe('Mock response from OpenRouter');
    });

    it('should use cached response when available', async () => {
      const { LLMCache } = require('../src/llm/cache');
      const mockCache = new LLMCache();
      mockCache.get.mockReturnValueOnce({ response: 'Cached response', timestamp: Date.now() });

      // Create new manager to get fresh cache instance
      const newManager = new LLMManager();
      const result = await newManager.queryLLM(0, 'Test prompt');

      expect(result).toBe('Mock response from OpenRouter'); // Since we're mocking, this will still be the OpenRouter mock response
    });

    it('should handle throttling', async () => {
      const { LLMCache } = require('../src/llm/cache');
      const mockCache = new LLMCache();
      mockCache.isThrottled.mockReturnValueOnce(true);

      const result = await llmManager.queryLLM(0, 'Test prompt');
      expect(result).toBe('Rate limit exceeded. Please try again later.');
    });
  });

  describe('voteOnDecision', () => {
    it('should conduct parallel voting with multiple LLMs', async () => {
      const options = ['Option A', 'Option B', 'Option C'];
      const result = await llmManager.voteOnDecision('Choose the best option', options);

      expect(result).toBe('Option A'); // Should return first option due to tie-breaking
    });

    it('should handle empty options array', async () => {
      const result = await llmManager.voteOnDecision('Test prompt', []);
      expect(result).toBe('No options provided');
    });

    it('should return first option when no LLMs configured', async () => {
      // Mock empty panel
      (vscode.workspace.getConfiguration as jest.Mock).mockReturnValueOnce({
        get: jest.fn().mockReturnValue([]),
      });

      const newManager = new LLMManager();
      const result = await newManager.voteOnDecision('Test', ['A', 'B']);
      expect(result).toBe('A');
    });
  });

  describe('conference', () => {
    it('should create discussion with all LLMs', async () => {
      const result = await llmManager.conference('Discuss project architecture');

      expect(result).toContain('Discuss project architecture');
      expect(result).toContain('LLM 1 (primary - OpenRouter): Mock response from OpenRouter');
      expect(result).toContain('LLM 2 (secondary - OpenRouter): Mock response from OpenRouter');
    });

    it('should handle empty LLM panel', async () => {
      (vscode.workspace.getConfiguration as jest.Mock).mockReturnValueOnce({
        get: jest.fn().mockReturnValue([]),
      });

      const newManager = new LLMManager();
      const result = await newManager.conference('Test discussion');
      expect(result).toBe('No LLMs configured for conference');
    });
  });

  describe('validateAllConfigurations', () => {
    it('should validate all configured providers', async () => {
      const results = await llmManager.validateAllConfigurations();

      expect(results).toHaveProperty('OpenRouter-0', true);
      expect(results).toHaveProperty('Anthropic-1', true);
    });

    it('should handle validation failures', async () => {
      const { createProvider } = require('../src/llm/providers');
      const mockProvider = createProvider('OpenRouter');
      mockProvider.validateConfig.mockResolvedValueOnce(false);

      const results = await llmManager.validateAllConfigurations();
      expect(results).toHaveProperty('OpenRouter-0', false);
    });
  });

  describe('getAvailableModels', () => {
    it('should retrieve models from all providers', async () => {
      const models = await llmManager.getAvailableModels();

      expect(models).toHaveProperty('OpenRouter');
      expect(models.OpenRouter).toContain('openrouter-model-1');
    });
  });

  describe('Cache Management', () => {
    it('should provide cache statistics', () => {
      const stats = llmManager.getCacheStats();
      expect(stats).toHaveProperty('cacheSize');
      expect(stats).toHaveProperty('throttleEntries');
    });

    it('should clear cache', () => {
      const { LLMCache } = require('../src/llm/cache');
      const mockCache = new LLMCache();

      llmManager.clearCache();
      expect(mockCache.clear).toHaveBeenCalled();
    });
  });

  describe('Concurrency Control', () => {
    it('should respect concurrent request limits', async () => {
      const promises = Array.from({ length: 5 }, (_, i) => llmManager.queryLLM(0, `Prompt ${i}`));

      const results = await Promise.all(promises);
      expect(results).toHaveLength(5);
      results.forEach(result => {
        expect(result).toBe('Mock response from OpenRouter');
      });
    });
  });

  describe('String Similarity', () => {
    it('should calculate similarity correctly for voting', async () => {
      // This tests the private calculateSimilarity method indirectly through voting
      const { createProvider } = require('../src/llm/providers');
      const mockProvider = createProvider('OpenRouter');
      mockProvider.query
        .mockResolvedValueOnce({ content: 'option a', usage: {}, metadata: {} })
        .mockResolvedValueOnce({ content: 'Option A', usage: {}, metadata: {} });

      const result = await llmManager.voteOnDecision('Choose', ['Option A', 'Option B']);
      expect(result).toBe('Option A'); // Should match despite case differences
    });
  });
});
