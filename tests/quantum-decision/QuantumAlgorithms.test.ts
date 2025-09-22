/**
 * Tests for Quantum Algorithms Library
 * Tests quantum-inspired algorithms implementation
 */

import { QuantumAlgorithmsLibrary, QuantumAlgorithm, QuantumResult } from '../../src/quantum-decision/algorithms/QuantumAlgorithms';

describe('QuantumAlgorithmsLibrary', () => {
  let algorithmsLib: QuantumAlgorithmsLibrary;

  beforeEach(() => {
    algorithmsLib = new QuantumAlgorithmsLibrary();
  });

  describe('initialization', () => {
    it('should create QuantumAlgorithmsLibrary instance', () => {
      expect(algorithmsLib).toBeInstanceOf(QuantumAlgorithmsLibrary);
    });

    it('should initialize with all required algorithms', () => {
      const algorithmNames = ['superposition', 'entanglement', 'interference', 'walk', 'fourier', 'phase', 'counting'];
      algorithmNames.forEach(name => {
        const algorithm = algorithmsLib.getAlgorithm(name);
        expect(algorithm).toBeDefined();
        expect(algorithm?.name).toBe(name);
      });
    });

    it('should provide algorithm metadata', () => {
      const superposition = algorithmsLib.getAlgorithm('superposition');
      expect(superposition).toBeDefined();
      expect(superposition?.description).toBeDefined();
      expect(superposition?.complexity).toBeDefined();
      expect(superposition?.quantumAdvantage).toBeGreaterThan(0);
    });
  });

  describe('superposition algorithm', () => {
    it('should handle superposition algorithm', () => {
      const superposition = algorithmsLib.getAlgorithm('superposition');
      expect(superposition).toBeDefined();
      expect(superposition?.type).toBe('superposition');
    });

    it('should execute superposition algorithm', async () => {
      const superposition = algorithmsLib.getAlgorithm('superposition');
      expect(superposition).toBeDefined();

      if (superposition) {
        const input = { states: ['state1', 'state2', 'state3'] };
        const result = await superposition.execute(input);

        expect(result).toBeDefined();
        expect(typeof result.confidence).toBe('number');
        expect(result.superpositionStates).toBeGreaterThan(0);
        expect(result.quantumOperations).toBeGreaterThan(0);
      }
    });

    it('should handle superposition complexity analysis', () => {
      const superposition = algorithmsLib.getAlgorithm('superposition');
      expect(superposition?.complexity).toBeDefined();
      expect(['O(1)', 'O(log n)', 'O(n)', 'O(n log n)', 'O(n²)', 'O(2^n)']).toContain(superposition?.complexity);
    });
  });

  describe('entanglement algorithm', () => {
    it('should handle entanglement algorithm', () => {
      const entanglement = algorithmsLib.getAlgorithm('entanglement');
      expect(entanglement).toBeDefined();
      expect(entanglement?.type).toBe('entanglement');
    });

    it('should execute entanglement algorithm', async () => {
      const entanglement = algorithmsLib.getAlgorithm('entanglement');
      expect(entanglement).toBeDefined();

      if (entanglement) {
        const input = { variables: ['var1', 'var2', 'var3'] };
        const result = await entanglement.execute(input);

        expect(result).toBeDefined();
        expect(result.entanglementPairs).toBeGreaterThan(0);
        expect(result.confidence).toBeGreaterThanOrEqual(0);
      }
    });

    it('should provide quantum advantage for entanglement', () => {
      const entanglement = algorithmsLib.getAlgorithm('entanglement');
      expect(entanglement?.quantumAdvantage).toBeGreaterThan(0);
    });
  });

  describe('interference algorithm', () => {
    it('should handle interference algorithm', () => {
      const interference = algorithmsLib.getAlgorithm('interference');
      expect(interference).toBeDefined();
      expect(interference?.type).toBe('interference');
    });

    it('should execute interference algorithm', async () => {
      const interference = algorithmsLib.getAlgorithm('interference');
      expect(interference).toBeDefined();

      if (interference) {
        const input = { waves: [{ amplitude: 0.5, phase: 0 }, { amplitude: 0.3, phase: Math.PI }] };
        const result = await interference.execute(input);

        expect(result).toBeDefined();
        expect(result.interferencePatterns).toBeGreaterThanOrEqual(0);
        expect(result.errorProbability).toBeLessThanOrEqual(1);
      }
    });

    it('should demonstrate constructive interference', async () => {
      const interference = algorithmsLib.getAlgorithm('interference');
      expect(interference).toBeDefined();

      if (interference) {
        const input = { waves: [{ amplitude: 0.5, phase: 0 }, { amplitude: 0.5, phase: 0 }] };
        const result = await interference.execute(input);

        expect(result.confidence).toBeGreaterThan(0.5); // Should be high confidence for constructive interference
      }
    });
  });

  describe('quantum walk algorithm', () => {
    it('should handle quantum walk algorithm', () => {
      const walk = algorithmsLib.getAlgorithm('walk');
      expect(walk).toBeDefined();
      expect(walk?.type).toBe('walk');
    });

    it('should execute quantum walk algorithm', async () => {
      const walk = algorithmsLib.getAlgorithm('walk');
      expect(walk).toBeDefined();

      if (walk) {
        const input = { graph: { nodes: ['A', 'B', 'C'], edges: [['A', 'B'], ['B', 'C']] } };
        const result = await walk.execute(input);

        expect(result).toBeDefined();
        expect(result.convergenceTime).toBeGreaterThan(0);
        expect(result.classicalOperations).toBeGreaterThan(0);
      }
    });

    it('should be more efficient than classical random walk', () => {
      const walk = algorithmsLib.getAlgorithm('walk');
      expect(walk?.quantumAdvantage).toBeGreaterThan(1); // Should have quantum advantage
    });
  });

  describe('quantum fourier transform', () => {
    it('should handle fourier transform algorithm', () => {
      const fourier = algorithmsLib.getAlgorithm('fourier');
      expect(fourier).toBeDefined();
      expect(fourier?.type).toBe('fourier');
    });

    it('should execute quantum fourier transform', async () => {
      const fourier = algorithmsLib.getAlgorithm('fourier');
      expect(fourier).toBeDefined();

      if (fourier) {
        const input = { signal: [1, 0, 1, 0, 1, 0, 1, 0] };
        const result = await fourier.execute(input);

        expect(result).toBeDefined();
        expect(result.quantumOperations).toBeGreaterThan(0);
        expect(result.errorProbability).toBeLessThan(0.1); // Should be very accurate
      }
    });

    it('should have exponential quantum advantage', () => {
      const fourier = algorithmsLib.getAlgorithm('fourier');
      expect(fourier?.quantumAdvantage).toBeGreaterThan(10); // Should have significant quantum advantage
    });
  });

  describe('quantum phase estimation', () => {
    it('should handle phase estimation algorithm', () => {
      const phase = algorithmsLib.getAlgorithm('phase');
      expect(phase).toBeDefined();
      expect(phase?.type).toBe('phase');
    });

    it('should execute phase estimation', async () => {
      const phase = algorithmsLib.getAlgorithm('phase');
      expect(phase).toBeDefined();

      if (phase) {
        const input = { unitary: { phase: Math.PI / 4 }, precision: 0.01 };
        const result = await phase.execute(input);

        expect(result).toBeDefined();
        expect(Math.abs(result.result - Math.PI / 4)).toBeLessThan(0.1); // Should estimate phase accurately
        expect(result.confidence).toBeGreaterThan(0.9);
      }
    });

    it('should provide high precision phase estimation', () => {
      const phase = algorithmsLib.getAlgorithm('phase');
      expect(phase?.quantumAdvantage).toBeGreaterThan(5); // Should have good quantum advantage
    });
  });

  describe('quantum counting algorithm', () => {
    it('should handle counting algorithm', () => {
      const counting = algorithmsLib.getAlgorithm('counting');
      expect(counting).toBeDefined();
      expect(counting?.type).toBe('counting');
    });

    it('should execute quantum counting', async () => {
      const counting = algorithmsLib.getAlgorithm('counting');
      expect(counting).toBeDefined();

      if (counting) {
        const input = { markedStates: 5, totalStates: 32 };
        const result = await counting.execute(input);

        expect(result).toBeDefined();
        expect(Math.abs(result.result - 5)).toBeLessThan(2); // Should count accurately
        expect(result.quantumOperations).toBeLessThan(result.classicalOperations);
      }
    });

    it('should have quadratic quantum advantage', () => {
      const counting = algorithmsLib.getAlgorithm('counting');
      expect(counting?.quantumAdvantage).toBeGreaterThan(2); // Should have good quantum advantage
    });
  });

  describe('algorithm performance', () => {
    it('should execute algorithms within reasonable time', async () => {
      const algorithms = ['superposition', 'entanglement', 'interference', 'walk', 'fourier'];

      for (const algorithmName of algorithms) {
        const algorithm = algorithmsLib.getAlgorithm(algorithmName);
        if (algorithm) {
          const startTime = Date.now();
          const result = await algorithm.execute({ test: true });
          const endTime = Date.now();

          expect(result.convergenceTime).toBeGreaterThan(0);
          expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
        }
      }
    });

    it('should provide consistent results', async () => {
      const algorithm = algorithmsLib.getAlgorithm('superposition');
      if (algorithm) {
        const input = { states: ['A', 'B', 'C'] };

        const result1 = await algorithm.execute(input);
        const result2 = await algorithm.execute(input);

        // Results should be deterministic for same input
        expect(result1.confidence).toBe(result2.confidence);
        expect(result1.quantumOperations).toBe(result2.quantumOperations);
      }
    });

    it('should handle concurrent algorithm execution', async () => {
      const algorithmPromises = [
        algorithmsLib.getAlgorithm('superposition')?.execute({ test: 1 }),
        algorithmsLib.getAlgorithm('entanglement')?.execute({ test: 2 }),
        algorithmsLib.getAlgorithm('interference')?.execute({ test: 3 })
      ].filter(Boolean) as Promise<QuantumResult>[];

      const results = await Promise.allSettled(algorithmPromises);

      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result.status).toBe('fulfilled');
      });
    });
  });

  describe('algorithm metadata', () => {
    it('should provide accurate complexity measures', () => {
      const algorithms = ['superposition', 'entanglement', 'interference', 'walk', 'fourier', 'phase', 'counting'];

      algorithms.forEach(name => {
        const algorithm = algorithmsLib.getAlgorithm(name);
        expect(algorithm?.complexity).toBeDefined();
        expect(algorithm?.quantumAdvantage).toBeGreaterThan(0);
        expect(algorithm?.description).toBeDefined();
      });
    });

    it('should categorize algorithms by type', () => {
      const superposition = algorithmsLib.getAlgorithm('superposition');
      const entanglement = algorithmsLib.getAlgorithm('entanglement');
      const interference = algorithmsLib.getAlgorithm('interference');

      expect(superposition?.type).toBe('superposition');
      expect(entanglement?.type).toBe('entanglement');
      expect(interference?.type).toBe('interference');
    });

    it('should provide algorithm descriptions', () => {
      const fourier = algorithmsLib.getAlgorithm('fourier');
      expect(fourier?.description).toBeDefined();
      expect(fourier?.description.length).toBeGreaterThan(10); // Should have meaningful description
    });
  });

  describe('error handling', () => {
    it('should handle invalid algorithm names', () => {
      const invalidAlgorithm = algorithmsLib.getAlgorithm('invalid_algorithm');
      expect(invalidAlgorithm).toBeUndefined();
    });

    it('should handle malformed input gracefully', async () => {
      const superposition = algorithmsLib.getAlgorithm('superposition');
      if (superposition) {
        const invalidInput = null as any;
        const result = await superposition.execute(invalidInput);

        expect(result).toBeDefined();
        expect(result.errorProbability).toBeGreaterThanOrEqual(0);
      }
    });

    it('should provide fallback for algorithm failures', async () => {
      const algorithm = algorithmsLib.getAlgorithm('superposition');
      if (algorithm) {
        const emptyInput = {};
        const result = await algorithm.execute(emptyInput);

        expect(result).toBeDefined();
        expect(result.confidence).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('integration with decision system', () => {
    it('should provide algorithms for decision making', () => {
      const algorithmNames = ['superposition', 'entanglement', 'interference', 'walk', 'fourier', 'phase', 'counting'];

      algorithmNames.forEach(name => {
        const algorithm = algorithmsLib.getAlgorithm(name);
        expect(algorithm).toBeDefined();
        expect(algorithm?.execute).toBeDefined();
      });
    });

    it('should support hybrid algorithm combinations', async () => {
      const superposition = algorithmsLib.getAlgorithm('superposition');
      const entanglement = algorithmsLib.getAlgorithm('entanglement');

      if (superposition && entanglement) {
        const input = { states: ['A', 'B'], variables: ['x', 'y'] };

        const superResult = await superposition.execute(input);
        const entangleResult = await entanglement.execute(input);

        expect(superResult).toBeDefined();
        expect(entangleResult).toBeDefined();
      }
    });

    it('should provide quantum advantage metrics', () => {
      const algorithms = ['fourier', 'phase', 'counting'];

      algorithms.forEach(name => {
        const algorithm = algorithmsLib.getAlgorithm(name);
        expect(algorithm?.quantumAdvantage).toBeGreaterThan(1);
      });
    });
  });
});
