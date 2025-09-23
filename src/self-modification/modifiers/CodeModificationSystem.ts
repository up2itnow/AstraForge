/**
 * Code Modification System for Recursive Self-Modification Framework
 *
 * Safely applies code modifications to the AstraForge codebase with:
 * 1. Safe file operations with backup and rollback
 * 2. Syntax validation and error checking
 * 3. Incremental change application
 * 4. Conflict detection and resolution
 * 5. Performance optimization application
 * 6. Security hardening implementations
 */

import * as fs from 'fs';
import * as path from 'path';
import * as _vscode from 'vscode';
import { logger } from '../../utils/logger';

export interface CodeModification {
  id: string;
  file: string;
  type: 'create' | 'modify' | 'delete' | 'refactor';
  description: string;
  changes: {
    startLine?: number;
    endLine?: number;
    oldContent?: string;
    newContent: string;
    operation: 'replace' | 'insert' | 'delete' | 'append';
  }[];
  validation: {
    syntaxCheck: boolean;
    typeCheck: boolean;
    importValidation: boolean;
  };
  rollback: {
    enabled: boolean;
    backupPath?: string;
    timestamp: Date;
  };
  metadata: {
    createdAt: Date;
    estimatedDuration: number;
    risk: number;
    impact: number;
  };
}

export interface ModificationResult {
  modificationId: string;
  success: boolean;
  applied: boolean;
  error?: string;
  details: {
    filesChanged: number;
    linesAdded: number;
    linesRemoved: number;
    syntaxValid: boolean;
    typeCheckPassed: boolean;
  };
  rollback: {
    available: boolean;
    applied: boolean;
    reason?: string;
  };
  performance: {
    executionTime: number;
    memoryUsage: number;
  };
}

export interface OptimizationRule {
  id: string;
  name: string;
  pattern: string;
  replacement: string;
  description: string;
  risk: 'low' | 'medium' | 'high';
  category: 'performance' | 'memory' | 'style' | 'security';
  enabled: boolean;
}

export class CodeModificationSystem {
  private backupDir: string;
  private modificationHistory: Map<string, ModificationResult[]> = new Map();
  private activeModifications: Set<string> = new Set();
  private optimizationRules: OptimizationRule[] = [];
  private conflictDetection: Map<string, Set<string>> = new Map(); // File -> Set of modification IDs

  constructor(workspacePath: string) {
    this.backupDir = path.join(workspacePath, '.astraforge', 'backups');
    this.initializeBackupDirectory();
    this.initializeOptimizationRules();
  }

  /**
   * Apply a code modification safely
   */
  async applyModification(modification: CodeModification): Promise<ModificationResult> {
    const result: ModificationResult = {
      modificationId: modification.id,
      success: false,
      applied: false,
      details: {
        filesChanged: 0,
        linesAdded: 0,
        linesRemoved: 0,
        syntaxValid: false,
        typeCheckPassed: false
      },
      rollback: {
        available: false,
        applied: false
      },
      performance: {
        executionTime: 0,
        memoryUsage: 0
      }
    };

    const startTime = Date.now();
    logger.info(`🔧 Applying code modification: ${modification.description}`);

    try {
      // Check for conflicts
      if (this.hasConflict(modification)) {
        result.error = 'Modification conflict detected';
        return result;
      }

      this.activeModifications.add(modification.id);

      // Create backup
      const backupResult = await this.createBackup(modification);
      if (!backupResult.success) {
        result.error = 'Failed to create backup';
        return result;
      }

      result.rollback.available = true;

      // Apply changes
      const applicationResult = await this.applyChanges(modification);

      if (!applicationResult.success) {
        result.error = applicationResult.error;
        await this.rollbackModification(modification);
        return result;
      }

      result.details = applicationResult.details;
      result.applied = true;

      // Validate changes
      const validationResult = await this.validateChanges(modification);

      if (!validationResult.syntaxValid) {
        logger.warn('⚠️ Syntax validation failed, attempting rollback');
        await this.rollbackModification(modification);
        result.error = 'Syntax validation failed';
        result.rollback.applied = true;
        result.rollback.reason = 'Syntax validation failure';
        return result;
      }

      // Update conflict detection
      this.updateConflictDetection(modification);

      // Record successful modification
      await this.recordModificationResult(modification, result);

      result.success = true;
      result.details.syntaxValid = validationResult.syntaxValid;
      result.details.typeCheckPassed = validationResult.typeCheckPassed;

      logger.info(`✅ Code modification applied successfully: ${modification.description}`);

    } catch (error: any) {
      result.error = error.message;
      logger.error(`❌ Code modification failed: ${error.message}`);

      // Attempt rollback
      try {
        await this.rollbackModification(modification);
        result.rollback.applied = true;
        result.rollback.reason = 'Exception during modification';
      } catch (rollbackError) {
        logger.error(`❌ Rollback also failed: ${rollbackError}`);
      }
    } finally {
      this.activeModifications.delete(modification.id);
      result.performance.executionTime = Date.now() - startTime;
      result.performance.memoryUsage = process.memoryUsage().heapUsed;
    }

    return result;
  }

