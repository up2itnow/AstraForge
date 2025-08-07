import { LLMManager } from '../llm/llmManager.js';
import { VectorDB } from '../db/vectorDB.js';
export class ApiTesterCore {
    constructor() {
        this.testMode = false;
        this.llmManager = new LLMManager();
        this.vectorDB = new VectorDB(process.cwd());
    }
    async initialize() {
        try {
            await this.vectorDB.init();
            this.testMode = true;
        }
        catch (error) {
            console.warn('Failed to initialize vector DB for testing:', error);
        }
    }
    async testLLM(provider, apiKey, model, prompt) {
        const startTime = Date.now();
        try {
            // Configure LLM manager for testing
            const testConfig = {
                provider,
                key: apiKey,
                model,
                role: 'primary'
            };
            // Temporarily set the panel for testing
            this.llmManager.panel = [testConfig];
            const response = await this.llmManager.queryLLM(0, prompt);
            const latency = Date.now() - startTime;
            return {
                success: true,
                response,
                latency,
                timestamp: Date.now(),
                provider,
                model
            };
        }
        catch (error) {
            const latency = Date.now() - startTime;
            return {
                success: false,
                error: error.message,
                latency,
                timestamp: Date.now(),
                provider,
                model
            };
        }
    }
    async testBatchLLM(provider, apiKey, model, prompts) {
        const startTime = Date.now();
        const results = [];
        // Process prompts in parallel for better performance
        const testPromises = prompts.map(async (prompt, index) => {
            const result = await this.testLLM(provider, apiKey, model, prompt);
            return { ...result, index };
        });
        const batchResults = await Promise.all(testPromises);
        const totalTime = Date.now() - startTime;
        const successful = batchResults.filter(r => r.success).length;
        const failed = batchResults.length - successful;
        const averageLatency = batchResults.reduce((sum, r) => sum + r.latency, 0) / batchResults.length;
        return {
            total: batchResults.length,
            successful,
            failed,
            results: batchResults,
            averageLatency,
            totalTime
        };
    }
    async testVectorQuery(query, topK = 5) {
        const startTime = Date.now();
        try {
            const embedding = await this.vectorDB.getEmbedding(query);
            const results = await this.vectorDB.queryEmbedding(embedding, topK);
            const latency = Date.now() - startTime;
            return {
                success: true,
                results: results.map(r => ({
                    id: r.id,
                    similarity: r.similarity,
                    metadata: r.metadata
                })),
                query,
                latency
            };
        }
        catch (error) {
            const latency = Date.now() - startTime;
            return {
                success: false,
                results: [],
                query,
                latency
            };
        }
    }
    async testWorkflowSimulation(idea, provider, apiKey, model) {
        const results = [];
        // Simulate the workflow phases
        const phases = ['Planning', 'Prototyping', 'Testing', 'Deployment'];
        for (const phase of phases) {
            const prompt = `Execute ${phase} for project: ${idea}. Provide a brief summary.`;
            const result = await this.testLLM(provider, apiKey, model, prompt);
            results.push({
                ...result,
                response: `Phase: ${phase}\n${result.response || result.error}`
            });
        }
        return results;
    }
    validateApiKey(provider, apiKey) {
        if (!apiKey || apiKey.trim().length === 0) {
            return false;
        }
        // Basic validation patterns
        const patterns = {
            'OpenAI': /^sk-[a-zA-Z0-9]{32,}$/,
            'Anthropic': /^sk-ant-[a-zA-Z0-9]{32,}$/,
            'xAI': /^xai-[a-zA-Z0-9]{32,}$/,
            'OpenRouter': /^sk-or-[a-zA-Z0-9]{32,}$/
        };
        const pattern = patterns[provider];
        return pattern ? pattern.test(apiKey) : apiKey.length > 10;
    }
    getSupportedProviders() {
        return ['OpenAI', 'Anthropic', 'xAI', 'OpenRouter'];
    }
    getSupportedModels(provider) {
        const models = {
            'OpenAI': ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo'],
            'Anthropic': ['claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku'],
            'xAI': ['grok-beta', 'grok-pro'],
            'OpenRouter': ['gpt-4', 'gpt-3.5-turbo', 'claude-3-opus', 'claude-3-sonnet']
        };
        return models[provider] || [];
    }
    async cleanup() {
        try {
            this.vectorDB.close();
        }
        catch (error) {
            console.warn('Cleanup error:', error);
        }
    }
}
//# sourceMappingURL=apiTesterCore.js.map