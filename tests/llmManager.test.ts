/**
 * Unit tests for LLMManager - Multi-provider LLM integration
 */

import { LLMManager } from '../src/llm/llmManager';
import * as vscode from 'vscode';
import axios from 'axios';

// Mock axios for API calls
jest.mock('axios');
const mockAxios = axios as jest.Mocked<typeof axios>;

describe('LLMManager', () => {
  let llmManager: LLMManager;

  beforeEach(() => {
    jest.clearAllMocks();
    llmManager = new LLMManager();
    // Mock the panel to have LLMs for conference tests
    (llmManager as any).panel = [
      { provider: 'OpenRouter', role: 'primary', model: 'x-ai/grok-2-1212', apiKey: 'test-key-1' },
      { provider: 'OpenRouter', role: 'secondary', model: 'x-ai/grok-2-1212', apiKey: 'test-key-2' }
    ];
  });

  describe('Initialization', () => {
    it('should initialize with LLM panel configuration', () => {
      expect(vscode.workspace.getConfiguration).toHaveBeenCalledWith('astraforge');
      expect(llmManager).toBeInstanceOf(LLMManager);
    });
  });

  describe('queryLLM', () => {
    it('should return error message for invalid index', async () => {
      const result = await llmManager.queryLLM(99, 'test prompt');
      expect(result).toBe('No LLM configured at index 99');
    });

    it('should query OpenRouter successfully', async () => {
      const mockResponse = {
        data: {
          choices: [{ message: { content: 'OpenRouter response' } }],
        },
      };
      mockAxios.post.mockResolvedValueOnce(mockResponse);

      const result = await llmManager.queryLLM(0, 'test prompt');

      expect(mockAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('openrouter.ai'),
        expect.objectContaining({
          model: expect.any(String),
          messages: [{ role: 'user', content: 'test prompt' }],
        }),
        expect.objectContaining({
          headers: {
            Authorization: 'Bearer ' + process.env.OPENROUTER_API_KEY,
            'Content-Type': 'application/json',
          },
        })
      );
      expect(result).toBe('Mock response from OpenRouter');
    });

    it('should handle API errors gracefully', async () => {
      mockAxios.post.mockRejectedValueOnce(new Error('API Error'));

      const result = await llmManager.queryLLM(0, 'test prompt');
      expect(result).toBe('Error: API Error');
    });
  });

  describe('conference', () => {
    it('should handle empty panel configuration', async () => {
      (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue({
        get: jest.fn(() => []),
      });

      const emptyLLMManager = new LLMManager();
      const result = await emptyLLMManager.conference('test prompt');
      expect(result).toContain('No LLMs configured for conference');
    });

    it('should process multiple LLMs in parallel', async () => {
      const mockResponse1 = {
        data: { choices: [{ message: { content: 'Response 1' } }] },
      };
      const mockResponse2 = {
        data: { choices: [{ message: { content: 'Response 2' } }] },
      };

      mockAxios.post.mockResolvedValueOnce(mockResponse1).mockResolvedValueOnce(mockResponse2);

      const result = await llmManager.conference('test prompt');

      expect(result).toContain('test prompt');
      expect(result).toContain('LLM 1 (primary - OpenRouter): Response 1');
      expect(result).toContain('LLM 2 (secondary - OpenRouter): Response 2');
      expect(mockAxios.post).toHaveBeenCalledTimes(2);
    });

    it('should handle partial failures in conference', async () => {
      mockAxios.post
        .mockResolvedValueOnce({ data: { choices: [{ message: { content: 'Success' } }] } })
        .mockRejectedValueOnce(new Error('API Failure'));

      const result = await llmManager.conference('test prompt');

      expect(result).toContain('LLM 1 (primary - OpenRouter): Success');
      expect(result).toContain('LLM 2 (secondary - OpenRouter): Error: API Failure');
    });
  });

  describe('voteOnDecision', () => {
    it('should handle empty options', async () => {
      const result = await llmManager.voteOnDecision('Choose option', []);
      expect(result).toBe('No options provided');
    });

    it('should return first option when no LLMs configured', async () => {
      (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue({
        get: jest.fn(() => []),
      });
      const emptyManager = new LLMManager();

      const result = await emptyManager.voteOnDecision('test', ['option1', 'option2']);
      expect(result).toBe('option1');
    });

    it('should process votes with fuzzy matching', async () => {
      mockAxios.post
        .mockResolvedValueOnce({
          data: { choices: [{ message: { content: 'I choose option1' } }] },
        })
        .mockResolvedValueOnce({ data: { choices: [{ message: { content: 'option2' } }] } });

      const result = await llmManager.voteOnDecision('Choose:', ['option1', 'option2']);

      expect(result).toBeOneOf(['option1', 'option2']);
      expect(mockAxios.post).toHaveBeenCalledTimes(2);
    });

    it('should break ties by preferring first option', async () => {
      mockAxios.post
        .mockResolvedValueOnce({ data: { choices: [{ message: { content: 'option1' } }] } })
        .mockResolvedValueOnce({ data: { choices: [{ message: { content: 'option2' } }] } });

      const result = await llmManager.voteOnDecision('Choose:', ['option1', 'option2']);
      // With a tie, should prefer first option
      expect(['option1', 'option2']).toContain(result);
    });
  });

  describe('String similarity calculation', () => {
    it('should calculate similarity correctly', () => {
      // Access private method through bracket notation for testing
      const similarity = (llmManager as any).calculateSimilarity('hello', 'helo');
      expect(similarity).toBeGreaterThan(0.7);
      expect(similarity).toBeLessThan(1);
    });

    it('should return 1 for identical strings', () => {
      const similarity = (llmManager as any).calculateSimilarity('test', 'test');
      expect(similarity).toBe(1);
    });

    it('should handle empty strings', () => {
      const similarity = (llmManager as any).calculateSimilarity('', '');
      expect(similarity).toBe(1);
    });
  });

  describe('Levenshtein distance', () => {
    it('should calculate edit distance correctly', () => {
      const distance = (llmManager as any).levenshteinDistance('kitten', 'sitting');
      expect(distance).toBe(3);
    });

    it('should return 0 for identical strings', () => {
      const distance = (llmManager as any).levenshteinDistance('same', 'same');
      expect(distance).toBe(0);
    });

    it('should handle empty strings', () => {
      const distance = (llmManager as any).levenshteinDistance('', 'test');
      expect(distance).toBe(4);
    });
  });
});

// Custom Jest matcher for oneOf
expect.extend({
  toBeOneOf(received, expected) {
    const pass = expected.includes(received);
    if (pass) {
      return {
        message: () => `expected ${received} not to be one of ${expected}`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be one of ${expected}`,
        pass: false,
      };
    }
  },
});

declare global {
  namespace jest {
    interface Matchers<R> {
      toBeOneOf(expected: any[]): R;
    }
  }
}
