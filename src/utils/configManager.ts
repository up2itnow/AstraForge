/**
 * Configuration management utilities  
 * Provides centralized configuration handling with validation
 */

import * as vscode from 'vscode';
import { validateApiKey, validateLLMInput } from './inputValidation';
import { handleError } from './errorHandler';

export interface AstraForgeConfig {
  llmPanel: Array<{
    provider: string;
    apiKey: string;
    role: string;
    model?: string;
  }>;
  maxConcurrentRequests: number;
  cacheEnabled: boolean;
  autoCommit: boolean;
  enforceConstitution: boolean;
  performance: {
    enableMonitoring: boolean;
    slowOperationThreshold: number;
  };
  security: {
    enablePathValidation: boolean;
    sanitizeUserInput: boolean;
  };
}

export class ConfigManager {
  private static instance: ConfigManager;
  private config: AstraForgeConfig;
  
  static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  constructor() {
    this.config = this.loadConfiguration();
    this.validateConfiguration();
  }

  /**
   * Load configuration from VS Code settings
   */
  private loadConfiguration(): AstraForgeConfig {
    const workspaceConfig = vscode.workspace.getConfiguration('astraforge');
    
    return {
      llmPanel: workspaceConfig.get('llmPanel', []),
      maxConcurrentRequests: workspaceConfig.get('maxConcurrentRequests', 3),
      cacheEnabled: workspaceConfig.get('cacheEnabled', true),
      autoCommit: workspaceConfig.get('autoCommit', false),
      enforceConstitution: workspaceConfig.get('enforceConstitution', true),
      performance: {
        enableMonitoring: workspaceConfig.get('performance.enableMonitoring', true),
        slowOperationThreshold: workspaceConfig.get('performance.slowOperationThreshold', 1000)
      },
      security: {
        enablePathValidation: workspaceConfig.get('security.enablePathValidation', true),
        sanitizeUserInput: workspaceConfig.get('security.sanitizeUserInput', true)
      }
    };
  }

  /**
   * Validate configuration
   */
  private validateConfiguration(): void {
    const errors: string[] = [];

    // Validate LLM Panel
    for (const [index, llmConfig] of this.config.llmPanel.entries()) {
      if (!llmConfig.provider) {
        errors.push(`LLM Panel ${index}: Provider is required`);
        continue;
      }

      if (!llmConfig.apiKey) {
        errors.push(`LLM Panel ${index}: API key is required`);
        continue;
      }

      // Validate API key format
      const apiKeyValidation = validateApiKey(llmConfig.apiKey, llmConfig.provider);
      if (!apiKeyValidation.isValid) {
        errors.push(`LLM Panel ${index}: ${apiKeyValidation.errors.join(', ')}`);
      }

      if (!llmConfig.role) {
        errors.push(`LLM Panel ${index}: Role is required`);
      }
    }

    // Validate numeric settings
    if (this.config.maxConcurrentRequests < 1 || this.config.maxConcurrentRequests > 10) {
      errors.push('maxConcurrentRequests must be between 1 and 10');
    }

    if (this.config.performance.slowOperationThreshold < 100) {
      errors.push('performance.slowOperationThreshold must be at least 100ms');
    }

    if (errors.length > 0) {
      const errorMessage = `Configuration validation errors:\n${errors.join('\n')}`;
      vscode.window.showErrorMessage(errorMessage);
      handleError(new Error(errorMessage), {
        operation: 'validateConfiguration',
        component: 'ConfigManager',
        metadata: { errors }
      });
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): AstraForgeConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  async updateConfig(updates: Partial<AstraForgeConfig>): Promise<void> {
    const workspaceConfig = vscode.workspace.getConfiguration('astraforge');
    
    for (const [key, value] of Object.entries(updates)) {
      await workspaceConfig.update(key, value, vscode.ConfigurationTarget.Workspace);
    }
    
    // Reload configuration
    this.config = this.loadConfiguration();
    this.validateConfiguration();
  }

  /**
   * Get LLM panel configuration
   */
  getLLMPanel(): AstraForgeConfig['llmPanel'] {
    return this.config.llmPanel;
  }

  /**
   * Add LLM provider to panel
   */
  async addLLMProvider(provider: {
    provider: string;
    apiKey: string;
    role: string;
    model?: string;
  }): Promise<void> {
    // Validate the new provider
    const apiKeyValidation = validateApiKey(provider.apiKey, provider.provider);
    if (!apiKeyValidation.isValid) {
      throw new Error(`Invalid API key: ${apiKeyValidation.errors.join(', ')}`);
    }

    const updatedPanel = [...this.config.llmPanel, provider];
    await this.updateConfig({ llmPanel: updatedPanel });
  }

  /**
   * Remove LLM provider from panel
   */
  async removeLLMProvider(index: number): Promise<void> {
    if (index < 0 || index >= this.config.llmPanel.length) {
      throw new Error('Invalid provider index');
    }

    const updatedPanel = this.config.llmPanel.filter((_, i) => i !== index);
    await this.updateConfig({ llmPanel: updatedPanel });
  }

  /**
   * Get security settings
   */
  getSecuritySettings(): AstraForgeConfig['security'] {
    return this.config.security;
  }

  /**
   * Get performance settings
   */
  getPerformanceSettings(): AstraForgeConfig['performance'] {
    return this.config.performance;
  }

  /**
   * Check if caching is enabled
   */
  isCacheEnabled(): boolean {
    return this.config.cacheEnabled;
  }

  /**
   * Check if auto-commit is enabled
   */
  isAutoCommitEnabled(): boolean {
    return this.config.autoCommit;
  }

  /**
   * Get max concurrent requests
   */
  getMaxConcurrentRequests(): number {
    return this.config.maxConcurrentRequests;
  }

  /**
   * Export configuration for backup
   */
  exportConfig(): string {
    return JSON.stringify(this.config, null, 2);
  }

  /**
   * Import configuration from backup
   */
  async importConfig(configJson: string): Promise<void> {
    try {
      const importedConfig = JSON.parse(configJson) as Partial<AstraForgeConfig>;
      await this.updateConfig(importedConfig);
      vscode.window.showInformationMessage('Configuration imported successfully');
    } catch (error) {
      const errorMessage = 'Failed to import configuration: Invalid JSON format';
      vscode.window.showErrorMessage(errorMessage);
      throw new Error(errorMessage);
    }
  }

  /**
   * Reset configuration to defaults
   */
  async resetToDefaults(): Promise<void> {
    const workspaceConfig = vscode.workspace.getConfiguration('astraforge');
    
    // Clear all settings
    for (const key of Object.keys(this.config)) {
      await workspaceConfig.update(key, undefined, vscode.ConfigurationTarget.Workspace);
    }
    
    // Reload with defaults
    this.config = this.loadConfiguration();
    vscode.window.showInformationMessage('Configuration reset to defaults');
  }
}

// Global configuration manager instance
export const configManager = ConfigManager.getInstance();