"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LLMManager = void 0;
const vscode = __importStar(require("vscode"));
const axios_1 = __importDefault(require("axios"));
class LLMManager {
    constructor() {
        this.panel = [];
        this.panel = vscode.workspace.getConfiguration('astraforge').get('llmPanel', []);
    }
    async queryLLM(index, prompt) {
        const config = this.panel[index];
        if (!config) {
            return 'No LLM configured at index ' + index;
        }
        try {
            switch (config.provider) {
                case 'OpenAI':
                    return await this.queryOpenAI(config, prompt);
                case 'Anthropic':
                    return await this.queryAnthropic(config, prompt);
                case 'xAI':
                    return await this.queryXAI(config, prompt);
                case 'OpenRouter':
                    return await this.queryOpenRouter(config, prompt);
                default:
                    throw new Error(`Unsupported provider: ${config.provider}`);
            }
        }
        catch (error) {
            vscode.window.showErrorMessage(`LLM query failed: ${error.message}. Falling back...`);
            // Fallback to primary or another
            if (index !== 0) {
                return this.queryLLM(0, prompt);
            }
            return `Error: ${error.message}`;
        }
    }
    async queryOpenAI(config, prompt) {
        const response = await axios_1.default.post('https://api.openai.com/v1/chat/completions', {
            model: config.model,
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 1000
        }, {
            headers: {
                'Authorization': `Bearer ${config.key}`,
                'Content-Type': 'application/json'
            }
        });
        return response.data.choices[0].message.content;
    }
    async queryAnthropic(config, prompt) {
        const response = await axios_1.default.post('https://api.anthropic.com/v1/messages', {
            model: config.model,
            max_tokens: 1000,
            messages: [{ role: 'user', content: prompt }]
        }, {
            headers: {
                'x-api-key': config.key,
                'Content-Type': 'application/json',
                'anthropic-version': '2023-06-01'
            }
        });
        return response.data.content[0].text;
    }
    async queryXAI(config, prompt) {
        const response = await axios_1.default.post('https://api.x.ai/v1/chat/completions', {
            model: config.model,
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 1000
        }, {
            headers: {
                'Authorization': `Bearer ${config.key}`,
                'Content-Type': 'application/json'
            }
        });
        return response.data.choices[0].message.content;
    }
    async queryOpenRouter(config, prompt) {
        const response = await axios_1.default.post('https://openrouter.ai/api/v1/chat/completions', {
            model: config.model,
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 1000
        }, {
            headers: {
                'Authorization': `Bearer ${config.key}`,
                'Content-Type': 'application/json'
            }
        });
        return response.data.choices[0].message.content;
    }
    async voteOnDecision(prompt, options) {
        if (this.panel.length === 0 || options.length === 0) {
            return options[0] || 'No options provided';
        }
        const votes = new Map(options.map(opt => [opt, 0]));
        // Enhanced voting with better prompt formatting and parallel processing
        const votePrompt = `${prompt}\n\nPlease vote on ONE of these options: ${options.join(', ')}\nRespond with ONLY the option you choose.`;
        const votePromises = this.panel.map(async (_, i) => {
            try {
                const response = await this.queryLLM(i, votePrompt);
                return { response, success: true };
            }
            catch (_error) {
                return { response: options[0], success: false }; // Default to first option on error
            }
        });
        const results = await Promise.all(votePromises);
        // Process votes with fuzzy matching for better accuracy
        results.forEach(result => {
            const response = result.response.toLowerCase().trim();
            const voted = options.find(opt => response.includes(opt.toLowerCase()) ||
                opt.toLowerCase().includes(response) ||
                this.calculateSimilarity(response, opt.toLowerCase()) > 0.7);
            if (voted) {
                votes.set(voted, (votes.get(voted) || 0) + 1);
            }
        });
        // Find majority winner with tie-breaking
        let max = 0;
        let winner = options[0];
        votes.forEach((count, opt) => {
            if (count > max || (count === max && opt === options[0])) {
                max = count;
                winner = opt;
            }
        });
        // Enhanced logging for audit trail
        const voteResults = Array.from(votes.entries()).map(([option, count]) => ({ option, count }));
        console.log(`Vote results for "${prompt.substring(0, 50)}...": ${JSON.stringify(voteResults)}, Winner: ${winner}`);
        return winner;
    }
    // Helper method for fuzzy string matching in voting
    calculateSimilarity(str1, str2) {
        const longer = str1.length > str2.length ? str1 : str2;
        const shorter = str1.length > str2.length ? str2 : str1;
        if (longer.length === 0)
            return 1.0;
        const editDistance = this.levenshteinDistance(longer, shorter);
        return (longer.length - editDistance) / longer.length;
    }
    levenshteinDistance(str1, str2) {
        const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
        for (let i = 0; i <= str1.length; i++)
            matrix[0][i] = i;
        for (let j = 0; j <= str2.length; j++)
            matrix[j][0] = j;
        for (let j = 1; j <= str2.length; j++) {
            for (let i = 1; i <= str1.length; i++) {
                const substitutionCost = str1[i - 1] === str2[j - 1] ? 0 : 1;
                matrix[j][i] = Math.min(matrix[j][i - 1] + 1, // insertion
                matrix[j - 1][i] + 1, // deletion
                matrix[j - 1][i - 1] + substitutionCost // substitution
                );
            }
        }
        return matrix[str2.length][str1.length];
    }
    // Conference: Parallel prompting for discussion with async processing
    async conference(prompt) {
        if (this.panel.length === 0) {
            return `${prompt}\n\nNo LLMs configured for conference.`;
        }
        // Start all LLM queries in parallel for better performance
        const queryPromises = this.panel.map(async (config, i) => {
            try {
                const response = await this.queryLLM(i, prompt);
                return {
                    index: i,
                    role: config.role || 'unknown',
                    response,
                    success: true
                };
            }
            catch (error) {
                return {
                    index: i,
                    role: config.role || 'unknown',
                    response: `Error: ${error.message}`,
                    success: false
                };
            }
        });
        // Wait for all responses and build discussion
        const results = await Promise.all(queryPromises);
        let discussion = prompt;
        // Sort by index to maintain consistent order
        results.sort((a, b) => a.index - b.index);
        for (const result of results) {
            discussion += `\n\nLLM ${result.index + 1} (${result.role}): ${result.response}`;
        }
        return discussion;
    }
}
exports.LLMManager = LLMManager;
//# sourceMappingURL=llmManager.js.map