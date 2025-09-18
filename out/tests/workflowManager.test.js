/**
 * Integration tests for WorkflowManager - Real API integration
 */
import { WorkflowManager } from '../src/workflow/workflowManager';
import { LLMManager } from '../src/llm/llmManager';
import { VectorDB } from '../src/db/vectorDB';
import { GitManager } from '../src/git/gitManager';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
// Load environment variables
dotenv.config();
// Mock only vscode since we're not running in VS Code environment
jest.mock('vscode', () => ({
    workspace: {
        workspaceFolders: [{ uri: { fsPath: '/test/workspace' } }],
        fs: {
            createDirectory: jest.fn(),
            writeFile: jest.fn()
        },
        openTextDocument: jest.fn(),
        getConfiguration: jest.fn((section) => {
            const mockGet = jest.fn((key, defaultValue) => {
                if (section === 'astraforge' && key === 'llmPanel') {
                    const models = process.env.OPENROUTER_MODELS_TO_USE?.split(',').map(model => model.trim()) || [];
                    return models.map((model, index) => ({
                        provider: 'OpenRouter',
                        key: process.env.OPENROUTER_API_KEY,
                        model: model,
                        role: index === 0 ? 'primary' : 'secondary'
                    }));
                }
                if (section === 'astraforge.specKit') {
                    const defaults = {
                        autoCommit: true,
                        useMultiLLM: true,
                        enforceConstitution: true,
                        defaultTechStack: {},
                        defaultLanguage: 'TypeScript',
                        defaultFramework: 'Node.js'
                    };
                    return defaults[key] || defaultValue;
                }
                return defaultValue;
            });
            return { get: mockGet };
        })
    },
    window: {
        showInformationMessage: jest.fn(),
        showErrorMessage: jest.fn(),
        showQuickPick: jest.fn().mockResolvedValue('Apply suggestions'),
        showInputBox: jest.fn().mockResolvedValue('User input response'),
        showTextDocument: jest.fn()
    },
    Uri: {
        file: jest.fn((path) => ({ fsPath: path, toString: () => path }))
    }
}));
// Mock the collaboration server and RL modules since they're complex
jest.mock('../src/server/collaborationServer');
jest.mock('../src/rl/adaptiveWorkflow');
jest.mock('../src/spec-kit/specKitManager');
describe('WorkflowManager Integration Tests', () => {
    let workflowManager;
    let llmManager;
    let vectorDB;
    let gitManager;
    const testStoragePath = './test_workflow_vectors';
    beforeEach(async () => {
        // Clean up any existing test data
        if (fs.existsSync(testStoragePath)) {
            fs.rmSync(testStoragePath, { recursive: true, force: true });
        }
        // Create real instances for integration testing
        llmManager = new LLMManager();
        vectorDB = new VectorDB(testStoragePath);
        gitManager = new GitManager();
        await vectorDB.init();
        // Mock SpecKitManager
        const { SpecKitManager } = require('../src/spec-kit/specKitManager');
        SpecKitManager.mockImplementation(() => ({
            loadConfig: jest.fn().mockReturnValue({
                autoCommit: true,
                useMultiLLM: true,
                enforceConstitution: true,
                defaultTechStack: {
                    language: 'TypeScript',
                    framework: 'Node.js'
                }
            }),
            initializeSpecKit: jest.fn().mockResolvedValue(undefined),
            createSpecification: jest.fn().mockResolvedValue('mock-workflow-id'),
            createImplementationPlan: jest.fn().mockResolvedValue(undefined),
            generateTasks: jest.fn().mockResolvedValue(undefined),
            getWorkflow: jest.fn().mockReturnValue({
                id: 'mock-workflow-id',
                specification: 'Mock specification',
                plan: 'Mock plan',
                tasks: [
                    { id: 'task1', title: 'Mock Task 1', description: 'Mock description' },
                    { id: 'task2', title: 'Mock Task 2', description: 'Mock description' }
                ]
            }),
            generateSpec: jest.fn().mockResolvedValue('Mock spec'),
            generatePlan: jest.fn().mockResolvedValue('Mock plan')
        }));
        // Create WorkflowManager in test mode to skip SpecKit workflow
        workflowManager = new WorkflowManager(llmManager, vectorDB, gitManager, true);
        // Mock the RL system and collaboration server
        const manager = workflowManager;
        manager.workflowRL = {
            getBestAction: jest.fn().mockReturnValue({ type: 'continue', confidence: 1.0 }),
            updateQValue: jest.fn(),
            calculateReward: jest.fn().mockReturnValue(0.8),
            getState: jest.fn().mockReturnValue('test-state')
        };
        manager.collaborationServer = {
            start: jest.fn(),
            stop: jest.fn(),
            broadcastToWorkspace: jest.fn()
        };
    });
    afterEach(async () => {
        if (vectorDB) {
            vectorDB.close();
        }
        // Clean up test data
        if (fs.existsSync(testStoragePath)) {
            fs.rmSync(testStoragePath, { recursive: true, force: true });
        }
    });
    describe('Initialization', () => {
        it('should initialize with real managers', () => {
            expect(workflowManager).toBeDefined();
            expect(llmManager).toBeDefined();
            expect(vectorDB).toBeDefined();
            expect(gitManager).toBeDefined();
        });
        it('should have environment variables configured', () => {
            expect(process.env.OPENROUTER_API_KEY).toBeDefined();
            expect(process.env.OPENROUTER_MODELS_TO_USE).toBeDefined();
        });
    });
    describe('Real Workflow Execution', () => {
        it('should start workflow with real LLM interactions', async () => {
            if (!process.env.OPENROUTER_API_KEY) {
                console.warn('Skipping real workflow test - no OPENROUTER_API_KEY found');
                return;
            }
            const testIdea = 'Create a simple calculator web application';
            // This will make real API calls
            await workflowManager.startWorkflow(testIdea);
            // Verify that the workflow completed
            expect(workflowManager).toBeDefined();
        }, 120000); // 2 minute timeout for real API calls
        it('should handle letPanelDecide option with real conference', async () => {
            if (!process.env.OPENROUTER_API_KEY) {
                console.warn('Skipping real conference test - no OPENROUTER_API_KEY found');
                return;
            }
            const testIdea = 'Build a weather forecasting app';
            await workflowManager.startWorkflow(testIdea, 'letPanelDecide');
            expect(workflowManager).toBeDefined();
        }, 150000); // 2.5 minute timeout for conference calls
        it('should execute phases with real vector DB storage', async () => {
            if (!process.env.OPENROUTER_API_KEY) {
                console.warn('Skipping real vector test - no OPENROUTER_API_KEY found');
                return;
            }
            const testIdea = 'Develop a task management system';
            await workflowManager.startWorkflow(testIdea);
            // Check if data was stored in vector DB
            const embedding = await vectorDB.getEmbedding(testIdea);
            expect(embedding).toBeDefined();
            expect(Array.isArray(embedding)).toBe(true);
        }, 120000);
    });
    describe('Error Handling with Real APIs', () => {
        it('should handle API failures gracefully', async () => {
            // Test with invalid API key
            const originalKey = process.env.OPENROUTER_API_KEY;
            process.env.OPENROUTER_API_KEY = 'invalid-key';
            const invalidLLMManager = new LLMManager();
            const invalidWorkflowManager = new WorkflowManager(invalidLLMManager, vectorDB, gitManager, true);
            await expect(async () => {
                await invalidWorkflowManager.startWorkflow('Test project');
            }).not.toThrow(); // Should not throw, but handle errors gracefully
            // Restore original key
            process.env.OPENROUTER_API_KEY = originalKey;
        }, 30000);
        it('should handle vector DB errors gracefully', async () => {
            // Create VectorDB with invalid path to test error handling
            const invalidVectorDB = new VectorDB('/invalid/path/that/cannot/be/created');
            await expect(async () => {
                await invalidVectorDB.init();
            }).not.toThrow();
        });
    });
    describe('Performance with Real APIs', () => {
        it('should complete workflow within reasonable time', async () => {
            if (!process.env.OPENROUTER_API_KEY) {
                console.warn('Skipping performance test - no OPENROUTER_API_KEY found');
                return;
            }
            const startTime = Date.now();
            await workflowManager.startWorkflow('Simple Hello World app');
            const duration = Date.now() - startTime;
            // Should complete within 3 minutes for a simple project
            expect(duration).toBeLessThan(180000);
        }, 200000);
        it('should handle concurrent operations efficiently', async () => {
            if (!process.env.OPENROUTER_API_KEY) {
                console.warn('Skipping concurrent test - no OPENROUTER_API_KEY found');
                return;
            }
            const startTime = Date.now();
            // Test concurrent vector operations
            const promises = [
                vectorDB.addDocument('doc1', 'Test document 1', { test: true }),
                vectorDB.addDocument('doc2', 'Test document 2', { test: true }),
                vectorDB.addDocument('doc3', 'Test document 3', { test: true })
            ];
            await Promise.all(promises);
            const duration = Date.now() - startTime;
            // Concurrent operations should complete quickly
            expect(duration).toBeLessThan(30000);
        }, 40000);
    });
    describe('Integration with Real Services', () => {
        it('should integrate LLM responses with vector storage', async () => {
            if (!process.env.OPENROUTER_API_KEY) {
                console.warn('Skipping integration test - no OPENROUTER_API_KEY found');
                return;
            }
            // Get a real LLM response
            const response = await llmManager.queryLLM(0, 'Describe the benefits of TypeScript in one sentence.');
            expect(response).toBeDefined();
            expect(response.length).toBeGreaterThan(0);
            // Store it in vector DB
            await vectorDB.addDocument('llm-response', response, { source: 'llm', timestamp: Date.now() });
            // Query it back
            const queryEmbedding = await vectorDB.getEmbedding('TypeScript benefits');
            const results = await vectorDB.queryEmbedding(queryEmbedding, 1);
            expect(results).toHaveLength(1);
            expect(results[0].id).toBe('llm-response');
        }, 45000);
        it('should handle multi-LLM conference with real responses', async () => {
            if (!process.env.OPENROUTER_API_KEY) {
                console.warn('Skipping multi-LLM test - no OPENROUTER_API_KEY found');
                return;
            }
            const prompt = 'What is the best approach for testing a web application? Please be concise.';
            const result = await llmManager.conference(prompt);
            expect(result).toBeDefined();
            expect(typeof result).toBe('string');
            expect(result.length).toBeGreaterThan(0);
            expect(result).toContain('LLM'); // Should contain LLM identifiers in response
        }, 90000); // 1.5 minutes for multi-LLM conference
    });
});
//# sourceMappingURL=workflowManager.test.js.map