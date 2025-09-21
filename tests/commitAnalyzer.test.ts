/**
 * Tests for CommitAnalyzer
 */

import { CommitAnalyzer } from '../src/utils/commitAnalyzer';

describe('CommitAnalyzer', () => {
  let analyzer: CommitAnalyzer;

  beforeEach(() => {
    analyzer = new CommitAnalyzer();
  });

  describe('analyzeSeverity', () => {
    it('should identify critical severity keywords', () => {
      const result = analyzer.analyzeSeverity('Critical bug fix in authentication system');
      
      expect(result.hasSeverityKeywords).toBe(true);
      expect(result.severity).toBe('critical');
      expect(result.matchedKeywords).toContain('critical');
    });

    it('should identify blocker severity keywords', () => {
      const result = analyzer.analyzeSeverity('BLOCKER: System completely down');
      
      expect(result.hasSeverityKeywords).toBe(true);
      expect(result.severity).toBe('critical');
      expect(result.matchedKeywords).toContain('blocker');
    });

    it('should identify major severity keywords', () => {
      const result = analyzer.analyzeSeverity('Major performance improvement needed');
      
      expect(result.hasSeverityKeywords).toBe(true);
      expect(result.severity).toBe('high');
      expect(result.matchedKeywords).toContain('major');
    });

    it('should identify urgent severity keywords', () => {
      const result = analyzer.analyzeSeverity('Urgent: Fix database connection issues');
      
      expect(result.hasSeverityKeywords).toBe(true);
      expect(result.severity).toBe('high');
      expect(result.matchedKeywords).toContain('urgent');
    });

    it('should identify severe severity keywords', () => {
      const result = analyzer.analyzeSeverity('Severe memory leak in production');
      
      expect(result.hasSeverityKeywords).toBe(true);
      expect(result.severity).toBe('medium');
      expect(result.matchedKeywords).toContain('severe');
    });

    it('should return low severity for messages without keywords', () => {
      const result = analyzer.analyzeSeverity('Add new feature to dashboard');
      
      expect(result.hasSeverityKeywords).toBe(false);
      expect(result.severity).toBe('low');
      expect(result.matchedKeywords).toHaveLength(0);
    });

    it('should handle multiple severity keywords', () => {
      const result = analyzer.analyzeSeverity('Critical and urgent bug in major component');
      
      expect(result.hasSeverityKeywords).toBe(true);
      expect(result.severity).toBe('critical');
      expect(result.matchedKeywords).toEqual(expect.arrayContaining(['critical', 'urgent', 'major']));
    });

    it('should be case insensitive', () => {
      const result = analyzer.analyzeSeverity('CRITICAL Bug Fix');
      
      expect(result.hasSeverityKeywords).toBe(true);
      expect(result.severity).toBe('critical');
      expect(result.matchedKeywords).toContain('critical');
    });
  });

  describe('analyzeBatch', () => {
    it('should analyze multiple messages', () => {
      const messages = [
        'Critical security vulnerability',
        'Add new feature',
        'Major refactoring needed'
      ];
      
      const results = analyzer.analyzeBatch(messages);
      
      expect(results).toHaveLength(3);
      expect(results[0].severity).toBe('critical');
      expect(results[1].severity).toBe('low');
      expect(results[2].severity).toBe('high');
    });
  });

  describe('getHighestSeverity', () => {
    it('should return the highest severity from multiple messages', () => {
      const messages = [
        'Minor bug fix',
        'Major update required',
        'Critical security issue',
        'Urgent deployment needed'
      ];
      
      const result = analyzer.getHighestSeverity(messages);
      
      expect(result).toBe('critical');
    });

    it('should return low when no severity keywords are found', () => {
      const messages = [
        'Add feature',
        'Update documentation',
        'Refactor code'
      ];
      
      const result = analyzer.getHighestSeverity(messages);
      
      expect(result).toBe('low');
    });
  });
});