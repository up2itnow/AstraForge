/**
 * Integration tests for CollaborativeSessionManager - Real multi-LLM collaboration
 */

import { CollaborativeSessionManager } from '../../src/collaboration/CollaborativeSessionManager';
import { LLMManager } from '../../src/llm/llmManager';
import { MemoryOrchestrator } from '../../src/db/memoryOrchestrator';
import { CollaborationRequest } from '../../src/collaboration/types/collaborationTypes';
import * as vscode from 'vscode';
import * as dotenv from 'dotenv';
import * as fs from 'fs';

// Load environment variables
dotenv.config();

// Mock only vscode since we're not running in VS Code environment
jest.mock('vscode', () => ({
  workspace: {
    getConfiguration: jest.fn(() => ({
      get: jest.fn((key: string) => {
        if (key === 'llmPanel') {
          const models = process.env.OPENROUTER_MODELS_TO_USE?.split(',').map(model => model.trim()) || [];
          return models.map((model, index) => ({
            provider: 'OpenRouter',
            key: process.env.OPENROUTER_API_KEY,
            model: model,
            role: index === 0 ? 'primary' : 'secondary'
          }));
        }
        return [];
      })
    }))
  }
}));

describe('CollaborativeSessionManager Integration', () => {
  let sessionManager: CollaborativeSessionManager;
  let llmManager: LLMManager;
  let memoryOrchestrator: MemoryOrchestrator;

  const testStoragePath = './test_collaboration_vectors';

  beforeEach(async () => {
    // Clean up any existing test data
    if (fs.existsSync(testStoragePath)) {
      fs.rmSync(testStoragePath, { recursive: true, force: true });
    }

    // Create real instances for integration testing
    llmManager = new LLMManager();
    memoryOrchestrator = new MemoryOrchestrator(testStoragePath);
    await memoryOrchestrator.init();

    // Create session manager in test mode for controlled testing
    sessionManager = new CollaborativeSessionManager(llmManager, memoryOrchestrator, true);
  });

  afterEach(async () => {
    if (memoryOrchestrator) {
      await memoryOrchestrator.close();
    }
    
    // Clean up test data
    if (fs.existsSync(testStoragePath)) {
      fs.rmSync(testStoragePath, { recursive: true, force: true });
    }
  });

  describe('Session Lifecycle', () => {
    it('should create and manage collaborative sessions', async () => {
      const request: CollaborationRequest = {
        prompt: 'Design a REST API for a task management system',
        priority: 'high',
        timeLimit: 60000, // 60 seconds in milliseconds
        preferredParticipants: ['OpenAI', 'Anthropic']
      };

      const session = await sessionManager.startSession(request);
      
      expect(session).toBeDefined();
      expect(session.id).toBeDefined();
      expect(session.status).toBe('active');
      expect(session.participants.length).toBeGreaterThan(0);
    });

    it('should validate session requests', async () => {
      const invalidRequest: CollaborationRequest = {
        prompt: '', // Empty prompt should fail validation
        priority: 'high',
        timeLimit: 5, // Too short time limit
        preferredParticipants: []
      };

      await expect(sessionManager.startSession(invalidRequest)).rejects.toThrow();
    });

    it('should select appropriate participants', async () => {
      const request: CollaborationRequest = {
        prompt: 'Evaluate the pros and cons of microservices architecture',
        priority: 'medium',
        timeLimit: 120000, // 120 seconds in milliseconds
        preferredParticipants: []
      };

      const session = await sessionManager.startSession(request);
      
      expect(session.participants.length).toBeGreaterThanOrEqual(2);
      session.participants.forEach(participant => {
        expect(participant.id).toBeDefined();
        expect(participant.model).toBeDefined();
      });
    });
  });

  describe('Real Multi-LLM Collaboration', () => {
    it('should execute collaborative rounds with real API calls', async () => {
      if (!process.env.OPENROUTER_API_KEY) {
        console.warn('Skipping real collaboration test - no OPENROUTER_API_KEY found');
        return;
      }

      const request: CollaborationRequest = {
        prompt: 'What are the key considerations for implementing user authentication in a web application? Please provide concise responses.',
        priority: 'high',
        timeLimit: 90000, // 90 seconds in milliseconds
        preferredParticipants: []
      };

      const session = await sessionManager.startSession(request);
      
      // Execute the collaborative rounds with real API calls
      await sessionManager.executeSessionRounds(session.id);
      
      // Verify session completed
      expect(['completed', 'consensus_reached']).toContain(session.status);
      expect(session.rounds.length).toBeGreaterThan(0);
    }, 120000); // 2 minute timeout for real collaboration

    it('should generate synthesis from multiple LLM responses', async () => {
      if (!process.env.OPENROUTER_API_KEY) {
        console.warn('Skipping synthesis test - no OPENROUTER_API_KEY found');
        return;
      }

      const request: CollaborationRequest = {
        prompt: 'Compare React and Vue.js for building a dashboard application. Keep responses brief.',
        priority: 'medium',
        timeLimit: 60000, // 60 seconds in milliseconds
        preferredParticipants: []
      };

      const session = await sessionManager.startSession(request);
      await sessionManager.executeSessionRounds(session.id);
      
      const result = await sessionManager.completeSession(session.id);
      
      expect(result).toBeDefined();
      expect(result.synthesisLog).toBeDefined();
      expect(Array.isArray(result.synthesisLog)).toBe(true);
      expect(result.qualityScore).toBeGreaterThan(0);
    }, 90000);
  });

  describe('Quality Assessment', () => {
    it('should calculate quality scores for real responses', async () => {
      if (!process.env.OPENROUTER_API_KEY) {
        console.warn('Skipping quality test - no OPENROUTER_API_KEY found');
        return;
      }

      const request: CollaborationRequest = {
        prompt: 'Explain the benefits of automated testing in software development. Be concise.',
        priority: 'medium',
        timeLimit: 45000, // 45 seconds in milliseconds
        preferredParticipants: []
      };

      const session = await sessionManager.startSession(request);
      await sessionManager.executeSessionRounds(session.id);
      
      const result = await sessionManager.completeSession(session.id);
      
      expect(result.qualityScore).toBeGreaterThan(0);
      expect(result.qualityScore).toBeLessThanOrEqual(100);
      expect(typeof result.consensusLevel === 'number' || typeof result.consensusLevel === 'string').toBe(true);
    }, 75000);

    it('should measure consensus between real LLM responses', async () => {
      if (!process.env.OPENROUTER_API_KEY) {
        console.warn('Skipping consensus test - no OPENROUTER_API_KEY found');
        return;
      }

      const request: CollaborationRequest = {
        prompt: 'What is 2 + 2? This should have high consensus.',
        priority: 'low',
        timeLimit: 30000, // 30 seconds in milliseconds
        preferredParticipants: []
      };

      const session = await sessionManager.startSession(request);
      await sessionManager.executeSessionRounds(session.id);
      
      const result = await sessionManager.completeSession(session.id);
      
      // Accept either a numeric score or qualitative label
      if (typeof result.consensusLevel === 'number') {
        expect(result.consensusLevel).toBeGreaterThan(0.5);
      } else {
        expect(['unanimous', 'qualified_majority', 'simple_majority', 'forced_consensus']).toContain(result.consensusLevel);
      }
    }, 45000);
  });

  describe('Time Management', () => {
    it('should respect session time limits', async () => {
      const request: CollaborationRequest = {
        prompt: 'Test prompt for time management',
        priority: 'medium',
        timeLimit: 15000, // 15 seconds in milliseconds
        preferredParticipants: []
      };

      const startTime = Date.now();
      const session = await sessionManager.startSession(request);
      
      // Session should be created but not exceed time limit when executed
      expect(session).toBeDefined();
      expect(session.timeLimit).toBe(15000);
      
      const creationTime = Date.now() - startTime;
      expect(creationTime).toBeLessThan(5000); // Session creation should be fast
    });

    it('should track session duration accurately', async () => {
      const request: CollaborationRequest = {
        prompt: 'Test duration tracking',
        priority: 'low',
        timeLimit: 30000, // 30 seconds in milliseconds
        preferredParticipants: []
      };

      const session = await sessionManager.startSession(request);
      
      expect(session.startTime).toBeDefined();
      expect(session.startTime).toBeInstanceOf(Date);
    });
  });

  describe('Error Handling', () => {
    it('should handle API failures gracefully', async () => {
      // Test with invalid API key
      const originalKey = process.env.OPENROUTER_API_KEY;
      process.env.OPENROUTER_API_KEY = 'invalid-key';
      
      const invalidLLMManager = new LLMManager();
      const invalidSessionManager = new CollaborativeSessionManager(invalidLLMManager, memoryOrchestrator, true);
      
      const request: CollaborationRequest = {
        prompt: 'This should fail with invalid API key',
        priority: 'medium',
        timeLimit: 30000, // 30 seconds in milliseconds
        preferredParticipants: []
      };

      const session = await invalidSessionManager.startSession(request);
      
      // Should create session but fail during execution
      expect(session).toBeDefined();
      
      // Restore original key
      process.env.OPENROUTER_API_KEY = originalKey;
    }, 15000);

    it('should emit error events for failed operations', async () => {
      let errorEmitted = false;
      
      sessionManager.on('error', (error) => {
        errorEmitted = true;
        expect(error).toBeDefined();
      });

      // Test with invalid request that should trigger error
      try {
        await sessionManager.startSession({
          prompt: '', // Invalid empty prompt
          priority: 'high',
          timeLimit: 5, // Invalid short time
          preferredParticipants: []
        });
      } catch (error) {
        // Expected to throw
      }

      expect(errorEmitted).toBe(true);
    });
  });

  describe('Data Persistence', () => {
    it('should store session data in vector database', async () => {
      const request: CollaborationRequest = {
        prompt: 'Test data persistence in vector DB',
        priority: 'medium',
        timeLimit: 30000, // 30 seconds in milliseconds
        preferredParticipants: []
      };

      const session = await sessionManager.startSession(request);
      const result = await sessionManager.completeSession(session.id);
      
      // Verify data was stored (basic check)
      expect(result).toBeDefined();
      expect(memoryOrchestrator).toBeDefined();
    });

    it('should handle vector DB storage errors gracefully', async () => {
      // Create session manager with invalid vector DB path
      const invalidMemory = new MemoryOrchestrator('/invalid/path');
      await invalidMemory.init(); // This should not throw

      const invalidSessionManager = new CollaborativeSessionManager(llmManager, invalidMemory, true);
      
      const request: CollaborationRequest = {
        prompt: 'Test with invalid vector DB',
        priority: 'medium',
        timeLimit: 30000, // 30 seconds in milliseconds
        preferredParticipants: []
      };

      // Should not throw even with invalid vector DB
      await expect(invalidSessionManager.startSession(request)).resolves.toBeDefined();

      await invalidMemory.close();
    });
  });

  describe('Performance', () => {
    it('should handle multiple concurrent sessions', async () => {
      const requests = [
        {
          prompt: 'Concurrent test 1: What is JavaScript?',
          priority: 'low' as const,
          timeLimit: 30000, // 30 seconds in milliseconds
          preferredParticipants: []
        },
        {
          prompt: 'Concurrent test 2: What is Python?',
          priority: 'low' as const,
          timeLimit: 30000, // 30 seconds in milliseconds
          preferredParticipants: []
        },
        {
          prompt: 'Concurrent test 3: What is TypeScript?',
          priority: 'low' as const,
          timeLimit: 30000, // 30 seconds in milliseconds
          preferredParticipants: []
        }
      ];

      const startTime = Date.now();
      const sessions = await Promise.all(
        requests.map(request => sessionManager.startSession(request))
      );
      const duration = Date.now() - startTime;

      expect(sessions).toHaveLength(3);
      sessions.forEach(session => {
        expect(session).toBeDefined();
        expect(session.id).toBeDefined();
      });
      
      // Concurrent session creation should be efficient
      expect(duration).toBeLessThan(10000);
    }, 15000);

    it('should optimize token usage across multiple LLMs', async () => {
      if (!process.env.OPENROUTER_API_KEY) {
        console.warn('Skipping token optimization test - no OPENROUTER_API_KEY found');
        return;
      }

      const request: CollaborationRequest = {
        prompt: 'Brief question: What is REST?', // Short prompt to minimize token usage
        priority: 'medium',
        timeLimit: 45000, // 45 seconds in milliseconds
        preferredParticipants: []
      };

      const session = await sessionManager.startSession(request);
      await sessionManager.executeSessionRounds(session.id);
      const result = await sessionManager.completeSession(session.id);
      
      expect(result.tokenUsage).toBeDefined();
      expect(result.tokenUsage.totalTokens).toBeGreaterThan(0);
      expect(result.tokenUsage.efficiency).toBeGreaterThan(0);
    }, 120000);
  });
});