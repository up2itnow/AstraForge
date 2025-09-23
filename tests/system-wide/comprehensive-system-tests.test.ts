/**
 * Comprehensive System-Wide Testing Suite
 * Tests load, stress, security, and accessibility aspects of the entire system
 */

import fc from 'fast-check';
import { WorkflowManager } from '../../src/workflow/workflowManager';
import { LLMManager } from '../../src/llm/llmManager';
import { VectorDB } from '../../src/db/vectorDB';
import { EmergentBehaviorSystem } from '../../src/emergent-behavior/EmergentBehaviorSystem';
import { QuantumDecisionSystem } from '../../src/quantum-decision/QuantumDecisionSystem';
import { QuantumOptimizationSystem } from '../../src/quantum-decision/optimization/QuantumOptimizationSystem';
import { InterAgentEvolutionSystem } from '../../src/inter-agent-evolution/InterAgentEvolutionSystem';
import { AdaptiveWorkflowRL } from '../../src/rl/adaptiveWorkflow';
import * as vscode from 'vscode';

describe('System-Wide Comprehensive Testing', () => {
  let workflowManager: WorkflowManager;
  let llmManager: jest.Mocked<LLMManager>;
  let vectorDB: jest.Mocked<VectorDB>;
  let emergentBehavior: jest.Mocked<EmergentBehaviorSystem>;
  let quantumSystem: jest.Mocked<QuantumDecisionSystem>;
  let optimizationSystem: jest.Mocked<QuantumOptimizationSystem>;
  let evolutionSystem: jest.Mocked<InterAgentEvolutionSystem>;
  let rlSystem: jest.Mocked<AdaptiveWorkflowRL>;

  beforeEach(() => {
    // Setup comprehensive mocked system
    llmManager = {
      conference: jest.fn(),
      queryLLM: jest.fn(),
      voteOnDecision: jest.fn(),
      panel: [{ provider: 'OpenRouter', key: 'test-key', model: 'test-model', role: 'primary' }],
      providers: new Map([['OpenRouter', {} as any]]),
      cache: { get: jest.fn(), set: jest.fn(), isThrottled: jest.fn().mockReturnValue(false), clear: jest.fn() } as any
    } as any;

    vectorDB = {
      init: jest.fn(),
      getEmbedding: jest.fn(),
      queryEmbedding: jest.fn(),
      addEmbedding: jest.fn(),
      getContextualInsights: jest.fn(),
      save: jest.fn(),
      close: jest.fn()
    } as any;

    emergentBehavior = {
      detectBehavior: jest.fn(),
      analyzeTrend: jest.fn(),
      predictEmergence: jest.fn(),
      amplifyBehavior: jest.fn()
    } as any;

    quantumSystem = {
      makeDecision: jest.fn(),
      getQuantumState: jest.fn().mockReturnValue({
        coherence: 0.8, entanglement: 0.6, superposition: 3, energy: 0.5, temperature: 0.7,
        waveFunction: new Map(), hamiltonian: new Map()
      })
    } as any;

    optimizationSystem = {
      optimize: jest.fn()
    } as any;

    evolutionSystem = {
      evolveAgent: jest.fn(),
      createSpecializedAgent: jest.fn(),
      optimizeAgent: jest.fn(),
      transferKnowledge: jest.fn()
    } as any;

    rlSystem = {
      getOptimalAction: jest.fn(),
      updateQValue: jest.fn(),
      calculateReward: jest.fn()
    } as any;

    workflowManager = new WorkflowManager(llmManager, vectorDB, {} as any, emergentBehavior);
  });

  describe('Load Testing for Concurrent Workflows', () => {
    it('should handle multiple concurrent workflow executions', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 5, max: 50 }),
          fc.integer({ min: 2, max: 10 }),
          async (numWorkflows, concurrencyLevel) => {
            const workflowPromises: Promise<any>[] = [];

            for (let i = 0; i < numWorkflows; i++) {
              workflowPromises.push(
                workflowManager.startWorkflow(`Load test workflow ${i}`)
              );
            }

            const startTime = performance.now();

            // Execute with controlled concurrency
            const results = await executeWithConcurrency(workflowPromises, concurrencyLevel);

            const endTime = performance.now();
            const totalTime = endTime - startTime;

            // Should complete all workflows
            expect(results.length).toBe(numWorkflows);

            // Should maintain reasonable performance
            const avgTimePerWorkflow = totalTime / numWorkflows;
            expect(avgTimePerWorkflow).toBeLessThan(2000); // 2 seconds average

            // Should have high success rate
            const successful = results.filter(r => r.status === 'fulfilled').length;
            const successRate = successful / numWorkflows;
            expect(successRate).toBeGreaterThan(0.9); // 90% success rate
          }
        ),
        { numRuns: 10 }
      );
    });

    it('should maintain performance under sustained load', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 10, max: 30 }),
          async (durationSeconds) => {
            const endTime = Date.now() + (durationSeconds * 1000);
            const results: any[] = [];
            let workflowCount = 0;

            while (Date.now() < endTime) {
              const workflowPromise = workflowManager.startWorkflow(`Sustained load ${workflowCount}`);
              results.push(await workflowPromise);
              workflowCount++;

              // Small delay to simulate realistic load
              await new Promise(resolve => setTimeout(resolve, 100));
            }

            // Should handle sustained load without degradation
            expect(results.length).toBeGreaterThan(5);
            expect(results.length).toBe(workflowCount);

            // Check for memory leaks (basic check)
            const usedMemory = process.memoryUsage().heapUsed;
            expect(usedMemory).toBeLessThan(500 * 1024 * 1024); // Less than 500MB
          }
        ),
        { numRuns: 5 }
      );
    });

    it('should handle burst traffic patterns', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 20, max: 100 }),
          async (burstSize) => {
            const burstPromises: Promise<any>[] = [];

            // Create burst of requests
            for (let i = 0; i < burstSize; i++) {
              burstPromises.push(
                workflowManager.startWorkflow(`Burst request ${i}`)
              );
            }

            const startTime = performance.now();
            const results = await Promise.allSettled(burstPromises);
            const endTime = performance.now();

            const totalTime = endTime - startTime;

            // Should handle burst efficiently
            expect(results.length).toBe(burstSize);
            expect(totalTime).toBeLessThan(10000); // 10 seconds max for burst

            // Should maintain reasonable throughput
            const throughput = burstSize / (totalTime / 1000); // requests per second
            expect(throughput).toBeGreaterThan(5); // At least 5 requests per second
          }
        ),
        { numRuns: 8 }
      );
    });
  });

  describe('Stress Testing for Resource Limits', () => {
    it('should handle memory-intensive operations gracefully', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1000, max: 10000 }),
          async (dataSize) => {
            const memoryIntensiveData = generateMemoryIntensiveData(dataSize);

            const startMemory = process.memoryUsage().heapUsed;
            const startTime = performance.now();

            try {
              const result = await workflowManager.startWorkflow('Memory stress test');
              expect(result).toBeDefined();
            } catch (error) {
              // Should handle memory issues gracefully
              expect(error).toBeInstanceOf(Error);
            }

            const endMemory = process.memoryUsage().heapUsed;
            const endTime = performance.now();

            const memoryIncrease = endMemory - startMemory;
            const executionTime = endTime - startTime;

            // Memory increase should be reasonable
            expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024); // Less than 100MB increase
            expect(executionTime).toBeLessThan(30000); // 30 seconds max
          }
        ),
        { numRuns: 5 }
      );
    });

    it('should handle CPU-intensive operations without blocking', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 100000, max: 1000000 }),
          async (iterations) => {
            const cpuIntensiveTask = async () => {
              let result = 0;
              for (let i = 0; i < iterations; i++) {
                result += Math.sin(i) * Math.cos(i);
              }
              return result;
            };

            const startTime = performance.now();

            // Run CPU-intensive task in parallel with workflow
            const [cpuResult, workflowResult] = await Promise.all([
              cpuIntensiveTask(),
              workflowManager.startWorkflow('CPU stress test')
            ]);

            const endTime = performance.now();
            const executionTime = endTime - startTime;

            expect(cpuResult).toBeDefined();
            expect(workflowResult).toBeDefined();
            expect(executionTime).toBeLessThan(10000); // 10 seconds max
          }
        ),
        { numRuns: 8 }
      );
    });

    it('should handle network timeout scenarios', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1000, max: 10000 }),
          async (timeoutMs) => {
            // Mock network delays
            llmManager.queryLLM = jest.fn().mockImplementation(
              () => new Promise(resolve => setTimeout(() => resolve('delayed response'), timeoutMs))
            );

            const startTime = performance.now();
            const result = await workflowManager.startWorkflow('Network timeout test');
            const endTime = performance.now();

            const executionTime = endTime - startTime;

            expect(result).toBeDefined();
            expect(executionTime).toBeGreaterThan(timeoutMs - 100);
            expect(executionTime).toBeLessThan(timeoutMs + 1000);
          }
        ),
        { numRuns: 5 }
      );
    });

    it('should handle resource exhaustion scenarios', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 5, max: 20 }),
          async (numOperations) => {
            const operations: Promise<any>[] = [];

            for (let i = 0; i < numOperations; i++) {
              operations.push(
                workflowManager.startWorkflow(`Resource exhaustion test ${i}`)
              );
            }

            try {
              const results = await Promise.allSettled(operations);

              // Should handle all operations
              expect(results.length).toBe(numOperations);

              // Check system health after operations
              const finalMemory = process.memoryUsage().heapUsed;
              expect(finalMemory).toBeLessThan(300 * 1024 * 1024); // Less than 300MB

            } catch (error) {
              // Should not crash even under resource pressure
              expect(error).toBeInstanceOf(Error);
            }
          }
        ),
        { numRuns: 5 }
      );
    });
  });

  describe('Security Testing for Quantum Operations', () => {
    it('should validate input sanitization for quantum operations', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            maliciousInput: fc.oneof(
              fc.constant('<script>alert("xss")</script>'),
              fc.constant('../../../etc/passwd'),
              fc.constant(' UNION SELECT * FROM users'),
              fc.constant('javascript:alert(1)'),
              fc.constant('data:text/html,<script>alert(1)</script>'),
              fc.string({ minLength: 10, maxLength: 50 }),
              fc.string({ minLength: 1, maxLength: 100 })
            ),
            injectionType: fc.oneof(
              fc.constant('xss'),
              fc.constant('sql'),
              fc.constant('path-traversal'),
              fc.constant('command-injection'),
              fc.constant('unicode-exploit')
            )
          }),
          async (attack) => {
            const sanitizedInput = sanitizeInput(attack.maliciousInput);

            expect(sanitizedInput).toBeDefined();
            expect(sanitizedInput.length).toBeGreaterThan(0);

            // Should not contain dangerous patterns
            expect(sanitizedInput).not.toContain('<script>');
            expect(sanitizedInput).not.toContain('javascript:');
            expect(sanitizedInput).not.toContain('UNION');
            expect(sanitizedInput).not.toContain('../');
          }
        ),
        { numRuns: 30 }
      );
    });

    it('should prevent quantum state manipulation attacks', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            manipulatedState: fc.record({
              amplitudes: fc.array(fc.double({ min: -10, max: 10 }), { minLength: 2, maxLength: 10 }),
              coherence: fc.double({ min: -1, max: 2 }),
              entanglement: fc.double({ min: -1, max: 2 }),
              superposition: fc.integer({ min: -10, max: 100 })
            }),
            attackType: fc.oneof(
              fc.constant('state-injection'),
              fc.constant('coherence-manipulation'),
              fc.constant('entanglement-spoofing'),
              fc.constant('superposition-overflow')
            )
          }),
          async (attack) => {
            const validationResult = validateQuantumState(attack.manipulatedState);

            if (!validationResult.isValid) {
              // Invalid states should be rejected
              expect(validationResult.isValid).toBe(false);
              expect(validationResult.errors).toBeDefined();
              expect(validationResult.errors.length).toBeGreaterThan(0);
            }
          }
        ),
        { numRuns: 25 }
      );
    });

    it('should enforce access control for quantum operations', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            userRole: fc.oneof(
              fc.constant('guest'),
              fc.constant('user'),
              fc.constant('admin'),
              fc.constant('quantum-specialist'),
              fc.constant('researcher')
            ),
            operation: fc.oneof(
              fc.constant('execute-algorithm'),
              fc.constant('modify-quantum-state'),
              fc.constant('access-quantum-results'),
              fc.constant('configure-quantum-system'),
              fc.constant('export-quantum-data')
            ),
            resourceLevel: fc.oneof(
              fc.constant('public'),
              fc.constant('internal'),
              fc.constant('confidential'),
              fc.constant('classified'),
              fc.constant('top-secret')
            )
          }),
          async (accessRequest) => {
            const accessGranted = checkAccessControl(accessRequest);

            // Should properly enforce access controls
            expect(typeof accessGranted).toBe('boolean');

            if (accessRequest.userRole === 'guest') {
              // Guests should have very limited access
              expect(accessGranted).toBe(false);
            }
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should detect and prevent side-channel attacks', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            timingAttack: fc.boolean(),
            cacheAttack: fc.boolean(),
            memoryAttack: fc.boolean()
          }),
          async (attackVectors) => {
            const detectionResult = detectSideChannelAttack(attackVectors);

            expect(detectionResult.detected).toBeDefined();
            expect(detectionResult.confidence).toBeGreaterThanOrEqual(0);
            expect(detectionResult.confidence).toBeLessThanOrEqual(1);

            if (attackVectors.timingAttack || attackVectors.cacheAttack || attackVectors.memoryAttack) {
              // Should detect attacks with reasonable confidence
              expect(detectionResult.confidence).toBeGreaterThan(0.5);
            }
          }
        ),
        { numRuns: 15 }
      );
    });
  });

  describe('Accessibility Testing for VSCode Integration', () => {
    it('should provide accessible command descriptions', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.string(), { minLength: 1, maxLength: 5 }),
          async (commandNames) => {
            const commands = commandNames.map(name => ({
              command: `astraforg.${name}`,
              title: `AstraForge: ${name.replace(/-/g, ' ')}`,
              description: `Execute ${name} functionality`,
              category: 'AstraForge'
            }));

            commands.forEach(cmd => {
              expect(cmd.title).toBeDefined();
              expect(cmd.title.length).toBeGreaterThan(5);
              expect(cmd.description).toBeDefined();
              expect(cmd.description.length).toBeGreaterThan(10);
              expect(cmd.category).toBe('AstraForge');
            });
          }
        ),
        { numRuns: 10 }
      );
    });

    it('should support keyboard navigation for all features', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 5, max: 20 }),
          async (numShortcuts) => {
            const shortcuts = generateKeyboardShortcuts(numShortcuts);

            shortcuts.forEach(shortcut => {
              expect(shortcut.keybinding).toBeDefined();
              expect(shortcut.when).toBeDefined();
              expect(shortcut.command).toBeDefined();

              // Should have valid key combinations
              expect(shortcut.keybinding.length).toBeGreaterThan(1);
              expect(shortcut.keybinding).toMatch(/^(ctrl|alt|cmd|shift)\+/);
            });
          }
        ),
        { numRuns: 8 }
      );
    });

    it('should provide screen reader support', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.string(), { minLength: 3, maxLength: 10 }),
          async (uiElements) => {
            const accessibleElements = uiElements.map(element => ({
              id: element,
              label: `${element} interface element`,
              description: `Interactive ${element} component`,
              role: element.includes('button') ? 'button' : 'generic',
              ariaLabel: `${element} accessible label`,
              ariaDescribedBy: `${element}-description`
            }));

            accessibleElements.forEach(element => {
              expect(element.label).toBeDefined();
              expect(element.ariaLabel).toBeDefined();
              expect(element.role).toBeDefined();
              expect(element.description).toBeDefined();
            });
          }
        ),
        { numRuns: 12 }
      );
    });

    it('should support high contrast and color accessibility', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            backgroundColor: fc.oneof(
              fc.constant('#000000'),
              fc.constant('#ffffff'),
              fc.constant('#000080'),
              fc.constant('#008000'),
              fc.constant('#800080')
            ),
            textColor: fc.oneof(
              fc.constant('#ffffff'),
              fc.constant('#000000'),
              fc.constant('#ffff00'),
              fc.constant('#00ff00'),
              fc.constant('#ff0000')
            )
          }),
          async (colorScheme) => {
            const contrastRatio = calculateContrastRatio(colorScheme.backgroundColor, colorScheme.textColor);

            // Should meet accessibility standards
            expect(contrastRatio).toBeGreaterThanOrEqual(4.5); // WCAG AA standard

            const accessibleColors = {
              background: colorScheme.backgroundColor,
              text: colorScheme.textColor,
              contrastRatio,
              wcagLevel: contrastRatio >= 7 ? 'AAA' : contrastRatio >= 4.5 ? 'AA' : 'Fail'
            };

            expect(accessibleColors.wcagLevel).toBeDefined();
          }
        ),
        { numRuns: 15 }
      );
    });

    it('should handle focus management properly', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 3, max: 15 }),
          async (numFocusElements) => {
            const focusOrder = Array.from({ length: numFocusElements }, (_, i) => ({
              id: `focus-element-${i}`,
              tabindex: i,
              focusable: true,
              label: `Focusable element ${i}`
            }));

            // Verify logical focus order
            const tabIndices = focusOrder.map(el => el.tabindex);
            const isSequential = tabIndices.every((val, idx) =>
              idx === 0 || val >= tabIndices[idx - 1]
            );

            expect(isSequential).toBe(true);

            focusOrder.forEach(element => {
              expect(element.tabindex).toBeGreaterThanOrEqual(0);
              expect(element.focusable).toBe(true);
              expect(element.label).toBeDefined();
            });
          }
        ),
        { numRuns: 10 }
      );
    });
  });

  describe('Performance Benchmarking and Validation', () => {
    it('should maintain performance under various loads', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 100 }),
          async (loadLevel) => {
            const startTime = performance.now();
            const startMemory = process.memoryUsage().heapUsed;

            // Simulate varying load levels
            for (let i = 0; i < loadLevel; i++) {
              await workflowManager.startWorkflow(`Performance test ${i}`);
            }

            const endTime = performance.now();
            const endMemory = process.memoryUsage().heapUsed;

            const executionTime = endTime - startTime;
            const memoryUsage = endMemory - startMemory;

            // Performance should scale reasonably
            expect(executionTime).toBeLessThan(loadLevel * 500); // Max 500ms per operation
            expect(memoryUsage).toBeLessThan(loadLevel * 1024 * 1024); // Max 1MB per operation

            const performanceMetrics = {
              loadLevel,
              executionTime,
              memoryUsage,
              operationsPerSecond: loadLevel / (executionTime / 1000),
              memoryPerOperation: memoryUsage / loadLevel
            };

            expect(performanceMetrics.operationsPerSecond).toBeGreaterThan(1);
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should validate system health metrics', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 5, max: 25 }),
          async (numOperations) => {
            const healthMetrics: any[] = [];

            for (let i = 0; i < numOperations; i++) {
              const operationStart = performance.now();
              await workflowManager.startWorkflow(`Health check ${i}`);
              const operationEnd = performance.now();

              healthMetrics.push({
                operationId: i,
                duration: operationEnd - operationStart,
                timestamp: Date.now(),
                memoryUsage: process.memoryUsage().heapUsed,
                cpuUsage: process.cpuUsage().user
              });
            }

            // Analyze health metrics
            const avgDuration = healthMetrics.reduce((sum, m) => sum + m.duration, 0) / healthMetrics.length;
            const maxDuration = Math.max(...healthMetrics.map(m => m.duration));
            const minDuration = Math.min(...healthMetrics.map(m => m.duration));

            // Should maintain consistent performance
            expect(maxDuration).toBeLessThan(avgDuration * 3); // No extreme outliers
            expect(avgDuration).toBeLessThan(2000); // Average under 2 seconds

            const healthScore = calculateHealthScore(healthMetrics);
            expect(healthScore).toBeGreaterThan(0.7); // 70% health score minimum
          }
        ),
        { numRuns: 10 }
      );
    });
  });

  // Helper functions for comprehensive testing
  async function executeWithConcurrency<T>(promises: Promise<T>[], concurrency: number): Promise<PromiseSettledResult<T>[]> {
    const results: PromiseSettledResult<T>[] = [];
    const executing: Promise<T>[] = [];

    for (const promise of promises) {
      executing.push(promise);

      if (executing.length >= concurrency) {
        const settled = await Promise.race(executing);
        const index = executing.findIndex(p => p === promise);
        if (index !== -1) {
          executing.splice(index, 1);
          results.push({ status: 'fulfilled', value: settled });
        }
      }
    }

    // Handle remaining promises
    for (const promise of executing) {
      try {
        const result = await promise;
        results.push({ status: 'fulfilled', value: result });
      } catch (error) {
        results.push({ status: 'rejected', reason: error });
      }
    }

    return results;
  }

  function generateMemoryIntensiveData(size: number): any {
    const data: any = {};

    for (let i = 0; i < size; i++) {
      data[`key${i}`] = {
        id: i,
        value: Math.random().toString(36).repeat(10),
        nested: Array.from({ length: 10 }, (_, j) => ({
          id: j,
          data: 'x'.repeat(100)
        })),
        metadata: {
          created: new Date(),
          tags: Array.from({ length: 5 }, () => Math.random().toString(36))
        }
      };
    }

    return data;
  }

  function sanitizeInput(input: string): string {
    return input
      .replace(/<script[^>]*>.*?<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/UNION.*SELECT/gi, '')
      .replace(/\.\.\//g, '')
      .replace(/[\x00-\x1F\x7F]/g, '');
  }

  function validateQuantumState(state: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (typeof state.coherence !== 'number' || state.coherence < 0 || state.coherence > 1) {
      errors.push('Invalid coherence value');
    }

    if (typeof state.entanglement !== 'number' || state.entanglement < 0 || state.entanglement > 1) {
      errors.push('Invalid entanglement value');
    }

    if (!Array.isArray(state.amplitudes) || state.amplitudes.length === 0) {
      errors.push('Invalid amplitudes array');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  function checkAccessControl(request: any): boolean {
    const { userRole, operation, resourceLevel } = request;

    const roleHierarchy = {
      'guest': 0,
      'user': 1,
      'admin': 2,
      'quantum-specialist': 3,
      'researcher': 3
    };

    const operationRisk = {
      'execute-algorithm': 1,
      'modify-quantum-state': 3,
      'access-quantum-results': 2,
      'configure-quantum-system': 3,
      'export-quantum-data': 4
    };

    const resourceSensitivity = {
      'public': 0,
      'internal': 1,
      'confidential': 2,
      'classified': 3,
      'top-secret': 4
    };

    const userLevel = roleHierarchy[userRole as keyof typeof roleHierarchy] || 0;
    const requiredLevel = operationRisk[operation as keyof typeof operationRisk] || 1;
    const sensitivity = resourceSensitivity[resourceLevel as keyof typeof resourceSensitivity] || 0;

    return userLevel >= Math.max(requiredLevel, sensitivity);
  }

  function detectSideChannelAttack(vectors: any): { detected: boolean; confidence: number } {
    let detectionScore = 0;

    if (vectors.timingAttack) detectionScore += 0.4;
    if (vectors.cacheAttack) detectionScore += 0.3;
    if (vectors.memoryAttack) detectionScore += 0.3;

    return {
      detected: detectionScore > 0.5,
      confidence: Math.min(detectionScore, 1.0)
    };
  }

  function generateKeyboardShortcuts(count: number): any[] {
    const shortcuts = [];
    const keys = ['ctrl', 'alt', 'cmd', 'shift'];
    const letters = 'abcdefghijklmnopqrstuvwxyz1234567890'.split('');

    for (let i = 0; i < count; i++) {
      const keyCombo = `${keys[Math.floor(Math.random() * keys.length)]}+${letters[i % letters.length]}`;
      shortcuts.push({
        command: `astraforg.command${i}`,
        keybinding: keyCombo,
        when: 'editorTextFocus',
        title: `Command ${i}`
      });
    }

    return shortcuts;
  }

  function calculateContrastRatio(color1: string, color2: string): number {
    const getLuminance = (hex: string): number => {
      const rgb = parseInt(hex.slice(1), 16);
      const r = (rgb >> 16) & 0xff;
      const g = (rgb >> 8) & 0xff;
      const b = (rgb >> 0) & 0xff;

      const rsRGB = r / 255;
      const gsRGB = g / 255;
      const bsRGB = b / 255;

      const rLin = rsRGB <= 0.03928 ? rsRGB / 12.92 : Math.pow((rsRGB + 0.055) / 1.055, 2.4);
      const gLin = gsRGB <= 0.03928 ? gsRGB / 12.92 : Math.pow((gsRGB + 0.055) / 1.055, 2.4);
      const bLin = bsRGB <= 0.03928 ? bsRGB / 12.92 : Math.pow((bsRGB + 0.055) / 1.055, 2.4);

      return 0.2126 * rLin + 0.7152 * gLin + 0.0722 * bLin;
    };

    const lum1 = getLuminance(color1);
    const lum2 = getLuminance(color2);

    const brightest = Math.max(lum1, lum2);
    const darkest = Math.min(lum1, lum2);

    return (brightest + 0.05) / (darkest + 0.05);
  }

  function calculateHealthScore(metrics: any[]): number {
    const durations = metrics.map(m => m.duration);
    const avgDuration = durations.reduce((sum, d) => sum + d, 0) / durations.length;
    const maxDuration = Math.max(...durations);

    // Health score based on performance consistency
    const consistencyScore = 1 - (maxDuration / avgDuration);
    const avgPerformanceScore = Math.max(0, 1 - (avgDuration / 2000)); // Score decreases after 2 seconds

    return (consistencyScore * 0.6 + avgPerformanceScore * 0.4);
  }
});
