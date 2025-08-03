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
        const votes = new Map(options.map(opt => [opt, 0]));
        const responses = await Promise.all(this.panel.map((_, i) => this.queryLLM(i, `${prompt} Vote on: ${options.join(', ')}`)));
        responses.forEach(resp => {
            const voted = options.find(opt => resp.includes(opt));
            if (voted)
                votes.set(voted, (votes.get(voted) || 0) + 1);
        });
        // Find majority winner
        let max = 0;
        let winner = options[0];
        votes.forEach((count, opt) => {
            if (count > max) {
                max = count;
                winner = opt;
            }
        });
        // Log for audit
        console.log(`Vote results: ${JSON.stringify(Array.from(votes))}`);
        return winner;
    }
    // Conference: Sequential prompting for discussion
    async conference(prompt) {
        let discussion = prompt;
        for (let i = 0; i < this.panel.length; i++) {
            const response = await this.queryLLM(i, discussion);
            discussion += `\n\nLLM ${i + 1} (${this.panel[i]?.role || 'unknown'}): ${response}`;
        }
        return discussion;
    }
}
exports.LLMManager = LLMManager;
//# sourceMappingURL=llmManager.js.map