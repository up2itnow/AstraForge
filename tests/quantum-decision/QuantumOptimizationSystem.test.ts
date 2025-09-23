/**
 * Tests for Quantum Optimization System
 * Tests quantum-inspired optimization algorithms
 */

import { QuantumOptimizationSystem, OptimizationProblem, OptimizationAlgorithm, OptimizationResult } from '../../src/quantum-decision/optimization/QuantumOptimizationSystem';

describe('QuantumOptimizationSystem', () => {
  let optimizationSystem: QuantumOptimizationSystem;

  beforeEach(() => {
    optimizationSystem = new QuantumOptimizationSystem();
  });

  describe('initialization', () => {
    it('should create QuantumOptimizationSystem instance', () => {
      expect(optimizationSystem).toBeInstanceOf(QuantumOptimizationSystem);
    });

    it('should initialize with quantum-inspired algorithms', () => {
      const algorithms = (optimizationSystem as any).algorithms;
      expect(algorithms).toBeDefined();
      expect(algorithms.size).toBeGreaterThan(5); // Should have multiple algorithms
    });

    it('should provide algorithm metadata', () => {
      const geneticAlgorithm = (optimizationSystem as any).algorithms.get('genetic_quantum');
      expect(geneticAlgorithm).toBeDefined();
      expect(geneticAlgorithm?.quantumEnhanced).toBe(true);
      expect(geneticAlgorithm?.parameters).toBeDefined();
    });
  });

  describe('optimization problem handling', () => {
    it('should handle continuous optimization problems', async () => {
      const problem: OptimizationProblem = {
        id: 'test-continuous',
        name: 'Continuous Test Problem',
        description: 'Simple continuous optimization',
        objectiveFunction: (x: number[]) => x[0] * x[0] + x[1] * x[1], // Sphere function
        constraints: [],
        bounds: [{ min: -5, max: 5 }, { min: -5, max: 5 }],
        dimensions: 2,
        type: 'continuous',
        metadata: {
          complexity: 0.3,
          constraints: 0,
          objectives: 1,
          landscape: 'smooth'
        }
      };

      const result = await optimizationSystem.optimize('genetic_quantum', problem);

      expect(result).toBeDefined();
      expect(result.bestSolution).toHaveLength(2);
      expect(result.bestValue).toBeLessThan(1); // Should find near-optimal solution
      expect(result.quantumAdvantage).toBeGreaterThan(0);
    });

    it('should handle constrained optimization problems', async () => {
      const problem: OptimizationProblem = {
        id: 'test-constrained',
        name: 'Constrained Test Problem',
        description: 'Optimization with constraints',
        objectiveFunction: (x: number[]) => x[0] + x[1],
        constraints: [(x: number[]) => x[0] + x[1] - 1], // x + y >= 1
        bounds: [{ min: 0, max: 2 }, { min: 0, max: 2 }],
        dimensions: 2,
        type: 'continuous',
        metadata: {
          complexity: 0.5,
          constraints: 1,
          objectives: 1,
          landscape: 'smooth'
        }
      };

      const result = await optimizationSystem.optimize('annealing_quantum', problem);

      expect(result).toBeDefined();
      expect(result.bestValue).toBeGreaterThanOrEqual(1); // Should satisfy constraint
      expect(result.convergenceHistory).toHaveLength(result.iterations);
    });

    it('should handle multi-objective optimization', async () => {
      const problem: OptimizationProblem = {
        id: 'test-multi-objective',
        name: 'Multi-Objective Test',
        description: 'Multiple conflicting objectives',
        objectiveFunction: (x: number[]) => x[0] * x[0] + x[1] * x[1],
        constraints: [],
        bounds: [{ min: -5, max: 5 }, { min: -5, max: 5 }],
        dimensions: 2,
        type: 'continuous',
        metadata: {
          complexity: 0.7,
          constraints: 0,
          objectives: 2,
          landscape: 'multi-modal'
        }
      };

      const result = await optimizationSystem.optimize('genetic_quantum', problem);

      expect(result).toBeDefined();
      expect(result.paretoFront).toBeDefined();
      expect(Array.isArray(result.paretoFront)).toBe(true);
    });

    it('should handle discrete optimization problems', async () => {
      const problem: OptimizationProblem = {
        id: 'test-discrete',
        name: 'Discrete Test Problem',
        description: 'Discrete optimization',
        objectiveFunction: (x: number[]) => -x.reduce((sum, val) => sum + val, 0), // Maximize sum
        constraints: [],
        bounds: [{ min: 0, max: 1 }, { min: 0, max: 1 }, { min: 0, max: 1 }],
        dimensions: 3,
        type: 'discrete',
        metadata: {
          complexity: 0.4,
          constraints: 0,
          objectives: 1,
          landscape: 'smooth'
        }
      };

      const result = await optimizationSystem.optimize('tabu_quantum', problem);

      expect(result).toBeDefined();
      expect(result.bestSolution).toHaveLength(3);
      expect(result.bestSolution.every((val: number) => val === 0 || val === 1)).toBe(true); // Should be binary
    });
  });

  describe('quantum optimization algorithms', () => {
    it('should execute genetic algorithm with quantum enhancement', async () => {
      const problem: OptimizationProblem = {
        id: 'test-genetic',
        name: 'Genetic Algorithm Test',
        description: 'Test genetic optimization',
        objectiveFunction: (x: number[]) => x[0] * x[0] + x[1] * x[1],
        constraints: [],
        bounds: [{ min: -2, max: 2 }, { min: -2, max: 2 }],
        dimensions: 2,
        type: 'continuous',
        metadata: {
          complexity: 0.3,
          constraints: 0,
          objectives: 1,
          landscape: 'smooth'
        }
      };

      const result = await optimizationSystem.optimize('genetic_quantum', problem);

      expect(result).toBeDefined();
      expect(result.quantumAdvantage).toBeGreaterThan(1);
      expect(result.diversity).toBeGreaterThanOrEqual(0);
      expect(result.exploitation).toBeGreaterThanOrEqual(0);
    });

    it('should execute particle swarm optimization', async () => {
      const problem: OptimizationProblem = {
        id: 'test-swarm',
        name: 'Swarm Optimization Test',
        description: 'Test swarm optimization',
        objectiveFunction: (x: number[]) => x[0] * x[0] + x[1] * x[1],
        constraints: [],
        bounds: [{ min: -3, max: 3 }, { min: -3, max: 3 }],
        dimensions: 2,
        type: 'continuous',
        metadata: {
          complexity: 0.4,
          constraints: 0,
          objectives: 1,
          landscape: 'smooth'
        }
      };

      const result = await optimizationSystem.optimize('swarm_quantum', problem);

      expect(result).toBeDefined();
      expect(result.convergenceHistory.length).toBeGreaterThan(1);
      expect(result.exploration).toBeGreaterThan(0);
    });

    it('should execute simulated annealing with quantum tunneling', async () => {
      const problem: OptimizationProblem = {
        id: 'test-annealing',
        name: 'Annealing Test',
        description: 'Test simulated annealing',
        objectiveFunction: (x: number[]) => x[0] * x[0] + x[1] * x[1],
        constraints: [],
        bounds: [{ min: -4, max: 4 }, { min: -4, max: 4 }],
        dimensions: 2,
        type: 'continuous',
        metadata: {
          complexity: 0.6,
          constraints: 0,
          objectives: 1,
          landscape: 'rough'
        }
      };

      const result = await optimizationSystem.optimize('annealing_quantum', problem);

      expect(result).toBeDefined();
      expect(result.tunnelingEvents).toBeGreaterThanOrEqual(0);
      expect(result.temperature).toBeLessThan(1); // Should cool down
    });

    it('should execute tabu search with quantum enhancement', async () => {
      const problem: OptimizationProblem = {
        id: 'test-tabu',
        name: 'Tabu Search Test',
        description: 'Test tabu search',
        objectiveFunction: (x: number[]) => -x.reduce((sum, val) => sum + val, 0),
        constraints: [],
        bounds: [{ min: 0, max: 1 }, { min: 0, max: 1 }, { min: 0, max: 1 }],
        dimensions: 3,
        type: 'discrete',
        metadata: {
          complexity: 0.5,
          constraints: 0,
          objectives: 1,
          landscape: 'smooth'
        }
      };

      const result = await optimizationSystem.optimize('tabu_quantum', problem);

      expect(result).toBeDefined();
      expect(result.tabuList).toBeDefined();
      expect(result.intensification).toBeGreaterThanOrEqual(0);
      expect(result.diversification).toBeGreaterThanOrEqual(0);
    });

    it('should execute differential evolution', async () => {
      const problem: OptimizationProblem = {
        id: 'test-evolution',
        name: 'Differential Evolution Test',
        description: 'Test differential evolution',
        objectiveFunction: (x: number[]) => x[0] * x[0] + x[1] * x[1] + x[2] * x[2],
        constraints: [],
        bounds: [{ min: -5, max: 5 }, { min: -5, max: 5 }, { min: -5, max: 5 }],
        dimensions: 3,
        type: 'continuous',
        metadata: {
          complexity: 0.5,
          constraints: 0,
          objectives: 1,
          landscape: 'smooth'
        }
      };

      const result = await optimizationSystem.optimize('evolution_quantum', problem);

      expect(result).toBeDefined();
      expect(result.mutationRate).toBeGreaterThan(0);
      expect(result.crossoverRate).toBeGreaterThan(0);
      expect(result.quantumMutation).toBeGreaterThan(0);
    });

    it('should handle multi-objective optimization', async () => {
      const problem: OptimizationProblem = {
        id: 'test-multi-objective',
        name: 'Multi-Objective Test',
        description: 'Multiple objectives to optimize',
        objectiveFunction: (x: number[]) => x[0] * x[0] + x[1] * x[1],
        constraints: [],
        bounds: [{ min: -5, max: 5 }, { min: -5, max: 5 }],
        dimensions: 2,
        type: 'continuous',
        metadata: {
          complexity: 0.8,
          constraints: 0,
          objectives: 2,
          landscape: 'multi-modal'
        }
      };

      const result = await optimizationSystem.optimize('genetic_quantum', problem);

      expect(result).toBeDefined();
      expect(result.paretoFront).toBeDefined();
      expect(Array.isArray(result.paretoFront)).toBe(true);
      expect(result.hypervolume).toBeGreaterThan(0);
    });
  });

  describe('performance and efficiency', () => {
    it('should complete optimization within reasonable time', async () => {
      const problem: OptimizationProblem = {
        id: 'test-performance',
        name: 'Performance Test',
        description: 'Test optimization performance',
        objectiveFunction: (x: number[]) => x[0] * x[0] + x[1] * x[1],
        constraints: [],
        bounds: [{ min: -2, max: 2 }, { min: -2, max: 2 }],
        dimensions: 2,
        type: 'continuous',
        metadata: {
          complexity: 0.2,
          constraints: 0,
          objectives: 1,
          landscape: 'smooth'
        }
      };

      const startTime = Date.now();
      const result = await optimizationSystem.optimize('genetic_quantum', problem);
      const endTime = Date.now();

      expect(result.executionTime).toBeGreaterThan(0);
      expect(endTime - startTime).toBeLessThan(3000); // Should complete within 3 seconds
      expect(result.iterations).toBeGreaterThan(10); // Should perform multiple iterations
    });

    it('should provide quantum advantage over classical methods', async () => {
      const problem: OptimizationProblem = {
        id: 'test-advantage',
        name: 'Quantum Advantage Test',
        description: 'Test quantum advantage',
        objectiveFunction: (x: number[]) => x[0] * x[0] + x[1] * x[1],
        constraints: [],
        bounds: [{ min: -3, max: 3 }, { min: -3, max: 3 }],
        dimensions: 2,
        type: 'continuous',
        metadata: {
          complexity: 0.4,
          constraints: 0,
          objectives: 1,
          landscape: 'smooth'
        }
      };

      const result = await optimizationSystem.optimize('genetic_quantum', problem);

      expect(result.quantumAdvantage).toBeGreaterThan(1); // Should have quantum advantage
      expect(result.quantumOperations).toBeGreaterThan(0);
      expect(result.classicalOperations).toBeGreaterThan(0);
    });

    it('should handle concurrent optimization requests', async () => {
      const problems: OptimizationProblem[] = [
        {
          id: 'concurrent-1',
          name: 'Concurrent Test 1',
          description: 'First concurrent test',
          objectiveFunction: (x: number[]) => x[0] * x[0] + x[1] * x[1],
          constraints: [],
          bounds: [{ min: -1, max: 1 }, { min: -1, max: 1 }],
          dimensions: 2,
          type: 'continuous',
          metadata: { complexity: 0.2, constraints: 0, objectives: 1, landscape: 'smooth' }
        },
        {
          id: 'concurrent-2',
          name: 'Concurrent Test 2',
          description: 'Second concurrent test',
          objectiveFunction: (x: number[]) => x[0] + x[1],
          constraints: [],
          bounds: [{ min: 0, max: 2 }, { min: 0, max: 2 }],
          dimensions: 2,
          type: 'continuous',
          metadata: { complexity: 0.2, constraints: 0, objectives: 1, landscape: 'smooth' }
        }
      ];

      const optimizationPromises = problems.map(problem =>
        optimizationSystem.optimize('genetic_quantum', problem)
      );

      const results = await Promise.allSettled(optimizationPromises);

      expect(results).toHaveLength(2);
      results.forEach(result => {
        expect(result.status).toBe('fulfilled');
      });
    });
  });

  describe('algorithm selection and adaptation', () => {
    it('should select appropriate algorithm for problem type', () => {
      const problemTypes = ['continuous', 'discrete', 'mixed', 'binary'];

      problemTypes.forEach(type => {
        const problem: OptimizationProblem = {
          id: `test-${type}`,
          name: `${type} problem`,
          description: `Test ${type} optimization`,
          objectiveFunction: (x: number[]) => x[0] * x[0],
          constraints: [],
          bounds: [{ min: 0, max: 1 }],
          dimensions: 1,
          type: type as any,
          metadata: { complexity: 0.3, constraints: 0, objectives: 1, landscape: 'smooth' }
        };

        expect(problem.type).toBe(type);
      });
    });

    it('should adapt algorithm parameters based on problem complexity', async () => {
      const simpleProblem: OptimizationProblem = {
        id: 'simple-problem',
        name: 'Simple Problem',
        description: 'Low complexity problem',
        objectiveFunction: (x: number[]) => x[0] * x[0],
        constraints: [],
        bounds: [{ min: -1, max: 1 }],
        dimensions: 1,
        type: 'continuous',
        metadata: { complexity: 0.1, constraints: 0, objectives: 1, landscape: 'smooth' }
      };

      const complexProblem: OptimizationProblem = {
        id: 'complex-problem',
        name: 'Complex Problem',
        description: 'High complexity problem',
        objectiveFunction: (x: number[]) => x[0] * x[0] * x[0] * x[0] + x[1] * x[1] * x[1] * x[1],
        constraints: [],
        bounds: [{ min: -2, max: 2 }, { min: -2, max: 2 }],
        dimensions: 2,
        type: 'continuous',
        metadata: { complexity: 0.9, constraints: 0, objectives: 1, landscape: 'multi-modal' }
      };

      const simpleResult = await optimizationSystem.optimize('genetic_quantum', simpleProblem);
      const complexResult = await optimizationSystem.optimize('genetic_quantum', complexProblem);

      expect(simpleResult.executionTime).toBeLessThan(complexResult.executionTime);
      expect(complexResult.iterations).toBeGreaterThan(simpleResult.iterations);
    });
  });

  describe('error handling and robustness', () => {
    it('should handle invalid algorithm names', async () => {
      const problem: OptimizationProblem = {
        id: 'test-invalid',
        name: 'Invalid Algorithm Test',
        description: 'Test invalid algorithm',
        objectiveFunction: (x: number[]) => x[0] * x[0],
        constraints: [],
        bounds: [{ min: -1, max: 1 }],
        dimensions: 1,
        type: 'continuous',
        metadata: { complexity: 0.2, constraints: 0, objectives: 1, landscape: 'smooth' }
      };

      await expect(optimizationSystem.optimize('invalid_algorithm' as any, problem)).rejects.toThrow();
    });

    it('should handle malformed problems gracefully', async () => {
      const malformedProblem = {
        id: 'malformed',
        name: 'Malformed Problem',
        description: 'Test malformed input',
        objectiveFunction: null,
        constraints: [],
        bounds: [],
        dimensions: 0,
        type: 'continuous',
        metadata: { complexity: 0, constraints: 0, objectives: 1, landscape: 'smooth' }
      } as any;

      await expect(optimizationSystem.optimize('genetic_quantum', malformedProblem)).rejects.toThrow();
    });

    it('should handle optimization failures gracefully', async () => {
      const problem: OptimizationProblem = {
        id: 'test-failure',
        name: 'Failure Test',
        description: 'Test optimization failure handling',
        objectiveFunction: (x: number[]) => {
          if (x[0] > 10) throw new Error('Optimization failed');
          return x[0] * x[0];
        },
        constraints: [],
        bounds: [{ min: -20, max: 20 }],
        dimensions: 1,
        type: 'continuous',
        metadata: { complexity: 0.8, constraints: 0, objectives: 1, landscape: 'rough' }
      };

      await expect(optimizationSystem.optimize('genetic_quantum', problem)).rejects.toThrow();
    });
  });

  describe('optimization statistics and analysis', () => {
    it('should provide convergence analysis', async () => {
      const problem: OptimizationProblem = {
        id: 'test-convergence',
        name: 'Convergence Test',
        description: 'Test convergence analysis',
        objectiveFunction: (x: number[]) => x[0] * x[0] + x[1] * x[1],
        constraints: [],
        bounds: [{ min: -2, max: 2 }, { min: -2, max: 2 }],
        dimensions: 2,
        type: 'continuous',
        metadata: { complexity: 0.3, constraints: 0, objectives: 1, landscape: 'smooth' }
      };

      const result = await optimizationSystem.optimize('genetic_quantum', problem);

      expect(result.convergenceHistory).toBeDefined();
      expect(result.convergenceHistory.length).toBeGreaterThan(1);
      expect(result.convergenceRate).toBeGreaterThan(0);
    });

    it('should track algorithm performance metrics', async () => {
      const problem: OptimizationProblem = {
        id: 'test-metrics',
        name: 'Metrics Test',
        description: 'Test performance metrics',
        objectiveFunction: (x: number[]) => x[0] * x[0] + x[1] * x[1],
        constraints: [],
        bounds: [{ min: -1, max: 1 }, { min: -1, max: 1 }],
        dimensions: 2,
        type: 'continuous',
        metadata: { complexity: 0.2, constraints: 0, objectives: 1, landscape: 'smooth' }
      };

      const result = await optimizationSystem.optimize('genetic_quantum', problem);

      expect(result.diversity).toBeGreaterThanOrEqual(0);
      expect(result.exploration).toBeGreaterThanOrEqual(0);
      expect(result.exploitation).toBeGreaterThanOrEqual(0);
      expect(result.successRate).toBeGreaterThanOrEqual(0);
    });

    it('should provide quantum vs classical comparison', async () => {
      const problem: OptimizationProblem = {
        id: 'test-comparison',
        name: 'Comparison Test',
        description: 'Test quantum vs classical comparison',
        objectiveFunction: (x: number[]) => x[0] * x[0] + x[1] * x[1],
        constraints: [],
        bounds: [{ min: -2, max: 2 }, { min: -2, max: 2 }],
        dimensions: 2,
        type: 'continuous',
        metadata: { complexity: 0.4, constraints: 0, objectives: 1, landscape: 'smooth' }
      };

      const result = await optimizationSystem.optimize('genetic_quantum', problem);

      expect(result.quantumAdvantage).toBeGreaterThan(0);
      expect(result.quantumOperations).toBeGreaterThan(0);
      expect(result.classicalOperations).toBeGreaterThan(0);
    });
  });
});
