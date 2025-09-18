import { LLMManager } from '../llm/llmManager.js';
import { VectorDB } from '../db/vectorDB.js';
import { encoding_for_model } from 'tiktoken';
import axios from 'axios';
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
            // Estimate input tokens and cost
            const inputTokens = this.estimateTokens(prompt, model);
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
            // Estimate output tokens and total cost
            const outputTokens = this.estimateTokens(response, model);
            const estimatedCost = this.estimateCost(inputTokens, outputTokens, model);
            return {
                success: true,
                response,
                latency,
                timestamp: Date.now(),
                provider,
                model,
                tokenCount: inputTokens + outputTokens,
                estimatedCost
            };
        }
        catch (error) {
            const latency = Date.now() - startTime;
            const inputTokens = this.estimateTokens(prompt, model);
            return {
                success: false,
                error: error.message,
                latency,
                timestamp: Date.now(),
                provider,
                model,
                tokenCount: inputTokens,
                estimatedCost: this.estimateCost(inputTokens, 0, model)
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
        const totalCost = batchResults.reduce((sum, r) => sum + (r.estimatedCost || 0), 0);
        return {
            total: batchResults.length,
            successful,
            failed,
            results: batchResults,
            averageLatency,
            totalTime,
            totalCost
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
    async testConference(idea, providers, maxRounds = 2, budgetLimit = 10.0) {
        const startTime = Date.now();
        let totalCost = 0;
        let totalTokens = 0;
        const participantResponses = [];
        try {
            // Configure LLM panel for conferencing
            this.llmManager.panel = providers.map(p => ({
                provider: p.provider,
                key: p.apiKey,
                model: p.model,
                role: p.role === 'concept' ? 'primary' : 'secondary'
            }));
            let discussion = idea;
            let roundCount = 0;
            // Conference rounds with budget monitoring
            for (let round = 0; round < maxRounds; round++) {
                if (totalCost >= budgetLimit) {
                    console.warn(`Budget limit reached: $${totalCost.toFixed(4)}`);
                    break;
                }
                console.log(`Conference Round ${round + 1}...`);
                const roundStartTime = Date.now();
                // Get conference discussion from LLMManager
                const conferenceResult = await this.llmManager.conference(discussion);
                // Extract individual responses and estimate costs
                const responses = conferenceResult.split('\n\nLLM').slice(1);
                for (let i = 0; i < responses.length; i++) {
                    const response = responses[i].split(': ')[1] || responses[i];
                    const tokens = this.estimateTokens(response, providers[i]?.model || 'gpt-4');
                    const cost = this.estimateCost(0, tokens, providers[i]?.model || 'gpt-4');
                    participantResponses.push({
                        llm: i + 1,
                        role: providers[i]?.role || 'unknown',
                        response: response.substring(0, 200) + (response.length > 200 ? '...' : ''),
                        tokens,
                        cost
                    });
                    totalTokens += tokens;
                    totalCost += cost;
                }
                discussion = conferenceResult;
                roundCount++;
                const roundTime = Date.now() - roundStartTime;
                if (roundTime > 300000) { // 5 minute timeout
                    console.warn('Conference round timeout reached');
                    break;
                }
            }
            // Voting phase
            const options = participantResponses.slice(-providers.length).map(p => p.response.split('.')[0] + '.');
            let finalDecision = '';
            let voteResults = [];
            if (options.length > 1) {
                try {
                    finalDecision = await this.llmManager.voteOnDecision(discussion, options);
                    // Simulate vote counting (in real implementation, this would be actual votes)
                    voteResults = options.map(option => ({
                        option: option.substring(0, 50) + '...',
                        votes: Math.floor(Math.random() * providers.length) + 1
                    }));
                }
                catch (error) {
                    finalDecision = options[0]; // Fallback to first option
                }
            }
            else {
                finalDecision = discussion;
            }
            const conferenceTime = Date.now() - startTime;
            return {
                success: true,
                discussionRounds: roundCount,
                finalDecision: finalDecision.substring(0, 500) + (finalDecision.length > 500 ? '...' : ''),
                participantResponses,
                totalTokens,
                totalCost,
                conferenceTime,
                voteResults
            };
        }
        catch (error) {
            return {
                success: false,
                discussionRounds: 0,
                finalDecision: `Conference failed: ${error.message}`,
                participantResponses,
                totalTokens,
                totalCost,
                conferenceTime: Date.now() - startTime
            };
        }
    }
    validateApiKey(provider, apiKey) {
        if (!apiKey || apiKey.trim().length === 0) {
            return false;
        }
        // Basic validation patterns
        const patterns = {
            'OpenAI': /^sk-[a-zA-Z0-9_-]{20,}$/,
            'Anthropic': /^sk-ant-[a-zA-Z0-9_-]{20,}$/,
            'xAI': /^xai-[a-zA-Z0-9_-]{20,}$/,
            'OpenRouter': /^sk-or-[a-zA-Z0-9_-]{20,}$/
        };
        const pattern = patterns[provider];
        return pattern ? pattern.test(apiKey) : apiKey.length > 10;
    }
    async validateApiKeyWithCall(provider, apiKey) {
        try {
            // Make a minimal API call to verify key
            switch (provider) {
                case 'OpenAI':
                    await axios.get('https://api.openai.com/v1/models', {
                        headers: { 'Authorization': `Bearer ${apiKey}` },
                        timeout: 5000
                    });
                    break;
                case 'Anthropic':
                    // Anthropic doesn't have a models endpoint, use minimal message call
                    await axios.post('https://api.anthropic.com/v1/messages', {
                        model: 'claude-3-haiku-20240307',
                        max_tokens: 1,
                        messages: [{ role: 'user', content: 'hi' }]
                    }, {
                        headers: {
                            'x-api-key': apiKey,
                            'Content-Type': 'application/json',
                            'anthropic-version': '2023-06-01'
                        },
                        timeout: 5000
                    });
                    break;
                case 'OpenRouter':
                    await axios.get('https://openrouter.ai/api/v1/models', {
                        headers: { 'Authorization': `Bearer ${apiKey}` },
                        timeout: 5000
                    });
                    break;
                default:
                    return { valid: false, error: 'Unsupported provider for real validation' };
            }
            return { valid: true };
        }
        catch (error) {
            return {
                valid: false,
                error: error.response?.status === 401 ? 'Invalid API key' : error.message
            };
        }
    }
    estimateTokens(text, model = 'gpt-4') {
        try {
            // Use tiktoken for accurate token counting
            const enc = encoding_for_model(model);
            const tokens = enc.encode(text);
            enc.free();
            return tokens.length;
        }
        catch {
            // Fallback: rough estimation (1 token ≈ 4 characters)
            return Math.ceil(text.length / 4);
        }
    }
    estimateCost(inputTokens, outputTokens, model) {
        // Cost per 1K tokens (as of 2024)
        const costs = {
            'gpt-4': { input: 0.03, output: 0.06 },
            'gpt-4-turbo': { input: 0.01, output: 0.03 },
            'gpt-3.5-turbo': { input: 0.001, output: 0.002 },
            'claude-3-opus': { input: 0.015, output: 0.075 },
            'claude-3-sonnet': { input: 0.003, output: 0.015 },
            'claude-3-haiku': { input: 0.00025, output: 0.00125 },
            'grok-beta': { input: 0.005, output: 0.015 }
        };
        const modelCost = costs[model] || costs['gpt-4'];
        return (inputTokens * modelCost.input + outputTokens * modelCost.output) / 1000;
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