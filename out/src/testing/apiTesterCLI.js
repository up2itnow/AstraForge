#!/usr/bin/env node
import { Command } from 'commander';
import { envLoader } from '../utils/envLoader.js';
import axios from 'axios';
import * as fs from 'fs';
import { ApiTesterCore } from './apiTesterCore.js';
class ApiTesterCLI {
    async testLLM(provider, apiKey, model, prompt) {
        const startTime = Date.now();
        try {
            let response;
            switch (provider) {
                case 'OpenAI':
                    response = await this.queryOpenAI(apiKey, model, prompt);
                    break;
                case 'Anthropic':
                    response = await this.queryAnthropic(apiKey, model, prompt);
                    break;
                case 'xAI':
                    response = await this.queryXAI(apiKey, model, prompt);
                    break;
                case 'OpenRouter':
                    response = await this.queryOpenRouter(apiKey, model, prompt);
                    break;
                default:
                    throw new Error(`Unsupported provider: ${provider}`);
            }
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
    async queryOpenAI(apiKey, model, prompt) {
        const response = await axios.post('https://api.openai.com/v1/chat/completions', {
            model,
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 1000
        }, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            }
        });
        return response.data.choices[0].message.content;
    }
    async queryAnthropic(apiKey, model, prompt) {
        const response = await axios.post('https://api.anthropic.com/v1/messages', {
            model,
            max_tokens: 1000,
            messages: [{ role: 'user', content: prompt }]
        }, {
            headers: {
                'x-api-key': apiKey,
                'Content-Type': 'application/json',
                'anthropic-version': '2023-06-01'
            }
        });
        return response.data.content[0].text;
    }
    async queryXAI(apiKey, model, prompt) {
        const response = await axios.post('https://api.x.ai/v1/chat/completions', {
            model,
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 1000
        }, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            }
        });
        return response.data.choices[0].message.content;
    }
    async queryOpenRouter(apiKey, model, prompt) {
        const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
            model,
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 1000
        }, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            }
        });
        return response.data.choices[0].message.content;
    }
    async testBatchLLM(provider, apiKey, model, prompts) {
        const startTime = Date.now();
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
}
const program = new Command();
const tester = new ApiTesterCLI();
const coreTester = new ApiTesterCore();
program
    .name('astraforge')
    .description('AstraForge API Testing Interface')
    .version('0.0.1');
