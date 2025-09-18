/**
 * Test to verify vscode mock is working correctly
 */
import * as vscode from 'vscode';
import * as dotenv from 'dotenv';
// Load environment variables
dotenv.config();
describe('VSCode Mock Test', () => {
    it('should have vscode mock available', () => {
        expect(vscode).toBeDefined();
        expect(vscode.workspace).toBeDefined();
        expect(vscode.workspace.getConfiguration).toBeDefined();
    });
    it('should return configuration from mock', () => {
        const config = vscode.workspace.getConfiguration('astraforge');
        console.log('Config returned:', config);
        expect(config).toBeDefined();
        expect(config.get).toBeDefined();
        const llmPanel = config.get('llmPanel', []);
        console.log('Mock returned llmPanel:', llmPanel);
        expect(Array.isArray(llmPanel)).toBe(true);
    });
    it('should have environment variables loaded', () => {
        console.log('OPENROUTER_API_KEY:', process.env.OPENROUTER_API_KEY ? 'Present' : 'Missing');
        console.log('OPENROUTER_MODELS_TO_USE:', process.env.OPENROUTER_MODELS_TO_USE);
        expect(process.env.OPENROUTER_API_KEY).toBeDefined();
        expect(process.env.OPENROUTER_MODELS_TO_USE).toBeDefined();
    });
});
//# sourceMappingURL=vscode-mock.test.js.map