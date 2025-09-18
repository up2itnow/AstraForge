"use strict";
/**
 * Simple test to verify our Jest setup works
 */
describe('Simple Test Suite', () => {
    it('should pass basic tests', () => {
        expect(2 + 2).toBe(4);
        expect('hello').toBeTruthy();
        expect([1, 2, 3]).toHaveLength(3);
    });
    it('should handle async operations', async () => {
        const promise = Promise.resolve('success');
        await expect(promise).resolves.toBe('success');
    });
    it('should verify our test environment', () => {
        expect(process.env.NODE_ENV).toBeDefined();
        expect(typeof jest).toBe('object');
    });
});
//# sourceMappingURL=simple.test.js.map