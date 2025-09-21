import * as path from 'path';
import * as fs from 'fs';
import {
  VectorDB,
  VectorDBOptions,
  VectorQueryOptions,
  VectorRecord,
  VectorListOptions
} from './vectorDB';

export interface MemoryOrchestratorOptions extends Partial<VectorDBOptions> {
  graphDegree: number;
  lineageDepth: number;
}

export interface MemorySearchResult extends VectorRecord {
  similarity: number;
  neighbors: GraphEdge[];
}

export interface GraphEdge {
  target: string;
  weight: number;
  type: 'similarity' | 'manual';
  timestamp: number;
}

export interface LineageEdge extends GraphEdge {
  source: string;
}

export interface LineageTrace {
  root: VectorRecord | null;
  nodes: VectorRecord[];
  edges: LineageEdge[];
}

export class MemoryOrchestrator {
  private vectorDB: VectorDB;
  private graph: Map<string, GraphEdge[]> = new Map();
  private graphPath: string;
  private options: { graphDegree: number; lineageDepth: number };

  constructor(storagePath: string, options?: Partial<MemoryOrchestratorOptions>) {
    const vectorOptions: Partial<VectorDBOptions> = {};
    if (typeof options?.hotRetentionDays === 'number') {
      vectorOptions.hotRetentionDays = options.hotRetentionDays;
    }
    if (typeof options?.coldRetentionDays === 'number') {
      vectorOptions.coldRetentionDays = options.coldRetentionDays;
    }
    if (options?.partitionGranularity) {
      vectorOptions.partitionGranularity = options.partitionGranularity;
    }

    this.vectorDB = new VectorDB(storagePath, vectorOptions);
    this.graphPath = path.join(storagePath, 'vectordb', 'memory_graph.json');
    this.options = {
      graphDegree: options?.graphDegree ?? 5,
      lineageDepth: options?.lineageDepth ?? 3
    };
  }

  async init(): Promise<void> {
    await this.vectorDB.init();
    await this.loadGraph();
    await this.pruneGraph();
  }

  async addDocument(id: string, content: string, metadata: Record<string, any> = {}): Promise<void> {
    const embedding = await this.getEmbedding(content);
    await this.addEmbedding(id, embedding, { ...metadata, content });
  }

  async addEmbedding(
    id: string,
    vector: number[],
    metadata: Record<string, any> = {}
  ): Promise<void> {
    const timestamp = this.resolveTimestamp(metadata.timestamp);
    await this.vectorDB.addEmbedding(id, vector, {
      ...metadata,
      timestamp: new Date(timestamp).toISOString()
    }, timestamp);
    await this.pruneGraph();
    await this.updateSimilarityEdges(id, vector);
  }

  async getEmbedding(text: string): Promise<number[]> {
    return this.vectorDB.getEmbedding(text);
  }

  async getBatchEmbeddings(texts: string[]): Promise<number[][]> {
    return this.vectorDB.getBatchEmbeddings(texts);
  }

  async queryEmbedding(
    vector: number[],
    options?: number | VectorQueryOptions
  ): Promise<MemorySearchResult[]> {
    const results = await this.vectorDB.queryEmbedding(vector, options);
    return results.map(result => ({
      ...result,
      neighbors: this.graph.get(result.id) ?? []
    }));
  }

  async queryByText(
    text: string,
    options?: number | VectorQueryOptions
  ): Promise<MemorySearchResult[]> {
    const embedding = await this.getEmbedding(text);
    return this.queryEmbedding(embedding, options);
  }

  async getTemporalSlice(
    start: number | Date,
    end: number | Date,
    options: VectorListOptions = {}
  ): Promise<VectorRecord[]> {
    const startTime = typeof start === 'number' ? start : start.getTime();
    const endTime = typeof end === 'number' ? end : end.getTime();
    return this.vectorDB.listItems({
      ...options,
      startTime,
      endTime
    });
  }

  async traceLineage(id: string, depth = this.options.lineageDepth): Promise<LineageTrace> {
    const visited = new Set<string>([id]);
    const queue: Array<{ id: string; depth: number }> = [{ id, depth: 0 }];
    const edges: LineageEdge[] = [];

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (current.depth >= depth) {
        continue;
      }

      const neighbors = this.graph.get(current.id) ?? [];
      for (const edge of neighbors) {
        edges.push({ ...edge, source: current.id });
        if (!visited.has(edge.target)) {
          visited.add(edge.target);
          queue.push({ id: edge.target, depth: current.depth + 1 });
        }
      }
    }

    const nodes: VectorRecord[] = [];
    for (const nodeId of visited) {
      const record = this.vectorDB.getItem(nodeId);
      if (record) {
        nodes.push(record);
      }
    }

