/**
 * Environment variable loader utility for AstraForge API Tester
 */
import * as fs from 'fs';
import * as path from 'path';
import { logger } from './logger';

export interface EnvConfig {
  // API Keys
  OPENROUTER_API_KEY?: string;
  OPENAI_API_KEY?: string;
  ANTHROPIC_API_KEY?: string;
  XAI_API_KEY?: string;
  HUGGINGFACE_API_TOKEN?: string;
  
  // Model Configuration
  OPENROUTER_MODELS_TO_USE?: string;
  
  // AstraForge Configuration
  DEFAULT_LLM_PROVIDER?: string;
  AUTO_COMMIT_ENABLED?: string;
  VECTOR_DB_PATH?: string;
  DEBUG_MODE?: string;
  
  // Spec-Driven Development
  ENFORCE_CONSTITUTION?: string;
  MIN_TEST_COVERAGE?: string;
  ENABLE_PARALLEL_TASKS?: string;
  
  // Security Settings
  USE_SECURE_STORAGE?: string;
  API_TIMEOUT?: string;
  MAX_TOKENS_PER_REQUEST?: string;
  
  // Usage and Monitoring
  TRACK_API_USAGE?: string;
  DAILY_BUDGET_LIMIT?: string;
  ENABLE_PERFORMANCE_MONITORING?: string;
  
  // Collaboration Server
  ENABLE_COLLABORATION_SERVER?: string;
  COLLABORATION_SERVER_PORT?: string;
  
  // Development Preferences
  DEFAULT_LANGUAGE?: string;
  DEFAULT_TESTING_FRAMEWORK?: string;
  DEFAULT_PROJECT_TYPE?: string;
  AUTO_FORMAT_CODE?: string;
  AUTO_ORGANIZE_IMPORTS?: string;
  
  // UI Preferences
  SHOW_INLINE_SUGGESTIONS?: string;
  ENABLE_SYNTAX_HIGHLIGHTING?: string;
  CODE_THEME?: string;
  SHOW_PROGRESS_NOTIFICATIONS?: string;
}

export class EnvLoader {
  private config: EnvConfig = {};

  constructor(private projectRoot: string = process.cwd()) {
    this.loadEnvFile();
  }

