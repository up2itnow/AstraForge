/**
 * Self-Analysis Engine for Recursive Self-Modification System
 *
 * Analyzes the AstraForge codebase to identify:
 * 1. Performance bottlenecks and optimization opportunities
 * 2. Code quality issues and improvement suggestions
 * 3. Architectural patterns and structural improvements
 * 4. Feature gaps and enhancement opportunities
 * 5. Security vulnerabilities and hardening opportunities
 * 6. Maintainability and readability improvements
 */

import * as fs from 'fs';
import * as path from 'path';
import * as _vscode from 'vscode';
import { logger } from '../../utils/logger';

export interface AnalysisResult {
  id: string;
  type: 'performance' | 'quality' | 'architecture' | 'security' | 'maintainability' | 'feature';
  title: string;
  description: string;
  file: string;
  line?: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number; // 0-1 scale
  impact: number; // 0-1 scale
  effort: number; // 0-1 scale (time required)
  suggestion: string;
  codeExample?: string;
  metrics: {
    complexity?: number;
    maintainability?: number;
    testability?: number;
    performance?: number;
  };
  tags: string[];
  timestamp: Date;
}

export interface SystemAnalysis {
  overallHealth: number; // 0-1 scale
  categories: {
    performance: { score: number; issues: number; improvements: number };
    quality: { score: number; issues: number; improvements: number };
    architecture: { score: number; issues: number; improvements: number };
    security: { score: number; issues: number; improvements: number };
    maintainability: { score: number; issues: number; improvements: number };
  };
  topIssues: AnalysisResult[];
  recommendations: string[];
  trends: {
    improvement: 'increasing' | 'decreasing' | 'stable';
    complexity: 'increasing' | 'decreasing' | 'stable';
    performance: 'improving' | 'degrading' | 'stable';
  };
}

export class SelfAnalysisEngine {
  private analysisCache: Map<string, { result: AnalysisResult[]; timestamp: Date }> = new Map();
  private fileMetrics: Map<string, FileMetrics> = new Map();
  private systemBaseline: SystemAnalysis | null = null;

  constructor(private workspacePath: string) {}

  /**
   * Perform comprehensive system analysis
   */
  async analyzeSystem(): Promise<SystemAnalysis> {
    logger.info('🔍 Starting comprehensive system analysis');

    const results: AnalysisResult[] = [];

    try {
      // Get all source files
      const sourceFiles = await this.getSourceFiles();

      // Analyze each file
      for (const file of sourceFiles) {
        const fileResults = await this.analyzeFile(file);
        results.push(...fileResults);
      }

      // Analyze overall system architecture
      const architectureResults = await this.analyzeArchitecture();
      results.push(...architectureResults);

      // Analyze performance patterns
      const performanceResults = await this.analyzePerformance();
      results.push(...performanceResults);

      // Analyze security considerations
      const securityResults = await this.analyzeSecurity();
      results.push(...securityResults);

      // Calculate overall scores and categorize results
      const analysis = this.categorizeAndScore(results);

      // Cache the results
      this.analysisCache.set('system', {
        result: results,
        timestamp: new Date()
      });

      logger.info(`✅ System analysis complete: ${results.length} issues found`);
      return analysis;

    } catch (error) {
      logger.error('❌ System analysis failed:', error);
      throw error;
    }
  }

  /**
   * Analyze a specific file for improvements
   */
  async analyzeFile(filePath: string): Promise<AnalysisResult[]> {
    const results: AnalysisResult[] = [];

    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');
      const _fileName = path.basename(filePath);
      const relativePath = path.relative(this.workspacePath, filePath);

      // Calculate file metrics
      const metrics = this.calculateFileMetrics(content, filePath);

      // Analyze code quality issues
      const qualityResults = this.analyzeCodeQuality(content, lines, relativePath);
      results.push(...qualityResults);

      // Analyze performance issues
      const performanceResults = this.analyzePerformanceIssues(content, lines, relativePath);
      results.push(...performanceResults);

      // Analyze maintainability
      const maintainabilityResults = this.analyzeMaintainability(content, lines, relativePath);
      results.push(...maintainabilityResults);

      // Analyze for potential optimizations
      const optimizationResults = this.analyzeOptimizations(content, lines, relativePath);
      results.push(...optimizationResults);

      // Store file metrics
      this.fileMetrics.set(relativePath, metrics);

    } catch (error) {
      logger.warn(`⚠️ Failed to analyze file ${filePath}:`, error);
    }

