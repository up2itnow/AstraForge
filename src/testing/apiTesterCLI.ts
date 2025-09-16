#!/usr/bin/env node

import { Command } from 'commander';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

interface TestResult {
  success: boolean;
  response?: string;
  error?: string;
  latency: number;
  timestamp: number;
  provider: string;
  model?: string;
}

interface BatchTestResult {
  total: number;
  successful: number;
  failed: number;
  results: TestResult[];
  averageLatency: number;
  totalTime: number;
}

class ApiTesterCLI {
  async testLLM(
    provider: 'OpenAI' | 'Anthropic' | 'xAI' | 'OpenRouter',
    apiKey: string,
    model: string,
    prompt: string
  ): Promise<TestResult> {
    const startTime = Date.now();

    try {
      let response: string;

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
        model,
      };
    } catch (error: any) {
      const latency = Date.now() - startTime;
      return {
        success: false,
        error: error.message,
        latency,
        timestamp: Date.now(),
        provider,
        model,
      };
    }
  }

  private async queryOpenAI(apiKey: string, model: string, prompt: string): Promise<string> {
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1000,
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );
    return response.data.choices[0].message.content;
  }

  private async queryAnthropic(apiKey: string, model: string, prompt: string): Promise<string> {
    const response = await axios.post(
      'https://api.anthropic.com/v1/messages',
      {
        model,
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }],
      },
      {
        headers: {
          'x-api-key': apiKey,
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01',
        },
      }
    );
    return response.data.content[0].text;
  }

  private async queryXAI(apiKey: string, model: string, prompt: string): Promise<string> {
    const response = await axios.post(
      'https://api.x.ai/v1/chat/completions',
      {
        model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1000,
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );
    return response.data.choices[0].message.content;
  }

  private async queryOpenRouter(apiKey: string, model: string, prompt: string): Promise<string> {
    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1000,
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );
    return response.data.choices[0].message.content;
  }

  async testBatchLLM(
    provider: 'OpenAI' | 'Anthropic' | 'xAI' | 'OpenRouter',
    apiKey: string,
    model: string,
    prompts: string[]
  ): Promise<BatchTestResult> {
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
    const averageLatency =
      batchResults.reduce((sum, r) => sum + r.latency, 0) / batchResults.length;

    return {
      total: batchResults.length,
      successful,
      failed,
      results: batchResults,
      averageLatency,
      totalTime,
    };
  }

  async testWorkflowSimulation(
    idea: string,
    provider: 'OpenAI' | 'Anthropic' | 'xAI' | 'OpenRouter',
    apiKey: string,
    model: string
  ): Promise<TestResult[]> {
    const results: TestResult[] = [];

    // Simulate the workflow phases
    const phases = ['Planning', 'Prototyping', 'Testing', 'Deployment'];

    for (const phase of phases) {
      const prompt = `Execute ${phase} for project: ${idea}. Provide a brief summary.`;
      const result = await this.testLLM(provider, apiKey, model, prompt);
      results.push({
        ...result,
        response: `Phase: ${phase}\n${result.response || result.error}`,
      });
    }

    return results;
  }

  validateApiKey(provider: string, apiKey: string): boolean {
    if (!apiKey || apiKey.trim().length === 0) {
      return false;
    }

    // Basic validation patterns
    const patterns = {
      OpenAI: /^sk-[a-zA-Z0-9]{32,}$/,
      Anthropic: /^sk-ant-[a-zA-Z0-9]{32,}$/,
      xAI: /^xai-[a-zA-Z0-9]{32,}$/,
      OpenRouter: /^sk-or-[a-zA-Z0-9]{32,}$/,
    };

    const pattern = patterns[provider as keyof typeof patterns];
    return pattern ? pattern.test(apiKey) : apiKey.length > 10;
  }

  getSupportedProviders(): string[] {
    return ['OpenAI', 'Anthropic', 'xAI', 'OpenRouter'];
  }

  getSupportedModels(provider: string): string[] {
    const models = {
      OpenAI: ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo'],
      Anthropic: ['claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku'],
      xAI: ['grok-beta', 'grok-pro'],
      OpenRouter: ['gpt-4', 'gpt-3.5-turbo', 'claude-3-opus', 'claude-3-sonnet'],
    };

    return models[provider as keyof typeof models] || [];
  }
}

