/**
 * Debug test for environment variables
 */
import * as dotenv from 'dotenv';
// Load environment variables
const result = dotenv.config();
describe('Environment Debug', () => {
    it('should load environment variables', () => {
        console.log('dotenv.config() result:', result);
        console.log('NODE_ENV:', process.env.NODE_ENV);
        console.log('OPENROUTER_API_KEY present:', !!process.env.OPENROUTER_API_KEY);
        console.log('OPENROUTER_MODELS_TO_USE present:', !!process.env.OPENROUTER_MODELS_TO_USE);
        if (process.env.OPENROUTER_API_KEY) {
            console.log('API key length:', process.env.OPENROUTER_API_KEY.length);
            console.log('API key starts with sk-or-v1-:', process.env.OPENROUTER_API_KEY.startsWith('sk-or-v1-'));
        }
        if (process.env.OPENROUTER_MODELS_TO_USE) {
            console.log('Models:', process.env.OPENROUTER_MODELS_TO_USE);
        }
        expect(process.env.OPENROUTER_API_KEY).toBeDefined();
        expect(process.env.OPENROUTER_MODELS_TO_USE).toBeDefined();
    });
});
//# sourceMappingURL=env-debug.test.js.map