  /**
   * Apply performance optimizations
   */
  async applyPerformanceOptimizations(
    targetFile?: string,
    options: {
      maxRisk?: 'low' | 'medium' | 'high';
      conservative?: boolean;
      dryRun?: boolean;
    } = {}
  ): Promise<ModificationResult[]> {
    const results: ModificationResult[] = [];

    try {
      // Get target files
      const files = targetFile ? [targetFile] : await this.getSourceFiles();

      for (const file of files) {
        const optimizations = await this.findOptimizationOpportunities(file, options);

        for (const optimization of optimizations) {
          const result = options.dryRun
            ? await this.simulateModification(optimization)
            : await this.applyModification(optimization);

          results.push(result);

          // Stop if too many failures
          if (!result.success && results.filter(r => !r.success).length > 3) {
            logger.warn('⚠️ Too many optimization failures, stopping');
            break;
          }
        }
      }

      logger.info(`📊 Applied ${results.filter(r => r.success).length}/${results.length} performance optimizations`);
      return results;

    } catch (error) {
      logger.error('❌ Performance optimization failed:', error);
      return results;
    }
  }

  /**
   * Apply security hardening
   */
  async applySecurityHardening(
    targetFile?: string,
    options: {
      aggressive?: boolean;
      skipValidation?: boolean;
    } = {}
  ): Promise<ModificationResult[]> {
    const results: ModificationResult[] = [];

    try {
      const files = targetFile ? [targetFile] : await this.getSourceFiles();

      for (const file of files) {
        const securityFixes = await this.findSecurityIssues(file);

        for (const fix of securityFixes) {
          const result = await this.applyModification(fix);
          results.push(result);
        }
      }

      logger.info(`🔒 Applied ${results.filter(r => r.success).length}/${results.length} security fixes`);
      return results;

    } catch (error) {
      logger.error('❌ Security hardening failed:', error);
      return results;
    }
  }

  /**
   * Get modification statistics
   */
  getModificationStats(): {
    total: number;
    successful: number;
    failed: number;
    rolledBack: number;
    averageExecutionTime: number;
    mostActiveFiles: Array<{ file: string; modifications: number }>;
  } {
    const allResults = Array.from(this.modificationHistory.values()).flat();
    const successful = allResults.filter(r => r.success).length;
    const failed = allResults.filter(r => r.success === false && !r.rollback.applied).length;
    const rolledBack = allResults.filter(r => r.rollback.applied).length;

    const averageExecutionTime = allResults.reduce((sum, r) => sum + r.performance.executionTime, 0) / allResults.length || 0;

    // Count modifications per file
    const _fileCounts = new Map<string, number>();
    allResults.forEach(_result => {
      // This would need access to the original modification to get the file
      // For now, return empty array
    });

    const mostActiveFiles: Array<{ file: string; modifications: number }> = [];

    return {
      total: allResults.length,
      successful,
      failed,
      rolledBack,
      averageExecutionTime: Math.round(averageExecutionTime),
      mostActiveFiles
    };
  }