const program = new Command();
const tester = new ApiTesterCLI();

program.name('astraforge').description('AstraForge API Testing Interface').version('0.0.1');

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
  .action(async options => {
    try {
      if (options.workflow) {
        await testWorkflow(options);
      } else if (options.file) {
        await testBatchFromFile(options);
      } else if (options.prompt) {
        await testSingle(options);
      } else {
        console.error('Error: Must provide either --prompt, --file, or --workflow');
        process.exit(1);
      }
    } catch (error) {
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
  .action(options => {
    if (options.providers) {
      const providers = tester.getSupportedProviders();
      console.log('Supported Providers:');
      providers.forEach(provider => console.log(`  - ${provider}`));
    } else if (options.models) {
      const models = tester.getSupportedModels(options.models);
      console.log(`Models for ${options.models}:`);
      models.forEach(model => console.log(`  - ${model}`));
    } else {
      console.log('Use --providers to list providers or --models <provider> to list models');
    }
  });

async function testSingle(options: any) {
  console.log(`Testing ${options.api} with model ${options.model}...`);

  if (!tester.validateApiKey(options.api, options.key)) {
    console.error('Error: Invalid API key format');
    process.exit(1);
  }

  const result = await tester.testLLM(
    options.api as any,
    options.key,
    options.model,
    options.prompt
  );

  const output = {
    type: 'single_test',
    timestamp: new Date().toISOString(),
    result,
  };

  if (options.output) {
    fs.writeFileSync(options.output, JSON.stringify(output, null, 2));
    console.log(`Results saved to ${options.output}`);
  } else {
    console.log(JSON.stringify(output, null, 2));
  }
}

async function testBatchFromFile(options: any) {
  console.log(`Testing ${options.api} with prompts from ${options.file}...`);

  if (!tester.validateApiKey(options.api, options.key)) {
    console.error('Error: Invalid API key format');
    process.exit(1);
  }

  if (!fs.existsSync(options.file)) {
    console.error(`Error: File ${options.file} not found`);
    process.exit(1);
  }

  const prompts = fs
    .readFileSync(options.file, 'utf8')
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);

  if (prompts.length === 0) {
    console.error('Error: No valid prompts found in file');
    process.exit(1);
  }

  const result = await tester.testBatchLLM(options.api as any, options.key, options.model, prompts);

  const output = {
    type: 'batch_test',
    timestamp: new Date().toISOString(),
    file: options.file,
    result,
  };

  if (options.output) {
    fs.writeFileSync(options.output, JSON.stringify(output, null, 2));
    console.log(`Results saved to ${options.output}`);
  } else {
    console.log(JSON.stringify(output, null, 2));
  }
}

async function testWorkflow(options: any) {
  console.log(`Testing workflow simulation for: ${options.workflow}`);

  if (!tester.validateApiKey(options.api, options.key)) {
    console.error('Error: Invalid API key format');
    process.exit(1);
  }

  const results = await tester.testWorkflowSimulation(
    options.workflow,
    options.api as any,
    options.key,
    options.model
  );

  const output = {
    type: 'workflow_simulation',
    timestamp: new Date().toISOString(),
    idea: options.workflow,
    results,
  };

  if (options.output) {
    fs.writeFileSync(options.output, JSON.stringify(output, null, 2));
    console.log(`Results saved to ${options.output}`);
  } else {
    console.log(JSON.stringify(output, null, 2));
  }
}

// Error handling
program.exitOverride();

try {
  program.parse();
} catch (err: any) {
  if (err.code === 'commander.help') {
    process.exit(0);
  } else {
    console.error('Error:', err.message);
    process.exit(1);
  }
}
