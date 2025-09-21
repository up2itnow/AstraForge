import * as path from 'path';
import * as fs from 'fs';
import { HfInference } from '@huggingface/inference';

export interface VectorRecord {
  id: string;
  vector: number[];
  metadata: Record<string, any>;
  timestamp: number;
  tier: 'hot' | 'cold';
  partition: string;
}

export interface VectorQueryOptions {
  topK?: number;
  includeCold?: boolean;
  startTime?: number;
  endTime?: number;
}

export interface VectorListOptions {
  includeCold?: boolean;
  startTime?: number;
  endTime?: number;
}

export interface VectorDBOptions {
  hotRetentionDays: number;
  coldRetentionDays: number;
  partitionGranularity: 'day' | 'hour';
}

interface PartitionState {
  key: string;
  items: VectorRecord[];
}

export class VectorDB {
  private storagePath: string;
  private partitionsPath: string;
  private hf: HfInference;
  private embeddingModel = 'sentence-transformers/all-MiniLM-L6-v2';
  private partitions: Map<string, PartitionState> = new Map();
  private itemIndex: Map<string, VectorRecord> = new Map();
  private options: VectorDBOptions;
  private hotRetentionMs: number;
  private coldRetentionMs: number;

  constructor(storagePath: string, options?: Partial<VectorDBOptions>) {
    this.storagePath = path.join(storagePath, 'vectordb');
    this.partitionsPath = path.join(this.storagePath, 'partitions');

    const defaultOptions: VectorDBOptions = {
      hotRetentionDays: 7,
      coldRetentionDays: 90,
      partitionGranularity: 'day'
    };

    this.options = { ...defaultOptions, ...(options || {}) };
    this.hotRetentionMs = this.options.hotRetentionDays * 24 * 60 * 60 * 1000;
    this.coldRetentionMs = this.options.coldRetentionDays * 24 * 60 * 60 * 1000;

    this.hf = new HfInference(process.env.HUGGINGFACE_API_TOKEN);
  }

  async init() {
    if (!fs.existsSync(this.storagePath)) {
      fs.mkdirSync(this.storagePath, { recursive: true });
    }

    if (!fs.existsSync(this.partitionsPath)) {
      fs.mkdirSync(this.partitionsPath, { recursive: true });
    }

    await this.loadLegacyStore();
    await this.loadPartitions();
    await this.enforceRetention();
  }

  async addEmbedding(
    id: string,
    vector: number[],
    metadata: Record<string, any> = {},
    explicitTimestamp?: number
  ) {
    const timestamp = this.resolveTimestamp(metadata, explicitTimestamp);
    const partitionKey = this.getPartitionKey(timestamp);
    const normalizedMetadata = {
      ...metadata,
      timestamp: metadata.timestamp || new Date(timestamp).toISOString()
    };
    const tier = this.isHot(timestamp) ? 'hot' : 'cold';

    const record: VectorRecord = {
      id,
      vector,
      metadata: normalizedMetadata,
      timestamp,
      partition: partitionKey,
      tier
    };

    const partition = this.getOrCreatePartition(partitionKey);
    const existingIndex = partition.items.findIndex(item => item.id === id);
    if (existingIndex >= 0) {
      partition.items[existingIndex] = record;
    } else {
      partition.items.push(record);
    }
    this.itemIndex.set(id, record);

    await this.savePartition(partitionKey);
    await this.enforceRetention();
  }

  async queryEmbedding(
    vector: number[],
    optionsOrTopK?: number | VectorQueryOptions
  ): Promise<(VectorRecord & { similarity: number })[]> {
    const options: VectorQueryOptions =
      typeof optionsOrTopK === 'number'
        ? { topK: optionsOrTopK }
        : optionsOrTopK || {};

    const topK = options.topK ?? 5;
    const includeCold = options.includeCold ?? true;
    const startTime = options.startTime;
    const endTime = options.endTime;

    const candidates = Array.from(this.partitions.values()).flatMap(partition =>
      partition.items
    );

    const filtered = candidates.filter(record => {
      if (!includeCold && record.tier === 'cold') return false;
      if (startTime && record.timestamp < startTime) return false;
      if (endTime && record.timestamp > endTime) return false;
      return true;
    });

    const similarities = filtered
      .map(record => ({
        record,
        similarity: this.cosineSimilarity(vector, record.vector)
      }))
      .filter(entry => Number.isFinite(entry.similarity));

    similarities.sort((a, b) => b.similarity - a.similarity);

    return similarities.slice(0, topK).map(({ record, similarity }) => ({
      ...record,
      similarity
    }));
  }