  /**
   * Create a backup of files before modification
   */
  async createBackup(modification: CodeModification): Promise<{ success: boolean; error?: string }> {
    try {
      const backupPath = path.join(this.backupDir, `${modification.id}_${Date.now()}`);
      if (!fs.existsSync(backupPath)) {
        fs.mkdirSync(backupPath, { recursive: true });
      }

      for (const change of modification.changes) {
        const filePath = (change as any).file || modification.file;
        const fullFilePath = path.join(path.dirname(modification.file), filePath);
        if (fs.existsSync(fullFilePath)) {
          const backupFilePath = path.join(backupPath, path.basename(fullFilePath));
          fs.copyFileSync(fullFilePath, backupFilePath);
        }
      }

      modification.rollback.backupPath = backupPath;
      return { success: true };

    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Rollback a modification
   */
  async rollbackModification(modification: CodeModification): Promise<void> {
    if (!modification.rollback.backupPath) {
      throw new Error('No backup available for rollback');
    }

    try {
      const backupPath = modification.rollback.backupPath;
      const files = fs.readdirSync(backupPath);

      for (const file of files) {
        const backupFile = path.join(backupPath, file);
        const originalFile = path.join(path.dirname(modification.file), file);

        if (fs.existsSync(backupFile)) {
          fs.copyFileSync(backupFile, originalFile);
        }
      }

      logger.info(`🔄 Modification rolled back: ${modification.id}`);
    } catch (error) {
      logger.error(`❌ Rollback failed: ${error}`);
      throw error;
    }
  }

  // Private implementation methods

  private initializeBackupDirectory(): void {
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
  }

  private initializeOptimizationRules(): void {
    this.optimizationRules = [
      {
        id: 'const_let_conversion',
        name: 'Use const instead of let when possible',
        pattern: '\\blet\\s+(\\w+)\\s*=',
        replacement: 'const $1 =',
        description: 'Convert let to const for immutable variables',
        risk: 'low',
        category: 'style',
        enabled: true
      },
      {
        id: 'arrow_function_conversion',
        name: 'Convert function to arrow function',
        pattern: 'function\\s+(\\w+)\\s*\\(',
        replacement: 'const $1 = (',
        description: 'Use arrow functions for better readability',
        risk: 'low',
        category: 'style',
        enabled: true
      },
      {
        id: 'async_await_conversion',
        name: 'Convert promise chains to async/await',
        pattern: '\\.then\\(\\s*(\\w+)\\s*=>\\s*{',
        replacement: 'await (async () => {',
        description: 'Use async/await for cleaner asynchronous code',
        risk: 'medium',
        category: 'style',
        enabled: false // Disabled by default due to complexity
      }
    ];
  }

  private hasConflict(modification: CodeModification): boolean {
    const conflicting = this.conflictDetection.get(modification.file);
    return conflicting ? Array.from(conflicting).some(id => this.activeModifications.has(id)) : false;
  }

  private updateConflictDetection(modification: CodeModification): void {
    if (!this.conflictDetection.has(modification.file)) {
      this.conflictDetection.set(modification.file, new Set());
    }
    this.conflictDetection.get(modification.file)!.add(modification.id);
  }

  private async applyChanges(modification: CodeModification): Promise<{ success: boolean; error?: string; details: ModificationResult['details'] }> {
    const details: ModificationResult['details'] = {
      filesChanged: 0,
      linesAdded: 0,
      linesRemoved: 0,
      syntaxValid: false,
      typeCheckPassed: false
    };

    try {
      for (const change of modification.changes) {
        const filePath = path.join(path.dirname(modification.file), (change as any).file || modification.file);

        if ((change as any).type === 'create') {
          // Create new file
          const dir = path.dirname(filePath);
          if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
          }
          fs.writeFileSync(filePath, change.newContent);
          details.filesChanged++;
          details.linesAdded += change.newContent.split('\n').length;

        } else if ((change as any).type === 'modify') {
          // Modify existing file
          const content = fs.readFileSync(filePath, 'utf8');

          let newContent: string;
          if (change.operation === 'replace') {
            newContent = content.replace(change.oldContent!, change.newContent);
            details.linesRemoved += change.oldContent!.split('\n').length;
            details.linesAdded += change.newContent.split('\n').length;
          } else if (change.operation === 'insert') {
            const lines = content.split('\n');
            lines.splice(change.startLine! - 1, 0, change.newContent);
            newContent = lines.join('\n');
            details.linesAdded += change.newContent.split('\n').length;
          } else if (change.operation === 'append') {
            newContent = content + '\n' + change.newContent;
            details.linesAdded += change.newContent.split('\n').length;
          } else {
            continue; // Unknown operation
          }

          fs.writeFileSync(filePath, newContent);
          details.filesChanged++;

        } else if ((change as any).type === 'delete') {
          // Delete file
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            details.filesChanged++;
          }
        }
      }

      return { success: true, details };

    } catch (error: any) {
      return { success: false, error: error.message, details };
    }
  }