// LLM Testing Commands
program
    .command('test')
    .description('Test LLM API functionality')
    .requiredOption('--api <provider>', 'API provider (OpenAI, Anthropic, xAI, OpenRouter)')
    .requiredOption('--key <key>', 'API key')
    .option('--model <model>', 'Model to use', 'gpt-4')
    .option('--prompt <prompt>', 'Test prompt')
    .option('--file <file>', 'File containing prompts (one per line)')
    .option('--output <file>', 'Output file for results')
    .option('--workflow <idea>', 'Test workflow simulation')
    .option('--conference <idea>', 'Test multi-LLM conferencing')
    .option('--budget <amount>', 'Budget limit for tests (default: $10)', '10')
    .option('--rounds <number>', 'Max conference rounds (default: 2)', '2')
    .allowUnknownOption(false)
    .action(async (options) => {
    try {
        // Apply environment defaults if options not provided
        if (!options.key) {
            options.key = envLoader.getOpenRouterApiKey();
            if (!options.key) {
                console.error('Error: No API key provided and none found in .env file');
                process.exit(1);
            }
            console.log('Using API key from .env file');
        }
        if (!options.model) {
            const models = envLoader.getOpenRouterModels();
            if (models.length > 0) {
                options.model = models[0]; // Use first model as default
                console.log(`Using model from .env: ${options.model}`);
            }
            else {
                options.model = 'gpt-4'; // Fallback
            }
        }
        if (options.conference) {
            await testConference(options);
        }
        else if (options.workflow) {
            await testWorkflow(options);
        }
        else if (options.file) {
            await testBatchFromFile(options);
        }
        else if (options.prompt) {
            await testSingle(options);
        }
        else {
            console.error('Error: Must provide either --prompt, --file, --workflow, or --conference');
            process.exit(1);
        }
    }
    catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
});
// Quick test commands using .env configuration
program
    .command('quick')
    .description('Quick test using your .env configuration')
    .option('--prompt <prompt>', 'Test prompt', 'Hello, can you tell me a fun fact?')
    .option('--conference <idea>', 'Test 3-LLM conference with an idea')
    .option('--budget <amount>', 'Budget limit in USD', '5')
    .action(async (options) => {
    try {
        // Validate environment configuration
        const validation = envLoader.validate();
        if (!validation.valid) {
            console.error('Environment configuration error:');
            console.error('Missing:', validation.missing.join(', '));
            console.error('Please check your .env file');
            process.exit(1);
        }
        const apiKey = envLoader.getOpenRouterApiKey();
        const models = envLoader.getOpenRouterModels();
        console.log('🚀 AstraForge Quick Test');
        console.log(`API Key: ${apiKey.substring(0, 20)}...`);
        console.log(`Models: ${models.join(', ')}`);
        console.log('─'.repeat(50));
        if (options.conference) {
            console.log(`Testing 3-LLM Conference: "${options.conference}"`);
            const testOptions = {
                api: 'OpenRouter',
                key: apiKey,
                conference: options.conference,
                budget: options.budget,
                rounds: '2'
            };
            await testConference(testOptions);
        }
        else {
            console.log(`Testing single LLM: "${options.prompt}"`);
            const testOptions = {
                api: 'OpenRouter',
                key: apiKey,
                model: models[0],
                prompt: options.prompt
            };
            await testSingle(testOptions);
        }
    }
    catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
});
// List Commands
program
    .command('list')
    .description('List supported providers and models')
    .option('--providers', 'List supported providers')
    .option('--models <provider>', 'List models for a provider')
    .action((options) => {
    if (options.providers) {
        const providers = tester.getSupportedProviders();
        console.log('Supported Providers:');
        providers.forEach(provider => console.log(`  - ${provider}`));
    }
    else if (options.models) {
        const models = tester.getSupportedModels(options.models);
        console.log(`Models for ${options.models}:`);
        models.forEach(model => console.log(`  - ${model}`));
    }
    else {
        console.log('Use --providers to list providers or --models <provider> to list models');
    }
});
async function testSingle(options) {
    console.log(`Testing ${options.api} with model ${options.model}...`);
    if (!tester.validateApiKey(options.api, options.key)) {
        console.error('Error: Invalid API key format');
        process.exit(1);
    }
    const result = await tester.testLLM(options.api, options.key, options.model, options.prompt);
    const output = {
        type: 'single_test',
        timestamp: new Date().toISOString(),
        result
    };
    if (options.output) {
        fs.writeFileSync(options.output, JSON.stringify(output, null, 2));
        console.log(`Results saved to ${options.output}`);
    }
    else {
        console.log(JSON.stringify(output, null, 2));
    }
}
async function testBatchFromFile(options) {
    console.log(`Testing ${options.api} with prompts from ${options.file}...`);
    if (!tester.validateApiKey(options.api, options.key)) {
        console.error('Error: Invalid API key format');
        process.exit(1);
    }
    if (!fs.existsSync(options.file)) {
        console.error(`Error: File ${options.file} not found`);
        process.exit(1);
    }
    const prompts = fs.readFileSync(options.file, 'utf8')
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);
    if (prompts.length === 0) {
        console.error('Error: No valid prompts found in file');
        process.exit(1);
    }
    const result = await tester.testBatchLLM(options.api, options.key, options.model, prompts);
    const output = {
        type: 'batch_test',
        timestamp: new Date().toISOString(),
        file: options.file,
        result
    };
    if (options.output) {
        fs.writeFileSync(options.output, JSON.stringify(output, null, 2));
        console.log(`Results saved to ${options.output}`);
    }
    else {
        console.log(JSON.stringify(output, null, 2));
    }
}
async function testConference(options) {
    console.log(`Testing LLM conference for: ${options.conference}`);
    console.log(`Budget limit: $${options.budget}, Max rounds: ${options.rounds}`);
    if (!tester.validateApiKey(options.api, options.key)) {
        console.error('Error: Invalid API key format');
        process.exit(1);
    }
    // Configure 3-LLM panel using your .env configuration
    const providers = envLoader.getLLMPanelConfig();
    await coreTester.initialize();
    const result = await coreTester.testConference(options.conference, providers, parseInt(options.rounds), parseFloat(options.budget));
    const output = {
        type: 'conference_test',
        timestamp: new Date().toISOString(),
        idea: options.conference,
        budget_limit: options.budget,
        result
    };
    console.log(`\n=== CONFERENCE RESULTS ==`);
    console.log(`Success: ${result.success}`);
    console.log(`Rounds: ${result.discussionRounds}`);
    console.log(`Total Cost: $${result.totalCost.toFixed(4)}`);
    console.log(`Total Tokens: ${result.totalTokens}`);
    console.log(`Conference Time: ${result.conferenceTime}ms`);
    if (result.voteResults) {
        console.log(`\nVote Results:`);
        result.voteResults.forEach((vote) => {
            console.log(`  "${vote.option}": ${vote.votes} votes`);
        });
    }
    console.log(`\nFinal Decision: ${result.finalDecision}`);
    if (options.output) {
        fs.writeFileSync(options.output, JSON.stringify(output, null, 2));
        console.log(`\nDetailed results saved to ${options.output}`);
    }
}
async function testWorkflow(options) {
    console.log(`Testing workflow simulation for: ${options.workflow}`);
    if (!tester.validateApiKey(options.api, options.key)) {
        console.error('Error: Invalid API key format');
        process.exit(1);
    }
    const results = await tester.testWorkflowSimulation(options.workflow, options.api, options.key, options.model);
    const totalCost = results.reduce((sum, r) => sum + (r.estimatedCost || 0), 0);
    console.log(`\nWorkflow completed. Total estimated cost: $${totalCost.toFixed(4)}`);
    const output = {
        type: 'workflow_simulation',
        timestamp: new Date().toISOString(),
        idea: options.workflow,
        total_cost: totalCost,
        results
    };
    if (options.output) {
        fs.writeFileSync(options.output, JSON.stringify(output, null, 2));
        console.log(`Results saved to ${options.output}`);
    }
    else {
        console.log(JSON.stringify(output, null, 2));
    }
}
// Error handling
program.exitOverride();
try {
    program.parse();
}
catch (err) {
    if (err.code === 'commander.help') {
        process.exit(0);
    }
    else {
        console.error('Error:', err.message);
        process.exit(1);
    }
}
//# sourceMappingURL=apiTesterCLI.js.map