  private loadEnvFile(): void {
    const envPath = path.join(this.projectRoot, '.env');
    
    if (!fs.existsSync(envPath)) {
      logger.warn('No .env file found. Using system environment variables only.');
      return;
    }

    try {
      const envContent = fs.readFileSync(envPath, 'utf8');
      const lines = envContent.split('\n');

      for (const line of lines) {
        const trimmedLine = line.trim();
        
        // Skip empty lines and comments
        if (!trimmedLine || trimmedLine.startsWith('#')) {
          continue;
        }

        const [key, ...valueParts] = trimmedLine.split('=');
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=').trim();
          this.config[key.trim() as keyof EnvConfig] = value;
        }
      }
    } catch (error) {
      logger.error('Error reading .env file:', error);
    }
  }

  /**
   * Get environment variable with fallback to system env
   */
  get(key: keyof EnvConfig): string | undefined {
    return this.config[key] || process.env[key];
  }

  /**
   * Get OpenRouter API key
   */
  getOpenRouterApiKey(): string | undefined {
    return this.get('OPENROUTER_API_KEY');
  }

  /**
   * Get OpenRouter models as array
   */
  getOpenRouterModels(): string[] {
    const modelsString = this.get('OPENROUTER_MODELS_TO_USE');
    if (!modelsString) {
      return [];
    }

    return modelsString
      .split(',')
      .map(model => model.trim())
      .filter(model => model.length > 0);
  }

  /**
   * Get configuration for 3-LLM panel based on your env
   */
  getLLMPanelConfig(): Array<{
    provider: 'OpenAI' | 'Anthropic' | 'xAI' | 'OpenRouter';
    apiKey: string;
    model: string;
    role: string;
  }> {
    const apiKey = this.getOpenRouterApiKey();
    const models = this.getOpenRouterModels();

    if (!apiKey) {
      throw new Error('Missing API key in .env file. Please ensure OPENROUTER_API_KEY is set.');
    }
    
    if (models.length < 3) {
      throw new Error(`Insufficient models in .env file. Found ${models.length}, need 3. Please check OPENROUTER_MODELS_TO_USE format.`);
    }

    return [
      {
        provider: 'OpenRouter' as const,
        apiKey,
        model: models[0], // x-ai/grok-4
        role: 'concept'
      },
      {
        provider: 'OpenRouter' as const, 
        apiKey,
        model: models[1], // google/gemini-2.5-pro
        role: 'development'
      },
      {
        provider: 'OpenRouter' as const,
        apiKey,
        model: models[2], // anthropic/claude-sonnet-4
        role: 'coding'
      }
    ];
  }

  /**
   * Validate that all required environment variables are present
   */
  validate(): { valid: boolean; missing: string[] } {
    const required = ['OPENROUTER_API_KEY', 'OPENROUTER_MODELS_TO_USE'];
    const missing: string[] = [];

    for (const key of required) {
      if (!this.get(key as keyof EnvConfig)) {
        missing.push(key);
      }
    }

    return {
      valid: missing.length === 0,
      missing
    };
  }

  /**
   * Get all loaded configuration
   */
  getConfig(): EnvConfig {
    return { ...this.config };
  }

  /**
   * Get boolean value with default
   */
  getBoolean(key: keyof EnvConfig, defaultValue: boolean = false): boolean {
    const value = this.get(key);
    if (!value) return defaultValue;
    return value.toLowerCase() === 'true';
  }

  /**
   * Get number value with default
   */
  getNumber(key: keyof EnvConfig, defaultValue: number = 0): number {
    const value = this.get(key);
    if (!value) return defaultValue;
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? defaultValue : parsed;
  }

  /**
   * Get API key for any provider
   */
  getApiKey(provider: string): string | undefined {
    switch (provider.toLowerCase()) {
      case 'openrouter':
        return this.get('OPENROUTER_API_KEY');
      case 'openai':
        return this.get('OPENAI_API_KEY');
      case 'anthropic':
        return this.get('ANTHROPIC_API_KEY');
      case 'xai':
        return this.get('XAI_API_KEY');
      default:
        return undefined;
    }
  }

  /**
   * Get default LLM provider
   */
  getDefaultProvider(): string {
    return this.get('DEFAULT_LLM_PROVIDER') || 'openrouter';
  }

  /**
   * Check if debug mode is enabled
   */
  isDebugMode(): boolean {
    return this.getBoolean('DEBUG_MODE', false);
  }

  /**
   * Check if auto-commit is enabled
   */
  isAutoCommitEnabled(): boolean {
    return this.getBoolean('AUTO_COMMIT_ENABLED', true);
  }

  /**
   * Check if constitution enforcement is enabled
   */
  isConstitutionEnforced(): boolean {
    return this.getBoolean('ENFORCE_CONSTITUTION', true);
  }

  /**
   * Get minimum test coverage requirement
   */
  getMinTestCoverage(): number {
    return this.getNumber('MIN_TEST_COVERAGE', 85);
  }

  /**
   * Get API timeout in milliseconds
   */
  getApiTimeout(): number {
    return this.getNumber('API_TIMEOUT', 30000);
  }

  /**
   * Get max tokens per request
   */
  getMaxTokensPerRequest(): number {
    return this.getNumber('MAX_TOKENS_PER_REQUEST', 4000);
  }

  /**
   * Get daily budget limit
   */
  getDailyBudgetLimit(): number {
    const value = this.get('DAILY_BUDGET_LIMIT');
    if (!value) return 0;
    const parsed = parseFloat(value);
    return isNaN(parsed) ? 0 : parsed;
  }

  /**
   * Get collaboration server port
   */
  getCollaborationServerPort(): number {
    return this.getNumber('COLLABORATION_SERVER_PORT', 3001);
  }

  /**
   * Check if usage tracking is enabled
   */
  isUsageTrackingEnabled(): boolean {
    return this.getBoolean('TRACK_API_USAGE', true);
  }

  /**
   * Get vector database path
   */
  getVectorDbPath(): string {
    return this.get('VECTOR_DB_PATH') || '.astraforge/vectordb';
  }

  /**
   * Get comprehensive configuration summary for debugging
   */
  getConfigSummary(): {
    providers: string[];
    hasApiKeys: boolean;
    debugMode: boolean;
    autoCommit: boolean;
    constitutionEnforced: boolean;
    testCoverage: number;
  } {
    const providers = [];
    if (this.get('OPENROUTER_API_KEY')) providers.push('OpenRouter');
    if (this.get('OPENAI_API_KEY')) providers.push('OpenAI');
    if (this.get('ANTHROPIC_API_KEY')) providers.push('Anthropic');
    if (this.get('XAI_API_KEY')) providers.push('xAI');

    return {
      providers,
      hasApiKeys: providers.length > 0,
      debugMode: this.isDebugMode(),
      autoCommit: this.isAutoCommitEnabled(),
      constitutionEnforced: this.isConstitutionEnforced(),
      testCoverage: this.getMinTestCoverage()
    };
  }
}

// Export singleton instance
export const envLoader = new EnvLoader();