    return results;
  }

  /**
   * Get analysis results for a specific file or pattern
   */
  async getAnalysis(pattern?: string): Promise<AnalysisResult[]> {
    const cacheKey = pattern || 'system';
    const cached = this.analysisCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp.getTime() < 30 * 60 * 1000) { // 30 minutes cache
      return cached.result;
    }

    if (pattern) {
      // Analyze specific pattern
      const sourceFiles = await this.getSourceFiles();
      const results: AnalysisResult[] = [];

      for (const file of sourceFiles) {
        const fileResults = await this.analyzeFileForPattern(file, pattern);
        results.push(...fileResults);
      }

      this.analysisCache.set(cacheKey, {
        result: results,
        timestamp: new Date()
      });

      return results;
    } else {
      // Full system analysis
      return (await this.analyzeSystem()).topIssues;
    }
  }

  /**
   * Get system health trends over time
   */
  async getHealthTrends(): Promise<{
    history: SystemAnalysis[];
    current: SystemAnalysis;
    trend: 'improving' | 'degrading' | 'stable';
    recommendations: string[];
  }> {
    const current = await this.analyzeSystem();
    const history = [current]; // In real implementation, would load historical data

    const trend = this.calculateHealthTrend(history);
    const recommendations = this.generateHealthRecommendations(current);

    return {
      history,
      current,
      trend,
      recommendations
    };
  }

  /**
   * Identify specific improvement opportunities
   */
  async identifyOpportunities(
    filters: {
      type?: AnalysisResult['type'][];
      severity?: AnalysisResult['severity'][];
      maxEffort?: number;
      minImpact?: number;
    } = {}
  ): Promise<AnalysisResult[]> {
    const allResults = await this.getAnalysis();
    let filtered = allResults;

    if (filters.type && filters.type.length > 0) {
      filtered = filtered.filter(r => filters.type!.includes(r.type));
    }

    if (filters.severity && filters.severity.length > 0) {
      filtered = filtered.filter(r => filters.severity!.includes(r.severity));
    }

    if (filters.maxEffort !== undefined) {
      filtered = filtered.filter(r => r.effort <= filters.maxEffort!);
    }

    if (filters.minImpact !== undefined) {
      filtered = filtered.filter(r => r.impact >= filters.minImpact!);
    }

    // Sort by impact/effort ratio (highest value first)
    filtered.sort((a, b) => (b.impact / b.effort) - (a.impact / a.effort));

    return filtered.slice(0, 20); // Top 20 opportunities
  }

  // Private analysis methods

  private async getSourceFiles(): Promise<string[]> {
    const files: string[] = [];

    const scanDirectory = (dir: string) => {
      const items = fs.readdirSync(dir);

      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
          // Skip common directories that shouldn't be analyzed
          if (!['node_modules', 'dist', 'build', 'coverage', 'temp', 'tmp', '.git'].includes(item)) {
            scanDirectory(fullPath);
          }
        } else if (stat.isFile()) {
          // Only analyze TypeScript and JavaScript files
          if (item.endsWith('.ts') || item.endsWith('.js')) {
            files.push(fullPath);
          }
        }
      }
    };

    scanDirectory(this.workspacePath);
    return files;
  }

  private calculateFileMetrics(content: string, filePath: string): FileMetrics {
    const lines = content.split('\n');
    const complexity = this.calculateCyclomaticComplexity(content);
    const maintainability = this.calculateMaintainabilityIndex(content);
    const testability = this.calculateTestabilityScore(content);

    return {
      lineCount: lines.length,
      complexity,
      maintainability,
      testability,
      lastModified: fs.statSync(filePath).mtime,
      dependencies: this.extractDependencies(content),
      exports: this.extractExports(content)
    };
  }

  private analyzeCodeQuality(
    content: string,
    lines: string[],
    filePath: string
  ): AnalysisResult[] {
    const results: AnalysisResult[] = [];

    // Check for common code quality issues
    lines.forEach((line, index) => {
      // Check for console.log statements in production code
      if (line.includes('console.log') && !filePath.includes('test')) {
        results.push({
          id: `console_log_${filePath}_${index}`,
          type: 'quality',
          title: 'Console.log statement found',
          description: 'Remove console.log statements from production code',
          file: filePath,
          line: index + 1,
          severity: 'low',
          confidence: 0.9,
          impact: 0.3,
          effort: 0.1,
          suggestion: 'Replace console.log with proper logging or remove if not needed',
          metrics: { maintainability: 0.8 },
          tags: ['logging', 'debug'],
          timestamp: new Date()
        });
      }

      // Check for TODO comments
      if (line.includes('TODO') || line.includes('FIXME')) {
        results.push({
          id: `todo_comment_${filePath}_${index}`,
          type: 'maintainability',
          title: 'TODO/FIXME comment found',
          description: 'Address TODO and FIXME comments',
          file: filePath,
          line: index + 1,
          severity: 'medium',
          confidence: 0.8,
          impact: 0.5,
          effort: 0.4,
          suggestion: 'Address the TODO/FIXME comment or remove it if no longer relevant',
          metrics: { maintainability: 0.6 },
          tags: ['todo', 'maintenance'],
          timestamp: new Date()
        });
      }

      // Check for long lines (code style)
      if (line.length > 120) {
        results.push({
          id: `long_line_${filePath}_${index}`,
          type: 'quality',
          title: 'Line too long',
          description: 'Break long lines for better readability',
          file: filePath,
          line: index + 1,
          severity: 'low',
          confidence: 0.7,
          impact: 0.2,
          effort: 0.1,
          suggestion: 'Break this line into multiple lines for better readability',
          metrics: { maintainability: 0.9 },
          tags: ['style', 'readability'],
          timestamp: new Date()
        });
      }
    });

    return results;
  }

  private analyzePerformanceIssues(
    content: string,
    lines: string[],
    filePath: string
  ): AnalysisResult[] {
    const results: AnalysisResult[] = [];

    // Check for potential performance issues
    const hasSyncOperations = content.includes('fs.readFileSync') || content.includes('fs.writeFileSync');
    if (hasSyncOperations) {
      results.push({
        id: `sync_io_${filePath}`,
        type: 'performance',
        title: 'Synchronous I/O operations detected',
        description: 'Consider using asynchronous I/O for better performance',
        file: filePath,
        severity: 'medium',
        confidence: 0.8,
        impact: 0.6,
        effort: 0.3,
        suggestion: 'Replace synchronous I/O operations with async versions',
        codeExample: '// Instead of fs.readFileSync()\n// Use fs.promises.readFile() or async/await',
        metrics: { performance: 0.4 },
        tags: ['performance', 'async', 'io'],
        timestamp: new Date()
      });
    }

    // Check for potential memory leaks
    const hasEventListeners = content.includes('addEventListener') || content.includes('on(');
    if (hasEventListeners && !content.includes('removeEventListener') && !content.includes('off(')) {
      results.push({
        id: `event_listener_leak_${filePath}`,
        type: 'performance',
        title: 'Potential event listener leak',
        description: 'Event listeners should be properly cleaned up',
        file: filePath,
        severity: 'high',
        confidence: 0.7,
        impact: 0.8,
        effort: 0.4,
        suggestion: 'Ensure event listeners are removed when no longer needed',
        metrics: { performance: 0.3 },
        tags: ['memory', 'events', 'leak'],
        timestamp: new Date()
      });
    }

    return results;
  }

  private analyzeMaintainability(
    content: string,
    lines: string[],
    filePath: string
  ): AnalysisResult[] {
    const results: AnalysisResult[] = [];

    // Check for large functions (over 50 lines)
    let functionStart = -1;
    let braceCount = 0;

    lines.forEach((line, index) => {
      if (line.includes('function') || line.includes('=>') || line.includes('class')) {
        functionStart = index;
      }

      if (line.includes('{')) braceCount++;
      if (line.includes('}')) braceCount--;

      if (functionStart !== -1 && braceCount === 0 && index > functionStart + 50) {
        results.push({
          id: `large_function_${filePath}_${functionStart}`,
          type: 'maintainability',
          title: 'Large function detected',
          description: 'Consider breaking large functions into smaller, more manageable pieces',
          file: filePath,
          line: functionStart + 1,
          severity: 'medium',
          confidence: 0.8,
          impact: 0.6,
          effort: 0.5,
          suggestion: 'Refactor this function into smaller, focused functions',
          metrics: { maintainability: 0.4, complexity: 0.8 },
          tags: ['refactor', 'function', 'size'],
          timestamp: new Date()
        });
        functionStart = -1;
      }
    });

    // Check for duplicate code patterns
    const codeBlocks = this.findDuplicateCodeBlocks(content);
    if (codeBlocks.length > 0) {
      results.push({
        id: `duplicate_code_${filePath}`,
        type: 'maintainability',
        title: 'Duplicate code detected',
        description: 'Extract duplicate code into reusable functions or modules',
        file: filePath,
        severity: 'medium',
        confidence: 0.9,
        impact: 0.7,
        effort: 0.6,
        suggestion: 'Extract duplicate code blocks into separate functions',
        metrics: { maintainability: 0.3 },
        tags: ['duplicate', 'refactor', 'reuse'],
        timestamp: new Date()
      });
    }

    return results;
  }

  private analyzeOptimizations(
    content: string,
    lines: string[],
    filePath: string
  ): AnalysisResult[] {
    const results: AnalysisResult[] = [];

    // Look for caching opportunities
    if (content.includes('expensiveOperation') || content.includes('compute') || content.includes('calculate')) {
      results.push({
        id: `caching_opportunity_${filePath}`,
        type: 'performance',
        title: 'Caching opportunity detected',
        description: 'Consider implementing caching for expensive operations',
        file: filePath,
        severity: 'low',
        confidence: 0.6,
        impact: 0.8,
        effort: 0.4,
        suggestion: 'Implement caching mechanism for expensive computations',
        metrics: { performance: 0.7 },
        tags: ['caching', 'performance', 'optimization'],
        timestamp: new Date()
      });
    }

    // Look for memoization opportunities
    if (content.includes('function') && content.includes('return')) {
      results.push({
        id: `memoization_opportunity_${filePath}`,
        type: 'performance',
        title: 'Memoization opportunity detected',
        description: 'Consider memoizing pure functions for better performance',
        file: filePath,
        severity: 'low',
        confidence: 0.5,
        impact: 0.6,
        effort: 0.3,
        suggestion: 'Implement memoization for pure functions',
        codeExample: '// Use memoization utility or implement caching',
        metrics: { performance: 0.6 },
        tags: ['memoization', 'performance', 'functional'],
        timestamp: new Date()
      });
    }

    return results;
  }

  private async analyzeArchitecture(): Promise<AnalysisResult[]> {
    const results: AnalysisResult[] = [];

    // Analyze overall architecture patterns
    const _files = await this.getSourceFiles();
    const directories = this.getDirectories();

    // Check for proper separation of concerns
    const hasProperStructure = this.analyzeProjectStructure(directories);
    if (!hasProperStructure) {
      results.push({
        id: 'architecture_structure',
        type: 'architecture',
        title: 'Project structure could be improved',
        description: 'Consider reorganizing files for better separation of concerns',
        file: '',
        severity: 'medium',
        confidence: 0.7,
        impact: 0.8,
        effort: 0.7,
        suggestion: 'Reorganize project structure to follow domain-driven or feature-based architecture',
        metrics: { maintainability: 0.6 },
        tags: ['architecture', 'structure', 'organization'],
        timestamp: new Date()
      });
    }

    return results;
  }

  private async analyzePerformance(): Promise<AnalysisResult[]> {
    const results: AnalysisResult[] = [];

    // Analyze performance patterns across the codebase
    const files = await this.getSourceFiles();

    // Check for inefficient patterns
    for (const file of files) {
      const content = fs.readFileSync(file, 'utf8');

      // Look for nested loops that could be optimized
      const nestedLoopCount = (content.match(/for\s*\(/g) || []).length;
      if (nestedLoopCount > 2) {
        results.push({
          id: `nested_loops_${path.relative(this.workspacePath, file)}`,
          type: 'performance',
          title: 'Multiple nested loops detected',
          description: 'Consider optimizing nested loops for better performance',
          file: path.relative(this.workspacePath, file),
          severity: 'medium',
          confidence: 0.7,
          impact: 0.6,
          effort: 0.5,
          suggestion: 'Consider using more efficient algorithms or data structures',
          metrics: { performance: 0.5 },
          tags: ['performance', 'loops', 'algorithm'],
          timestamp: new Date()
        });
      }
    }

    return results;
  }

  private async analyzeSecurity(): Promise<AnalysisResult[]> {
    const results: AnalysisResult[] = [];

    // Analyze security considerations
    const files = await this.getSourceFiles();

    for (const file of files) {
      const content = fs.readFileSync(file, 'utf8');

      // Check for potential security issues
      if (content.includes('eval(')) {
        results.push({
          id: `eval_usage_${path.relative(this.workspacePath, file)}`,
          type: 'security',
          title: 'Use of eval() detected',
          description: 'Avoid using eval() for security and performance reasons',
          file: path.relative(this.workspacePath, file),
          severity: 'high',
          confidence: 0.9,
          impact: 0.9,
          effort: 0.2,
          suggestion: 'Replace eval() with safer alternatives',
          metrics: { performance: 0.1 },
          tags: ['security', 'eval', 'injection'],
          timestamp: new Date()
        });
      }
    }

    return results;
  }

  private categorizeAndScore(results: AnalysisResult[]): SystemAnalysis {
    const categories = {
      performance: { score: 1, issues: 0, improvements: 0 },
      quality: { score: 1, issues: 0, improvements: 0 },
      architecture: { score: 1, issues: 0, improvements: 0 },
      security: { score: 1, issues: 0, improvements: 0 },
      maintainability: { score: 1, issues: 0, improvements: 0 },
      feature: { score: 1, issues: 0, improvements: 0 }
    };

    for (const result of results) {
      categories[result.type].issues++;
      categories[result.type].score -= result.impact * 0.1; // Reduce score based on impact

      if (result.severity === 'critical') {
        categories[result.type].score -= 0.3;
      } else if (result.severity === 'high') {
        categories[result.type].score -= 0.2;
      }
    }

    // Ensure scores don't go below 0
    Object.keys(categories).forEach(key => {
      categories[key as keyof typeof categories].score = Math.max(0, categories[key as keyof typeof categories].score);
    });

    const overallHealth = Object.values(categories).reduce((sum, cat) => sum + cat.score, 0) / Object.keys(categories).length;

    // Sort results by severity and impact
    const topIssues = results
      .sort((a, b) => {
        const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        const severityDiff = severityOrder[b.severity] - severityOrder[a.severity];
        if (severityDiff !== 0) return severityDiff;
        return b.impact - a.impact;
      })
      .slice(0, 10);

    const recommendations = this.generateRecommendations(results);

    const trends = {
      improvement: 'stable' as const,
      complexity: 'stable' as const,
      performance: 'stable' as const
    };

    return {
      overallHealth: Math.round(overallHealth * 100) / 100,
      categories,
      topIssues,
      recommendations,
      trends
    };
  }

  // Helper methods

  private calculateCyclomaticComplexity(content: string): number {
    // Simplified cyclomatic complexity calculation
    const branchKeywords = ['if', 'else', 'for', 'while', 'case', 'catch'];
    let complexity = 1;

    branchKeywords.forEach(keyword => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'g');
      const matches = content.match(regex);
      if (matches) {
        complexity += matches.length;
      }
    });

    return complexity;
  }

  private calculateMaintainabilityIndex(content: string): number {
    // Simplified maintainability calculation
    const lines = content.split('\n').length;
    const complexity = this.calculateCyclomaticComplexity(content);

    // Higher score for reasonable line count and complexity
    const lineScore = Math.max(0, 1 - (lines - 100) / 500); // Penalty for very long files
    const complexityScore = Math.max(0, 1 - (complexity - 10) / 20); // Penalty for high complexity

    return (lineScore + complexityScore) / 2;
  }

  private calculateTestabilityScore(content: string): number {
    // Check for testability indicators
    let score = 0.5; // Base score

    if (content.includes('export')) score += 0.2;
    if (content.includes('function') || content.includes('=>')) score += 0.1;
    if (content.includes('class')) score += 0.1;
    if (content.includes('interface')) score += 0.1;

    return Math.min(score, 1.0);
  }

  private extractDependencies(content: string): string[] {
    // Extract import dependencies
    const dependencies: string[] = [];
    const importMatches = content.match(/import.*from ['"]([^'"]+)['"]/g);

    if (importMatches) {
      importMatches.forEach(match => {
        const depMatch = match.match(/from ['"]([^'"]+)['"]/);
        if (depMatch) {
          dependencies.push(depMatch[1]);
        }
      });
    }

    return dependencies;
  }

  private extractExports(content: string): string[] {
    // Extract exports
    const exports: string[] = [];

    const exportMatches = content.match(/export (class|function|const|interface) (\w+)/g);
    if (exportMatches) {
      exportMatches.forEach(match => {
        const exportMatch = match.match(/export (class|function|const|interface) (\w+)/);
        if (exportMatch) {
          exports.push(exportMatch[2]);
        }
      });
    }

    return exports;
  }

  private findDuplicateCodeBlocks(content: string): string[] {
    // Simplified duplicate detection
    const lines = content.split('\n');
    const duplicates: string[] = [];

    for (let i = 0; i < lines.length - 5; i++) {
      const block = lines.slice(i, i + 5).join('\n');
      const remainingContent = lines.slice(i + 5).join('\n');

      if (remainingContent.includes(block)) {
        duplicates.push(block);
      }
    }

    return duplicates;
  }

  private getDirectories(): string[] {
    const dirs: string[] = [];

    const scanDir = (dir: string) => {
      const items = fs.readdirSync(dir);

      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory() && !['node_modules', 'dist', 'build', 'coverage'].includes(item)) {
          dirs.push(fullPath);
          scanDir(fullPath);
        }
      }
    };

    scanDir(this.workspacePath);
    return dirs;
  }

  private analyzeProjectStructure(directories: string[]): boolean {
    // Check if project follows good architectural patterns
    const srcIndex = directories.findIndex(dir => dir.endsWith('src'));
    const hasSrc = srcIndex !== -1;

    // Check for feature-based or domain-based organization
    const hasFeatureDirs = directories.some(dir =>
      dir.includes('feature') || dir.includes('domain') || dir.includes('module')
    );

    return hasSrc || hasFeatureDirs;
  }

  private calculateHealthTrend(history: SystemAnalysis[]): 'improving' | 'degrading' | 'stable' {
    if (history.length < 2) return 'stable';

    const recent = history[0].overallHealth;
    const older = history[1].overallHealth;

    const diff = recent - older;
    if (diff > 0.05) return 'improving';
    if (diff < -0.05) return 'degrading';
    return 'stable';
  }

  private generateRecommendations(results: AnalysisResult[]): string[] {
    const recommendations: string[] = [];

    const byType = results.reduce((acc, result) => {
      if (!acc[result.type]) acc[result.type] = [];
      acc[result.type].push(result);
      return acc;
    }, {} as Record<string, AnalysisResult[]>);

    Object.entries(byType).forEach(([type, typeResults]) => {
      if (typeResults.length > 5) {
        recommendations.push(`Address ${type} issues: ${typeResults.length} items found`);
      }
    });

    if (results.some(r => r.severity === 'critical')) {
      recommendations.push('Prioritize critical issues for immediate attention');
    }

    return recommendations.slice(0, 5);
  }

  private generateHealthRecommendations(analysis: SystemAnalysis): string[] {
    const recommendations: string[] = [];

    Object.entries(analysis.categories).forEach(([category, data]) => {
      if (data.score < 0.7) {
        recommendations.push(`Improve ${category} health: ${data.issues} issues found`);
      }
    });

    if (analysis.overallHealth < 0.8) {
      recommendations.push('Focus on overall system health improvement');
    }

    return recommendations;
  }

  private async analyzeFileForPattern(filePath: string, pattern: string): Promise<AnalysisResult[]> {
    const content = fs.readFileSync(filePath, 'utf8');
    const results: AnalysisResult[] = [];

    // Search for pattern in content
    const lines = content.split('\n');
    lines.forEach((line, index) => {
      if (line.includes(pattern)) {
        results.push({
          id: `pattern_${pattern}_${filePath}_${index}`,
          type: 'feature',
          title: `Pattern found: ${pattern}`,
          description: `Found usage of pattern: ${pattern}`,
          file: path.relative(this.workspacePath, filePath),
          line: index + 1,
          severity: 'low',
          confidence: 0.8,
          impact: 0.3,
          effort: 0.1,
          suggestion: `Review usage of pattern: ${pattern}`,
          metrics: { maintainability: 0.8 },
          tags: ['pattern', 'analysis'],
          timestamp: new Date()
        });
      }
    });

    return results;
  }
}

// Supporting interfaces
interface FileMetrics {
  lineCount: number;
  complexity: number;
  maintainability: number;
  testability: number;
  lastModified: Date;
  dependencies: string[];
  exports: string[];
}