  private async validateChanges(modification: CodeModification): Promise<{
    syntaxValid: boolean;
    typeCheckPassed: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];
    let syntaxValid = true;
    let typeCheckPassed = true;

    try {
      // Basic syntax validation
      for (const change of modification.changes) {
        if ((change as any).type === 'create' || (change as any).type === 'modify') {
          const content = change.newContent;
          const syntaxErrors = this.validateSyntax(content, (change as any).file || modification.file);

          if (syntaxErrors.length > 0) {
            errors.push(...syntaxErrors);
            syntaxValid = false;
          }
        }
      }

      // Type checking (simplified)
      if (modification.validation.typeCheck) {
        const typeErrors = await this.runTypeCheck(modification);
        if (typeErrors.length > 0) {
          warnings.push(...typeErrors);
          typeCheckPassed = false;
        }
      }

    } catch (error: any) {
      errors.push(`Validation error: ${error.message}`);
      syntaxValid = false;
    }

    return {
      syntaxValid,
      typeCheckPassed,
      errors,
      warnings
    };
  }

  private async recordModificationResult(
    modification: CodeModification,
    result: ModificationResult
  ): Promise<void> {
    if (!this.modificationHistory.has(modification.file)) {
      this.modificationHistory.set(modification.file, []);
    }
    this.modificationHistory.get(modification.file)!.push(result);

    // Keep only last 10 results per file
    const fileHistory = this.modificationHistory.get(modification.file)!;
    if (fileHistory.length > 10) {
      fileHistory.splice(0, fileHistory.length - 10);
    }
  }

  private async findOptimizationOpportunities(
    file: string,
    options: { maxRisk?: 'low' | 'medium' | 'high'; conservative?: boolean }
  ): Promise<CodeModification[]> {
    const modifications: CodeModification[] = [];

    try {
      const content = fs.readFileSync(file, 'utf8');
      const rules = this.optimizationRules.filter(rule =>
        rule.enabled &&
        (!options.maxRisk || this.getRiskLevel(rule.risk) <= this.getRiskLevel(options.maxRisk))
      );

      for (const rule of rules) {
        const matches = content.match(new RegExp(rule.pattern, 'g'));
        if (matches) {
          const modification = await this.createOptimizationModification(
            file,
            rule,
            matches.length
          );

          if (modification) {
            modifications.push(modification);
          }
        }
      }

    } catch (error) {
      logger.warn(`⚠️ Failed to analyze file for optimizations: ${file}`, error);
    }

    return modifications;
  }

  private async findSecurityIssues(file: string): Promise<CodeModification[]> {
    const modifications: CodeModification[] = [];

    try {
      const content = fs.readFileSync(file, 'utf8');

      // Check for common security issues
      const securityPatterns = [
        {
          pattern: 'eval\\(',
          replacement: '// SECURE: Removed eval() usage',
          description: 'Remove eval() for security'
        },
        {
          pattern: 'innerHTML\\s*=\\s*',
          replacement: 'textContent =',
          description: 'Use textContent instead of innerHTML'
        }
      ];

      for (const security of securityPatterns) {
        if (content.includes(security.pattern)) {
          const modification = await this.createSecurityModification(
            file,
            security
          );

          if (modification) {
            modifications.push(modification);
          }
        }
      }

    } catch (error) {
      logger.warn(`⚠️ Failed to analyze file for security issues: ${file}`, error);
    }

    return modifications;
  }

  private async getSourceFiles(): Promise<string[]> {
    const files: string[] = [];
    const extensions = ['.ts', '.js', '.tsx', '.jsx'];

    const scanDirectory = (dir: string) => {
      const items = fs.readdirSync(dir);

      for (const item of items) {
        const fullPath = path.join(dir, item);

        if (fs.statSync(fullPath).isDirectory()) {
          if (!['node_modules', 'dist', 'build', 'coverage', '.git'].includes(item)) {
            scanDirectory(fullPath);
          }
        } else {
          if (extensions.some(ext => item.endsWith(ext))) {
            files.push(fullPath);
          }
        }
      }
    };

    // Start from src directory if it exists
    const srcDir = path.join(path.dirname(this.backupDir), 'src');
    if (fs.existsSync(srcDir)) {
      scanDirectory(srcDir);
    }

    return files;
  }

  private getRiskLevel(risk: string): number {
    const levels = { low: 1, medium: 2, high: 3 };
    return levels[risk as keyof typeof levels] || 1;
  }

  private validateSyntax(content: string, fileName: string): string[] {
    const errors: string[] = [];

    try {
      // Basic syntax validation using Node.js require (for JS/TS)
      if (fileName.endsWith('.js') || fileName.endsWith('.ts')) {
        // This is a simplified check - in real implementation would use proper parsing
        if (content.includes('function') && !content.includes('{')) {
          errors.push('Missing function body');
        }
      }

    } catch (error) {
      errors.push('Syntax validation failed');
    }

    return errors;
  }

  private async runTypeCheck(modification: CodeModification): Promise<string[]> {
    // Simplified type checking simulation
    const warnings: string[] = [];

    // In real implementation, this would run TypeScript compiler
    await new Promise(resolve => setTimeout(resolve, 100));

    return warnings;
  }

  private async createOptimizationModification(
    file: string,
    rule: OptimizationRule,
    matchCount: number
  ): Promise<CodeModification | null> {
    try {
      const content = fs.readFileSync(file, 'utf8');

      return {
        id: `optimization_${rule.id}_${Date.now()}`,
        file,
        type: 'modify',
        description: `${rule.name} (${matchCount} occurrences)`,
        changes: [{
          oldContent: content,
          newContent: content.replace(new RegExp(rule.pattern, 'g'), rule.replacement),
          operation: 'replace'
        }],
        validation: {
          syntaxCheck: true,
          typeCheck: false,
          importValidation: false
        },
        rollback: {
          enabled: true,
          timestamp: new Date()
        },
        metadata: {
          createdAt: new Date(),
          estimatedDuration: 5,
          risk: rule.risk === 'low' ? 0.1 : rule.risk === 'medium' ? 0.3 : 0.5,
          impact: 0.4
        }
      };

    } catch (error) {
      return null;
    }
  }

  private async createSecurityModification(
    file: string,
    security: any
  ): Promise<CodeModification | null> {
    try {
      const content = fs.readFileSync(file, 'utf8');

      return {
        id: `security_${Date.now()}`,
        file,
        type: 'modify',
        description: security.description,
        changes: [{
          oldContent: content,
          newContent: content.replace(new RegExp(security.pattern, 'g'), security.replacement),
          operation: 'replace'
        }],
        validation: {
          syntaxCheck: true,
          typeCheck: true,
          importValidation: true
        },
        rollback: {
          enabled: true,
          timestamp: new Date()
        },
        metadata: {
          createdAt: new Date(),
          estimatedDuration: 10,
          risk: 0.2,
          impact: 0.8
        }
      };

    } catch (error) {
      return null;
    }
  }

  private async simulateModification(modification: CodeModification): Promise<ModificationResult> {
    // Simulate the modification without actually applying it
    const result: ModificationResult = {
      modificationId: modification.id,
      success: true,
      applied: false, // Not actually applied
      details: {
        filesChanged: modification.changes.length,
        linesAdded: modification.changes.reduce((sum, c) => sum + (c.newContent?.split('\n').length || 0), 0),
        linesRemoved: modification.changes.reduce((sum, c) => sum + (c.oldContent?.split('\n').length || 0), 0),
        syntaxValid: true,
        typeCheckPassed: true
      },
      rollback: {
        available: false,
        applied: false
      },
      performance: {
        executionTime: 50, // Simulated
        memoryUsage: 1024 * 1024 // Simulated
      }
    };

    return result;
  }
}
