import { LLMManager } from '../llm/llmManager.js';
import { MemoryOrchestrator } from '../db/memoryOrchestrator.js';

export interface TestResult {
  success: boolean;
  response?: string;
  error?: string;
  latency: number;
  timestamp: number;
  provider: string;
  model?: string;
}

export interface BatchTestResult {
  total: number;
  successful: number;
  failed: number;
  results: TestResult[];
  averageLatency: number;
  totalTime: number;
}

export interface VectorTestResult {
  success: boolean;
  results: Array<{
    id: string;
    similarity: number;
    metadata: any;
  }>;
  query: string;
  latency: number;
}

export class ApiTesterCore {
  private llmManager: LLMManager;
  private memoryOrchestrator: MemoryOrchestrator;
  private testMode: boolean = false;

  constructor() {
    this.llmManager = new LLMManager();
    this.memoryOrchestrator = new MemoryOrchestrator(process.cwd());
  }

  async initialize(): Promise<void> {
    try {
      await this.memoryOrchestrator.init();
      this.testMode = true;
    } catch (error) {
      console.warn('Failed to initialize memory orchestrator for testing:', error);
    }
  }

  async testLLM(
    provider: 'OpenAI' | 'Anthropic' | 'xAI' | 'OpenRouter',
    apiKey: string,
    model: string,
    prompt: string
  ): Promise<TestResult> {
    const startTime = Date.now();

    try {
      // Configure LLM manager for testing
      const testConfig = {
        provider,
        key: apiKey,
        model,
        role: 'primary' as const,
      };

      // Temporarily set the panel for testing
      (this.llmManager as any).panel = [testConfig];

      const response = await this.llmManager.queryLLM(0, prompt);
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

  async testVectorQuery(query: string, topK: number = 5): Promise<VectorTestResult> {
    const startTime = Date.now();

    try {
      const embedding = await this.memoryOrchestrator.getEmbedding(query);
      const results = await this.memoryOrchestrator.queryEmbedding(embedding, topK);

      const latency = Date.now() - startTime;

      return {
        success: true,
        results: results.map(r => ({
          id: r.id,
          similarity: r.similarity,
          metadata: r.metadata,
        })),
        query,
        latency,
      };
    } catch (_error: any) {
      const latency = Date.now() - startTime;
      return {
        success: false,
        results: [],
        query,
        latency,
      };
    }
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

  async cleanup(): Promise<void> {
    try {
      await this.memoryOrchestrator.close();
    } catch (error) {
      console.warn('Cleanup error:', error);
    }
  }
}