    const root = this.vectorDB.getItem(id) ?? null;
    return { root, nodes, edges };
  }

  getMemory(id: string): VectorRecord | undefined {
    return this.vectorDB.getItem(id);
  }

  listMemories(options: VectorListOptions = {}): VectorRecord[] {
    return this.vectorDB.listItems(options);
  }

  async registerRelationship(
    sourceId: string,
    targetId: string,
    weight: number,
    type: 'similarity' | 'manual' = 'manual'
  ): Promise<void> {
    const timestamp = Date.now();
    this.upsertEdge(sourceId, {
      target: targetId,
      weight,
      type,
      timestamp
    });
    this.upsertEdge(targetId, {
      target: sourceId,
      weight,
      type,
      timestamp
    });
    await this.persistGraph();
  }

  async close(): Promise<void> {
    await this.persistGraph();
    this.vectorDB.close();
  }

  private resolveTimestamp(timestamp: any): number {
    if (typeof timestamp === 'number') {
      return timestamp;
    }
    if (typeof timestamp === 'string') {
      const parsed = Date.parse(timestamp);
      if (!Number.isNaN(parsed)) {
        return parsed;
      }
    }
    return Date.now();
  }

  private async updateSimilarityEdges(id: string, vector: number[]): Promise<void> {
    const neighbors = await this.vectorDB.queryEmbedding(vector, {
      topK: this.options.graphDegree + 1,
      includeCold: true
    });

    const similarityEdges = neighbors
      .filter(neighbor => neighbor.id !== id)
      .slice(0, this.options.graphDegree)
      .map(neighbor => ({
        target: neighbor.id,
        weight: neighbor.similarity,
        type: 'similarity' as const,
        timestamp: Date.now()
      }));

    const currentEdges = this.graph.get(id) ?? [];
    const manualEdges = currentEdges.filter(edge => edge.type !== 'similarity');
    this.graph.set(id, [...manualEdges, ...similarityEdges]);

    for (const edge of similarityEdges) {
      const reciprocalEdges = this.graph.get(edge.target) ?? [];
      const preserved = reciprocalEdges.filter(existing => existing.type !== 'similarity');
      const reciprocal = {
        target: id,
        weight: edge.weight,
        type: 'similarity' as const,
        timestamp: edge.timestamp
      };
      this.graph.set(edge.target, [...preserved, reciprocal]);
    }

    await this.persistGraph();
  }

  private upsertEdge(source: string, edge: GraphEdge) {
    const edges = this.graph.get(source) ?? [];
    const existingIndex = edges.findIndex(existing => existing.target === edge.target && existing.type === edge.type);
    if (existingIndex >= 0) {
      edges[existingIndex] = edge;
    } else {
      edges.push(edge);
    }
    this.graph.set(source, edges);
  }

  private async pruneGraph() {
    const activeIds = new Set(this.vectorDB.getAllIds());
    let dirty = false;

    for (const [nodeId, edges] of Array.from(this.graph.entries())) {
      if (!activeIds.has(nodeId)) {
        this.graph.delete(nodeId);
        dirty = true;
        continue;
      }

      const filteredEdges = edges.filter(edge => activeIds.has(edge.target));
      if (filteredEdges.length !== edges.length) {
        this.graph.set(nodeId, filteredEdges);
        dirty = true;
      }
    }

    if (dirty) {
      await this.persistGraph();
    }
  }

  private async loadGraph() {
    try {
      if (!fs.existsSync(this.graphPath)) {
        return;
      }
      const raw = await fs.promises.readFile(this.graphPath, 'utf8');
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') {
        return;
      }
      for (const [nodeId, edges] of Object.entries(parsed as Record<string, GraphEdge[]>)) {
        if (Array.isArray(edges)) {
          this.graph.set(
            nodeId,
            edges
              .filter(edge => edge && typeof edge.target === 'string')
              .map(edge => ({
                target: edge.target,
                weight: edge.weight ?? 0,
                type: edge.type === 'manual' ? 'manual' : 'similarity',
                timestamp: edge.timestamp ?? Date.now()
              }))
          );
        }
      }
    } catch (error) {
      console.warn('Failed to load memory graph:', error);
    }
  }

  private async persistGraph() {
    try {
      const directory = path.dirname(this.graphPath);
      if (!fs.existsSync(directory)) {
        fs.mkdirSync(directory, { recursive: true });
      }
      const serialized: Record<string, GraphEdge[]> = {};
      for (const [nodeId, edges] of this.graph.entries()) {
        serialized[nodeId] = edges;
      }
      await fs.promises.writeFile(this.graphPath, JSON.stringify(serialized, null, 2), 'utf8');
    } catch (error) {
      console.error('Failed to persist memory graph:', error);
    }
  }
}
