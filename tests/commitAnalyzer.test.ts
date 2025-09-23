/**
 * Tests for CommitAnalyzer performance optimizations
 */

import { CommitAnalyzer, SeverityAnalysis } from '../src/utils/commitAnalyzer';

describe('CommitAnalyzer', () => {
  let analyzer: CommitAnalyzer;

  beforeEach(() => {
    analyzer = new CommitAnalyzer();
  });

  describe('analyzeSeverity', () => {
    it('should identify critical severity commits', () => {
      const result = analyzer.analyzeSeverity('critical bug fix for security vulnerability');
      
      expect(result.level).toBe('critical');
      expect(result.keywords).toContain('critical');
      expect(result.score).toBeGreaterThan(90);
      expect(result.category).toBe('emergency');
    });

    it('should identify high severity commits', () => {
      const result = analyzer.analyzeSeverity('fix important bug in authentication');
      
      expect(result.level).toBe('high');
      expect(result.keywords).toContain('fix');
      expect(result.keywords).toContain('important');
      expect(result.score).toBeGreaterThan(70);
    });

    it('should identify medium severity commits', () => {
      const result = analyzer.analyzeSeverity('improve performance of database queries');
      
      expect(result.level).toBe('medium');
      expect(result.keywords).toContain('improve');
      expect(result.score).toBeGreaterThan(50);
      expect(result.category).toBe('improvement');
    });

    it('should identify low severity commits', () => {
      const result = analyzer.analyzeSeverity('update documentation for API');
      
      expect(result.level).toBe('low');
      expect(result.keywords).toContain('documentation');
      expect(result.category).toBe('documentation');
    });

    it('should handle empty or generic messages', () => {
      const result = analyzer.analyzeSeverity('misc changes');
      
      expect(result.level).toBe('low');
      expect(result.score).toBe(10);
      expect(result.category).toBe('general');
    });

    it('should handle multiple keywords correctly', () => {
      const result = analyzer.analyzeSeverity('critical hotfix for major security bug');
      
      expect(result.level).toBe('critical');
      expect(result.keywords.length).toBeGreaterThan(1);
      expect(result.score).toBeGreaterThan(95);
    });
  });

  describe('categorizeCommit', () => {
    it('should recognize conventional commit formats', () => {
      expect(analyzer.categorizeCommit('feat: add new feature')).toBe('feat');
      expect(analyzer.categorizeCommit('fix: resolve bug')).toBe('fix');
      expect(analyzer.categorizeCommit('docs: update readme')).toBe('docs');
      expect(analyzer.categorizeCommit('refactor(core): improve structure')).toBe('refactor');
    });

    it('should fallback to keyword-based categorization', () => {
      expect(analyzer.categorizeCommit('critical security fix')).toBe('emergency');
      expect(analyzer.categorizeCommit('improve performance')).toBe('improvement');
      expect(analyzer.categorizeCommit('update docs')).toBe('documentation');
    });
  });

  describe('generateCommitSummary', () => {
    it('should generate complete commit summary', () => {
      const message = 'fix: critical security vulnerability in auth';
      const summary = analyzer.generateCommitSummary(message);
      
      expect(summary.message).toBe(message);
      expect(summary.severity.level).toBe('critical');
      expect(summary.category).toBe('fix');
      expect(summary.timestamp).toBeDefined();
    });
  });
});