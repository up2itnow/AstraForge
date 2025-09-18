/**
 * Debug test for OpenRouter API integration
 */
import * as dotenv from 'dotenv';
import axios from 'axios';
// Load environment variables
dotenv.config();
describe('OpenRouter API Debug', () => {
    it('should debug OpenRouter API call', async () => {
        const apiKey = process.env.OPENROUTER_API_KEY;
        const models = process.env.OPENROUTER_MODELS_TO_USE?.split(',').map(m => m.trim()) || [];
        console.log('API Key present:', !!apiKey);
        console.log('API Key starts with sk-or-v1-:', apiKey?.startsWith('sk-or-v1-'));
        console.log('Models configured:', models);
        // Always show debug info
        expect(apiKey).toBeDefined();
        expect(models.length).toBeGreaterThan(0);
        if (!apiKey || models.length === 0) {
            throw new Error('Missing API key or models configuration');
        }
        try {
            const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
                model: models[0],
                messages: [{ role: 'user', content: 'Hello, please respond with just "Hi"' }],
                max_tokens: 10
            }, {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': 'http://localhost:3000',
                    'X-Title': 'AstraForge IDE Test'
                }
            });
            console.log('Response status:', response.status);
            console.log('Response data:', response.data);
            expect(response.status).toBe(200);
            expect(response.data.choices).toBeDefined();
            expect(response.data.choices[0].message.content).toBeDefined();
        }
        catch (error) {
            console.error('Error details:');
            console.error('Status:', error.response?.status);
            console.error('Status text:', error.response?.statusText);
            console.error('Response data:', error.response?.data);
            console.error('Headers:', error.response?.headers);
            throw error;
        }
    }, 15000);
});
//# sourceMappingURL=debug-openrouter.test.js.map