  listItems(options: VectorListOptions = {}): VectorRecord[] {
    const includeCold = options.includeCold ?? true;
    const startTime = options.startTime;
    const endTime = options.endTime;

    return Array.from(this.partitions.values())
      .flatMap(partition => partition.items)
      .filter(record => {
        if (!includeCold && record.tier === 'cold') return false;
        if (startTime && record.timestamp < startTime) return false;
        if (endTime && record.timestamp > endTime) return false;
        return true;
      });
  }

  getItem(id: string): VectorRecord | undefined {
    return this.itemIndex.get(id);
  }

  getAllIds(): string[] {
    return Array.from(this.itemIndex.keys());
  }

  close() {
    // Placeholder for future resource cleanup
  }

  async getEmbedding(text: string): Promise<number[]> {
    try {
      const cleanText = text.replace(/\s+/g, ' ').trim();

      if (!cleanText) {
        console.warn('Empty text provided for embedding, using fallback');
        return this.getFallbackEmbedding(text);
      }

      const response = await this.hf.featureExtraction({
        model: this.embeddingModel,
        inputs: cleanText
      });

      let embedding: number[];
      if (Array.isArray(response)) {
        if (Array.isArray(response[0])) {
          embedding = response[0] as number[];
        } else {
          embedding = response as number[];
        }
      } else {
        throw new Error('Unexpected response format from embedding API');
      }

      if (!embedding || embedding.length === 0) {
        console.warn('Invalid embedding received, using fallback');
        return this.getFallbackEmbedding(text);
      }

      console.log(
        `Generated embedding for "${cleanText.substring(0, 50)}..." (${embedding.length} dimensions)`
      );
      return embedding;
    } catch (error: any) {
      console.warn(`Embedding API failed: ${error.message}, using fallback`);
      return this.getFallbackEmbedding(text);
    }
  }

  async getBatchEmbeddings(texts: string[]): Promise<number[][]> {
    const embeddings: number[][] = [];
    const batchSize = 5;

    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      const batchPromises = batch.map(text => this.getEmbedding(text));

      try {
        const batchResults = await Promise.all(batchPromises);
        embeddings.push(...batchResults);

        if (i + batchSize < texts.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      } catch (error: any) {
        console.warn(`Batch embedding failed: ${error.message}`);
        for (const text of batch) {
          embeddings.push(this.getFallbackEmbedding(text));
        }
      }
    }

    return embeddings;
  }

