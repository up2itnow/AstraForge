import * as path from 'path';
import * as fs from 'fs';

interface VectorItem {
  id: string;
  vector: number[];
  metadata: any;
}

export class VectorDB {
  private items: VectorItem[] = [];
  private storagePath: string;

  constructor(storagePath: string) {
    this.storagePath = path.join(storagePath, 'vectordb');
  }

  async init() {
    // Ensure storage directory exists
    if (!fs.existsSync(this.storagePath)) {
      fs.mkdirSync(this.storagePath, { recursive: true });
    }
    
    // Load existing data if available
    const dataPath = path.join(this.storagePath, 'vectors.json');
    if (fs.existsSync(dataPath)) {
      try {
        const data = fs.readFileSync(dataPath, 'utf8');
        this.items = JSON.parse(data);
      } catch (error) {
        console.warn('Failed to load vector database:', error);
        this.items = [];
      }
    }
  }

  async addEmbedding(key: string, vector: number[], metadata: any) {
    const existingIndex = this.items.findIndex(item => item.id === key);
    if (existingIndex >= 0) {
      this.items[existingIndex] = { id: key, vector, metadata };
    } else {
      this.items.push({ id: key, vector, metadata });
    }
    await this.save();
  }

  async queryEmbedding(vector: number[], topK: number = 5): Promise<VectorItem[]> {
    // Simple cosine similarity implementation
    const similarities = this.items.map(item => ({
      item,
      similarity: this.cosineSimilarity(vector, item.vector)
    }));
    
    similarities.sort((a, b) => b.similarity - a.similarity);
    return similarities.slice(0, topK).map(s => s.item);
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  private async save() {
    const dataPath = path.join(this.storagePath, 'vectors.json');
    fs.writeFileSync(dataPath, JSON.stringify(this.items, null, 2));
  }

  close() {
    // Cleanup if needed
  }

  // Helper to get embedding (mock implementation for now)
  async getEmbedding(text: string): Promise<number[]> {
    // Simple hash-based mock embedding for development
    // In production, this would call an actual embedding API
    const hash = this.simpleHash(text);
    const embedding = new Array(384).fill(0); // Common embedding dimension
    
    // Create a deterministic but distributed embedding based on text
    for (let i = 0; i < embedding.length; i++) {
      embedding[i] = Math.sin((hash + i) * 0.1) * Math.cos((hash + i) * 0.2);
    }
    
    return embedding;
  }

  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }
}