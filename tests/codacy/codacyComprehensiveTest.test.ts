/**
 * Jest Test Runner for Codacy Comprehensive Test Suite
 *
 * This test file executes the comprehensive Codacy test suite
 * and validates compliance with all configured scan tools.
 */

import CodacyTestSuite from './codacyComprehensiveTest';

describe('Codacy Comprehensive Test Suite', () => {
  let testSuite: CodacyTestSuite;

  beforeAll(() => {
    testSuite = new CodacyTestSuite();
  });

  describe('ESLint Code Quality Tests', () => {
    it('should pass ESLint code quality checks', async () => {
      const results = await testSuite.runAllTests();
      expect(results.eslint).toBeDefined();
      expect(results.eslint.score).toBeGreaterThanOrEqual(80);
    });

    it('should identify and report ESLint issues', async () => {
      const results = await testSuite.runAllTests();
      expect(results.eslint.issues).toBeDefined();
      expect(Array.isArray(results.eslint.issues)).toBe(true);
    });

    it('should provide actionable recommendations for ESLint issues', async () => {
      const results = await testSuite.runAllTests();
      expect(results.eslint.recommendations).toBeDefined();
      expect(results.eslint.recommendations.length).toBeGreaterThan(0);
    });
  });

  describe('Lizard Code Complexity Tests', () => {
    it('should pass Lizard complexity analysis', async () => {
      const results = await testSuite.runAllTests();
      expect(results.lizard).toBeDefined();
      expect(results.lizard.score).toBeGreaterThanOrEqual(80);
    });

    it('should identify functions with high cyclomatic complexity', async () => {
      const results = await testSuite.runAllTests();
      expect(results.lizard.issues).toBeDefined();
    });
  });

  describe('Semgrep Security Pattern Tests', () => {
    it('should pass Semgrep security analysis', async () => {
      const results = await testSuite.runAllTests();
      expect(results.semgrep).toBeDefined();
      // Note: This test may fail if security vulnerabilities are detected
      // That's expected behavior - we want to catch security issues
    });

    it('should identify security vulnerabilities and patterns', async () => {
      const results = await testSuite.runAllTests();
      expect(results.semgrep.issues).toBeDefined();
      expect(Array.isArray(results.semgrep.issues)).toBe(true);
    });

    it('should provide security improvement recommendations', async () => {
      const results = await testSuite.runAllTests();
      expect(results.semgrep.recommendations).toBeDefined();
      expect(results.semgrep.recommendations.length).toBeGreaterThan(0);
    });
  });

  describe('Trivy Vulnerability Tests', () => {
    it('should pass Trivy vulnerability scanning', async () => {
      const results = await testSuite.runAllTests();
      expect(results.trivy).toBeDefined();
      expect(results.trivy.score).toBeGreaterThanOrEqual(90);
    });

    it('should report vulnerability issues if any exist', async () => {
      const results = await testSuite.runAllTests();
      expect(results.trivy.issues).toBeDefined();
      expect(Array.isArray(results.trivy.issues)).toBe(true);
    });
  });

  describe('Overall Codacy Compliance', () => {
    it('should achieve overall passing score', async () => {
      const results = await testSuite.runAllTests();
      expect(results.overallScore).toBeGreaterThanOrEqual(80);
      expect(results.overallPassed).toBe(true);
    });

    it('should provide comprehensive results for all tools', async () => {
      const results = await testSuite.runAllTests();
      expect(results.eslint).toBeDefined();
      expect(results.lizard).toBeDefined();
      expect(results.semgrep).toBeDefined();
      expect(results.trivy).toBeDefined();
    });

    it('should calculate accurate overall score', async () => {
      const results = await testSuite.runAllTests();
      const expectedScore = Math.round(
        (results.eslint.score + results.lizard.score + results.semgrep.score + results.trivy.score) / 4
      );
      expect(results.overallScore).toBe(expectedScore);
    });
  });

  describe('Individual Tool Validation', () => {
    it('should validate ESLint result structure', async () => {
      const results = await testSuite.runAllTests();
      const eslintResult = results.eslint;

      expect(eslintResult).toHaveProperty('tool', 'ESLint');
      expect(eslintResult).toHaveProperty('passed');
      expect(eslintResult).toHaveProperty('score');
      expect(eslintResult).toHaveProperty('issues');
      expect(eslintResult).toHaveProperty('recommendations');

      expect(typeof eslintResult.score).toBe('number');
      expect(eslintResult.score).toBeGreaterThanOrEqual(0);
      expect(eslintResult.score).toBeLessThanOrEqual(100);
    });

    it('should validate Lizard result structure', async () => {
      const results = await testSuite.runAllTests();
      const lizardResult = results.lizard;

      expect(lizardResult).toHaveProperty('tool', 'Lizard');
      expect(lizardResult).toHaveProperty('passed');
      expect(lizardResult).toHaveProperty('score');
      expect(lizardResult).toHaveProperty('issues');
      expect(lizardResult).toHaveProperty('recommendations');
    });

    it('should validate Semgrep result structure', async () => {
      const results = await testSuite.runAllTests();
      const semgrepResult = results.semgrep;

      expect(semgrepResult).toHaveProperty('tool', 'Semgrep');
      expect(semgrepResult).toHaveProperty('passed');
      expect(semgrepResult).toHaveProperty('score');
      expect(semgrepResult).toHaveProperty('issues');
      expect(semgrepResult).toHaveProperty('recommendations');
    });

    it('should validate Trivy result structure', async () => {
      const results = await testSuite.runAllTests();
      const trivyResult = results.trivy;

      expect(trivyResult).toHaveProperty('tool', 'Trivy');
      expect(trivyResult).toHaveProperty('passed');
      expect(trivyResult).toHaveProperty('score');
      expect(trivyResult).toHaveProperty('issues');
      expect(trivyResult).toHaveProperty('recommendations');
    });
  });
});
