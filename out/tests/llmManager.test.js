/**
 * Integration tests for LLMManager - Multi-provider LLM integration with real APIs
 */
import { LLMManager } from '../src/llm/llmManager';
import * as dotenv from 'dotenv';
// Load environment variables
dotenv.config();
// vscode is mocked globally in __mocks__/vscode.js
describe('LLMManager', () => {
    let llmManager;
    beforeEach(() => {
        llmManager = new LLMManager();
    });
    describe('Initialization', () => {
        it('should initialize with real configuration from environment', () => {
            expect(llmManager).toBeDefined();
            expect(process.env.OPENROUTER_API_KEY).toBeDefined();
            expect(process.env.OPENROUTER_MODELS_TO_USE).toBeDefined();
        });
        it('should handle empty panel configuration gracefully', () => {
            // Temporarily mock empty configuration
            const originalMock = require('vscode').workspace.getConfiguration;
            require('vscode').workspace.getConfiguration = jest.fn(() => ({
                get: jest.fn(() => [])
            }));
            const emptyManager = new LLMManager();
            expect(emptyManager).toBeDefined();
            // Restore original mock
            require('vscode').workspace.getConfiguration = originalMock;
        });
    });
    describe('Real API Integration', () => {
        it('should make real API calls to OpenRouter', async () => {
            if (!process.env.OPENROUTER_API_KEY) {
                console.warn('Skipping real API test - no OPENROUTER_API_KEY found');
                return;
            }
            const response = await llmManager.queryLLM(0, 'Hello, this is a test message. Please respond briefly.');
            expect(response).toBeDefined();
            expect(typeof response).toBe('string');
            expect(response.length).toBeGreaterThan(0);
            // Verify successful API response
            expect(response).not.toContain('Error:');
            console.log('✅ Real API call successful!');
            console.log('✅ Response preview:', response.substring(0, 100) + '...');
        }, 30000); // 30 second timeout for real API calls
        it('should handle conference calls with multiple LLMs', async () => {
            if (!process.env.OPENROUTER_API_KEY) {
                console.warn('Skipping real API test - no OPENROUTER_API_KEY found');
                return;
            }
            const prompt = 'What are the pros and cons of TypeScript vs JavaScript for a new web project? Keep responses concise.';
            const result = await llmManager.conference(prompt);
            expect(result).toBeDefined();
            expect(typeof result).toBe('string');
            expect(result.length).toBeGreaterThan(0);
            expect(result).toContain('LLM');
        }, 45000); // 45 second timeout for multiple API calls
        it('should process votes with real LLM responses', async () => {
            if (!process.env.OPENROUTER_API_KEY) {
                console.warn('Skipping real API test - no OPENROUTER_API_KEY found');
                return;
            }
            const options = ['Approve Plan', 'Request Changes', 'Need More Info'];
            const context = 'We are voting on a simple web application development plan. The plan includes basic HTML, CSS, and JavaScript.';
            const result = await llmManager.voteOnDecision(context, options);
            expect(result).toBeDefined();
            expect(options).toContain(result);
        }, 30000);
    });
    describe('Error Handling', () => {
        it('should handle API errors gracefully', async () => {
            // Test with invalid API key
            const originalKey = process.env.OPENROUTER_API_KEY;
            process.env.OPENROUTER_API_KEY = 'invalid-key';
            // Create new manager with invalid key
            const invalidManager = new LLMManager();
            const response = await invalidManager.queryLLM(0, 'Test message');
            expect(response).toContain('Error:');
            // Restore original key
            process.env.OPENROUTER_API_KEY = originalKey;
        }, 15000);
        it('should handle network timeouts', async () => {
            if (!process.env.OPENROUTER_API_KEY) {
                console.warn('Skipping timeout test - no OPENROUTER_API_KEY found');
                return;
            }
            // Test with a very long prompt that might timeout
            const longPrompt = 'Please write a very detailed explanation about '.repeat(100);
            const response = await llmManager.queryLLM(0, longPrompt);
            // Should either succeed or fail gracefully
            expect(response).toBeDefined();
            expect(typeof response).toBe('string');
        }, 60000);
    });
    describe('Performance', () => {
        it('should complete single LLM calls within reasonable time', async () => {
            if (!process.env.OPENROUTER_API_KEY) {
                console.warn('Skipping performance test - no OPENROUTER_API_KEY found');
                return;
            }
            const startTime = Date.now();
            await llmManager.queryLLM(0, 'Quick test message');
            const duration = Date.now() - startTime;
            // Should complete within 30 seconds for a simple query
            expect(duration).toBeLessThan(30000);
        }, 35000);
        it('should handle concurrent requests efficiently', async () => {
            if (!process.env.OPENROUTER_API_KEY) {
                console.warn('Skipping concurrent test - no OPENROUTER_API_KEY found');
                return;
            }
            const startTime = Date.now();
            const promises = [
                llmManager.queryLLM(0, 'Test message 1'),
                llmManager.queryLLM(0, 'Test message 2'),
                llmManager.queryLLM(0, 'Test message 3')
            ];
            const results = await Promise.all(promises);
            const duration = Date.now() - startTime;
            expect(results).toHaveLength(3);
            results.forEach(result => {
                expect(result).toBeDefined();
                expect(typeof result).toBe('string');
            });
            // Concurrent requests should be faster than sequential
            expect(duration).toBeLessThan(60000);
        }, 65000);
    });
});
//# sourceMappingURL=llmManager.test.js.map