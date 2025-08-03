import * as vscode from 'vscode';
import axios from 'axios';

interface LLMConfig {
  provider: 'OpenAI' | 'Anthropic' | 'xAI' | 'OpenRouter';
  key: string;
  model: string;
  role: 'primary' | 'secondary';
}

export class LLMManager {
  private panel: LLMConfig[] = [];

  constructor() {
    this.panel = vscode.workspace.getConfiguration('astraforge').get('llmPanel', []);
  }

  async queryLLM(index: number, prompt: string): Promise<string> {
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
    } catch (error: any) {
      vscode.window.showErrorMessage(`LLM query failed: ${error.message}. Falling back...`);
      // Fallback to primary or another
      if (index !== 0) {
        return this.queryLLM(0, prompt);
      }
      return `Error: ${error.message}`;
    }
  }

  private async queryOpenAI(config: LLMConfig, prompt: string): Promise<string> {
    const response = await axios.post('https://api.openai.com/v1/chat/completions', {
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

  private async queryAnthropic(config: LLMConfig, prompt: string): Promise<string> {
    const response = await axios.post('https://api.anthropic.com/v1/messages', {
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

  private async queryXAI(config: LLMConfig, prompt: string): Promise<string> {
    const response = await axios.post('https://api.x.ai/v1/chat/completions', {
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

  private async queryOpenRouter(config: LLMConfig, prompt: string): Promise<string> {
    const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
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

  async voteOnDecision(prompt: string, options: string[]): Promise<string> {
    const votes: Map<string, number> = new Map(options.map(opt => [opt, 0]));
    const responses = await Promise.all(this.panel.map((_, i) => this.queryLLM(i, `${prompt} Vote on: ${options.join(', ')}`)));
    
    responses.forEach(resp => {
      const voted = options.find(opt => resp.includes(opt));
      if (voted) votes.set(voted, (votes.get(voted) || 0) + 1);
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
  async conference(prompt: string): Promise<string> {
    let discussion = prompt;
    for (let i = 0; i < this.panel.length; i++) {
      const response = await this.queryLLM(i, discussion);
      discussion += `\n\nLLM ${i+1} (${this.panel[i]?.role || 'unknown'}): ${response}`;
    }
    return discussion;
  }
}