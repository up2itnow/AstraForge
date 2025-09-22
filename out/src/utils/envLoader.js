/**
 * Environment variable loader utility for AstraForge API Tester
 */
import * as fs from 'fs';
import * as path from 'path';
import { logger } from './logger';
export class EnvLoader {
    constructor(projectRoot = process.cwd()) {
        this.projectRoot = projectRoot;
        this.config = {};
        this.loadEnvFile();
    }
    loadEnvFile() {
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
                    this.config[key.trim()] = value;
                }
            }
        }
        catch (error) {
            logger.error('Error reading .env file:', error);
        }
    }
    /**
     * Get environment variable with fallback to system env
     */
    get(key) {
        return this.config[key] || process.env[key];
    }
    /**
     * Get OpenRouter API key
     */
    getOpenRouterApiKey() {
        return this.get('OPENROUTER_API_KEY');
    }
    /**
     * Get OpenRouter models as array
     */
    getOpenRouterModels() {
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
    getLLMPanelConfig() {
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
                provider: 'OpenRouter',
                apiKey,
                model: models[0], // x-ai/grok-4
                role: 'concept'
            },
            {
                provider: 'OpenRouter',
                apiKey,
                model: models[1], // google/gemini-2.5-pro
                role: 'development'
            },
            {
                provider: 'OpenRouter',
                apiKey,
                model: models[2], // anthropic/claude-sonnet-4
                role: 'coding'
            }
        ];
    }
    /**
     * Validate that all required environment variables are present
     */
    validate() {
        const required = ['OPENROUTER_API_KEY', 'OPENROUTER_MODELS_TO_USE'];
        const missing = [];
        for (const key of required) {
            if (!this.get(key)) {
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
    getConfig() {
        return { ...this.config };
    }
    /**
     * Get boolean value with default
     */
    getBoolean(key, defaultValue = false) {
        const value = this.get(key);
        if (!value)
            return defaultValue;
        return value.toLowerCase() === 'true';
    }
    /**
     * Get number value with default
     */
    getNumber(key, defaultValue = 0) {
        const value = this.get(key);
        if (!value)
            return defaultValue;
        const parsed = parseInt(value, 10);
        return isNaN(parsed) ? defaultValue : parsed;
    }
    /**
     * Get API key for any provider
     */
    getApiKey(provider) {
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
    getDefaultProvider() {
        return this.get('DEFAULT_LLM_PROVIDER') || 'openrouter';
    }
    /**
     * Check if debug mode is enabled
     */
    isDebugMode() {
        return this.getBoolean('DEBUG_MODE', false);
    }
    /**
     * Check if auto-commit is enabled
     */
    isAutoCommitEnabled() {
        return this.getBoolean('AUTO_COMMIT_ENABLED', true);
    }
    /**
     * Check if constitution enforcement is enabled
     */
    isConstitutionEnforced() {
        return this.getBoolean('ENFORCE_CONSTITUTION', true);
    }
    /**
     * Get minimum test coverage requirement
     */
    getMinTestCoverage() {
        return this.getNumber('MIN_TEST_COVERAGE', 85);
    }
    /**
     * Get API timeout in milliseconds
     */
    getApiTimeout() {
        return this.getNumber('API_TIMEOUT', 30000);
    }
    /**
     * Get max tokens per request
     */
    getMaxTokensPerRequest() {
        return this.getNumber('MAX_TOKENS_PER_REQUEST', 4000);
    }
    /**
     * Get daily budget limit
     */
    getDailyBudgetLimit() {
        const value = this.get('DAILY_BUDGET_LIMIT');
        if (!value)
            return 0;
        const parsed = parseFloat(value);
        return isNaN(parsed) ? 0 : parsed;
    }
    /**
     * Get collaboration server port
     */
    getCollaborationServerPort() {
        return this.getNumber('COLLABORATION_SERVER_PORT', 3001);
    }
    /**
     * Check if usage tracking is enabled
     */
    isUsageTrackingEnabled() {
        return this.getBoolean('TRACK_API_USAGE', true);
    }
    /**
     * Get vector database path
     */
    getVectorDbPath() {
        return this.get('VECTOR_DB_PATH') || '.astraforge/vectordb';
    }
    /**
     * Get comprehensive configuration summary for debugging
     */
    getConfigSummary() {
        const providers = [];
        if (this.get('OPENROUTER_API_KEY'))
            providers.push('OpenRouter');
        if (this.get('OPENAI_API_KEY'))
            providers.push('OpenAI');
        if (this.get('ANTHROPIC_API_KEY'))
            providers.push('Anthropic');
        if (this.get('XAI_API_KEY'))
            providers.push('xAI');
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
//# sourceMappingURL=envLoader.js.map