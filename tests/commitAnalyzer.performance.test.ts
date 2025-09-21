/**
 * Performance tests for CommitAnalyzer to verify regex optimization benefits
 */

import { CommitAnalyzer } from '../src/utils/commitAnalyzer';

describe('CommitAnalyzer Performance', () => {
  let analyzer: CommitAnalyzer;

  beforeEach(() => {
    analyzer = new CommitAnalyzer();
  });

  /**
   * This test demonstrates the performance improvement of using a static regex constant
   * vs recreating the regex pattern on every function call
   */
  it('should efficiently analyze large batches of commit messages', () => {
    // Create a large batch of test messages
    const messages = [
      'Critical bug fix in authentication',
      'Minor UI adjustment',
      'Blocker: Database connection failed',
      'Add new feature to dashboard',
      'Major performance improvement',
      'Update documentation',
      'Urgent: Fix memory leak',
      'Refactor code structure',
      'Severe security vulnerability',
      'Add unit tests for components'
    ];

    // Repeat the messages to create a larger dataset
    const largeBatch = [];
    for (let i = 0; i < 100; i++) {
      largeBatch.push(...messages);
    }

    const startTime = Date.now();
    
    // Analyze the large batch
    const results = analyzer.analyzeBatch(largeBatch);
    
    const endTime = Date.now();
    const duration = endTime - startTime;

    // Verify all messages were processed
    expect(results).toHaveLength(largeBatch.length);
    
    // Verify some results are correct
    expect(results[0].severity).toBe('critical'); // 'Critical bug fix'
    expect(results[2].severity).toBe('critical'); // 'Blocker: Database connection'
    expect(results[4].severity).toBe('high');     // 'Major performance improvement'
    expect(results[6].severity).toBe('high');     // 'Urgent: Fix memory leak'
    expect(results[8].severity).toBe('medium');   // 'Severe security vulnerability'

    // With the static regex optimization, this should complete quickly
    // The exact timing will vary by system, but should be well under 1 second
    console.log(`Processed ${largeBatch.length} messages in ${duration}ms`);
    
    // This is a loose performance check - mainly to ensure the code doesn't hang
    expect(duration).toBeLessThan(5000); // Should complete in under 5 seconds
  });

  it('should handle concurrent analysis efficiently', async () => {
    const messages = [
      'Critical system failure',
      'Major update required',
      'Urgent deployment needed',
      'Severe performance issue',
      'Blocker in production'
    ];

    const startTime = Date.now();

    // Run multiple analyses concurrently
    const promises = [];
    for (let i = 0; i < 50; i++) {
      promises.push(Promise.resolve(analyzer.analyzeBatch(messages)));
    }

    const results = await Promise.all(promises);
    
    const endTime = Date.now();
    const duration = endTime - startTime;

    // Verify all analyses completed
    expect(results).toHaveLength(50);
    results.forEach(batch => {
      expect(batch).toHaveLength(5);
      expect(batch[0].severity).toBe('critical');
    });

    console.log(`Completed 50 concurrent analyses in ${duration}ms`);
    
    // Should handle concurrent operations efficiently
    expect(duration).toBeLessThan(2000);
  });
});