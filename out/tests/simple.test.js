/**
 * Simple integration test to verify basic functionality with real APIs
 */
import * as dotenv from 'dotenv';
// Load environment variables
dotenv.config();
describe('AstraForge Basic Integration', () => {
    it('should have required environment variables configured', () => {
        // Check for essential environment variables
        expect(process.env.OPENROUTER_API_KEY).toBeDefined();
        expect(process.env.OPENROUTER_MODELS_TO_USE).toBeDefined();
        // Verify models are properly formatted
        const models = process.env.OPENROUTER_MODELS_TO_USE?.split(',').map(m => m.trim()) || [];
        expect(models.length).toBeGreaterThan(0);
        models.forEach(model => {
            expect(model).toBeTruthy();
            expect(typeof model).toBe('string');
        });
    });
    it('should load dotenv configuration correctly', () => {
        expect(dotenv).toBeDefined();
        expect(process.env).toBeDefined();
    });
    it('should have proper test environment setup', () => {
        expect(process.env.NODE_ENV).toBe('test');
    });
});
//# sourceMappingURL=simple.test.js.map