  async addDocument(id: string, content: string, metadata: any = {}): Promise<void> {
    try {
      const embedding = await this.getEmbedding(content);
      await this.addEmbedding(id, embedding, {
        content,
        ...metadata,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error(`Failed to add document ${id}:`, error);
      throw error;
    }
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length || a.length === 0) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    if (normA === 0 || normB === 0) return 0;

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  private getFallbackEmbedding(text: string): number[] {
    console.log('Using fallback embedding generation');
    const hash = this.simpleHash(text);
    const embedding = new Array(384).fill(0);

    for (let i = 0; i < embedding.length; i++) {
      embedding[i] = Math.sin((hash + i) * 0.1) * Math.cos((hash + i) * 0.2);
    }

    return embedding;
  }

  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  private getOrCreatePartition(key: string): PartitionState {
    const existing = this.partitions.get(key);
    if (existing) {
      return existing;
    }

    const state: PartitionState = { key, items: [] };
    this.partitions.set(key, state);
    return state;
  }

  private async savePartition(key: string) {
    const partition = this.partitions.get(key);
    if (!partition) return;

    const filePath = path.join(this.partitionsPath, `${key}.json`);
    try {
      await fs.promises.writeFile(
        filePath,
        JSON.stringify(partition.items, null, 2),
        'utf8'
      );
    } catch (error) {
      console.error(`Failed to save partition ${key}:`, error);
    }
  }

  private async loadPartitions() {
    const files = await fs.promises.readdir(this.partitionsPath);
    for (const file of files) {
      if (!file.endsWith('.json')) continue;
      const key = path.basename(file, '.json');
      const filePath = path.join(this.partitionsPath, file);
      try {
        const raw = await fs.promises.readFile(filePath, 'utf8');
        const items = JSON.parse(raw);
        if (Array.isArray(items)) {
          const normalizedItems = items
            .map((item: any) => this.normalizeRecord(key, item))
            .filter(Boolean) as VectorRecord[];
          this.partitions.set(key, { key, items: normalizedItems });
          for (const record of normalizedItems) {
            this.itemIndex.set(record.id, record);
          }
        }
      } catch (error) {
        console.warn(`Failed to load partition ${file}:`, error);
      }
    }
  }

  private async loadLegacyStore() {
    const legacyPath = path.join(this.storagePath, 'vectors.json');
    if (!fs.existsSync(legacyPath)) {
      return;
    }

    try {
      const raw = await fs.promises.readFile(legacyPath, 'utf8');
      const items = JSON.parse(raw);
      if (!Array.isArray(items)) {
        return;
      }

      for (const item of items) {
        const record = this.normalizeRecord(this.getPartitionKey(Date.now()), item);
        if (record) {
          await this.addEmbedding(record.id, record.vector, record.metadata, record.timestamp);
        }
      }

      await fs.promises.unlink(legacyPath);
    } catch (error) {
      console.warn('Failed to migrate legacy vector store:', error);
    }
  }

  private normalizeRecord(partitionKey: string, item: any): VectorRecord | null {
    if (!item || !item.id || !Array.isArray(item.vector)) {
      return null;
    }

    const timestamp = this.resolveTimestamp(item.metadata || {}, item.timestamp);
    const tier = this.isHot(timestamp) ? 'hot' : 'cold';
    const metadata = {
      ...(item.metadata || {}),
      timestamp: (item.metadata && item.metadata.timestamp) || new Date(timestamp).toISOString()
    };

    return {
      id: item.id,
      vector: item.vector,
      metadata,
      timestamp,
      tier,
      partition: partitionKey
    };
  }

  private resolveTimestamp(metadata: Record<string, any>, fallback?: number): number {
    if (typeof fallback === 'number') {
      return fallback;
    }

    const metaTimestamp = metadata.timestamp;
    if (typeof metaTimestamp === 'number') {
      return metaTimestamp;
    }
    if (typeof metaTimestamp === 'string') {
      const parsed = Date.parse(metaTimestamp);
      if (!Number.isNaN(parsed)) {
        return parsed;
      }
    }
    return Date.now();
  }

  private getPartitionKey(timestamp: number): string {
    const date = new Date(timestamp);
    if (this.options.partitionGranularity === 'hour') {
      return `${date.getUTCFullYear()}-${this.pad(date.getUTCMonth() + 1)}-${this.pad(date.getUTCDate())}T${this.pad(date.getUTCHours())}`;
    }
    return `${date.getUTCFullYear()}-${this.pad(date.getUTCMonth() + 1)}-${this.pad(date.getUTCDate())}`;
  }

  private getPartitionTimestamp(key: string): number {
    if (key.includes('T')) {
      const [datePart, hourPart] = key.split('T');
      const [year, month, day] = datePart.split('-').map(num => parseInt(num, 10));
      const hour = parseInt(hourPart, 10) || 0;
      return Date.UTC(year, month - 1, day, hour);
    }

    const [year, month, day] = key.split('-').map(num => parseInt(num, 10));
    return Date.UTC(year, month - 1, day);
  }

  private pad(value: number): string {
    return value < 10 ? `0${value}` : `${value}`;
  }

  private isHot(timestamp: number): boolean {
    return timestamp >= Date.now() - this.hotRetentionMs;
  }

  private async enforceRetention() {
    const now = Date.now();
    const coldThreshold = now - this.coldRetentionMs;
    const hotThreshold = now - this.hotRetentionMs;

    for (const [key, partition] of this.partitions) {
      const partitionTimestamp = this.getPartitionTimestamp(key);

      if (partitionTimestamp < coldThreshold) {
        await this.deletePartition(key);
        continue;
      }

      let updated = false;
      for (const record of partition.items) {
        const tier = record.timestamp >= hotThreshold ? 'hot' : 'cold';
        if (record.tier !== tier) {
          record.tier = tier;
          updated = true;
        }
      }

      if (updated) {
        await this.savePartition(key);
      }
    }
  }

  private async deletePartition(key: string) {
    const partition = this.partitions.get(key);
    if (!partition) return;

    for (const record of partition.items) {
      this.itemIndex.delete(record.id);
    }

    this.partitions.delete(key);

    const filePath = path.join(this.partitionsPath, `${key}.json`);
    try {
      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath);
      }
    } catch (error) {
      console.warn(`Failed to delete partition file ${filePath}:`, error);
    }
  }
}
