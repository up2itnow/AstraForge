#!/usr/bin/env node

import { Command } from 'commander';
import { ApiTesterCore, TestResult, BatchTestResult, VectorTestResult } from './apiTesterCore.js';
import * as fs from 'fs';
import * as path from 'path';
import { validateAndSanitizePath, createSafePath } from '../utils/inputValidation.js';

const program = new Command();
const tester = new ApiTesterCore();

/**
 * Safely write output to a file with path validation
 */
function safeWriteOutput(outputPath: string, data: any): boolean {
  try {
    const validation = validateAndSanitizePath(outputPath);
    if (!validation.isValid) {
      console.error(`Invalid output path: ${validation.errors.join(', ')}`);
      return false;
    }

    // Ensure we're writing to current directory or a subdirectory
    const currentDir = process.cwd();
    const safePath = createSafePath(currentDir, validation.sanitizedPath!);
    
    if (!safePath) {
      console.error('Failed to create safe output path');
      return false;
    }

    // Create directory if needed
    const dir = path.dirname(safePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(safePath, JSON.stringify(data, null, 2));
    console.log(`Results saved to ${safePath}`);
    return true;
  } catch (error) {
    console.error(`Error writing output file: ${error}`);
    return false;
  }
}

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
      await tester.initialize();

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
    } finally {
      await tester.cleanup();
    }
  });

// Vector Testing Commands
program
  .command('vector')
  .description('Test vector database queries')
  .requiredOption('--query <query>', 'Query text')
  .option('--topk <number>', 'Number of results to return', '5')
  .option('--output <file>', 'Output file for results')
  .action(async options => {
    try {
      await tester.initialize();
      await testVector(options);
    } catch (error) {
      console.error('Error:', error);
      process.exit(1);
    } finally {
      await tester.cleanup();
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
    if (!safeWriteOutput(options.output, output)) {
      process.exit(1);
    }
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
    if (!safeWriteOutput(options.output, output)) {
      process.exit(1);
    }
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
    if (!safeWriteOutput(options.output, output)) {
      process.exit(1);
    }
  } else {
    console.log(JSON.stringify(output, null, 2));
  }
}

async function testVector(options: any) {
  console.log(`Testing vector query: "${options.query}"`);

  const result = await tester.testVectorQuery(options.query, parseInt(options.topk));

  const output = {
    type: 'vector_test',
    timestamp: new Date().toISOString(),
    result,
  };

  if (options.output) {
    if (!safeWriteOutput(options.output, output)) {
      process.exit(1);
    }
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
