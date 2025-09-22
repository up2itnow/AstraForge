import * as path from 'path';
import * as fs from 'fs';
import { HfInference } from '@huggingface/inference';
import { EmergentBehaviorSystem } from '../emergent-behavior';
import { logger } from '../utils/logger';

interface VectorMetadata {
  type?: string;
  sessionId?: string;
  qualityScore?: number;
  consensusLevel?: string;
  participants?: string[];
  timestamp?: string;
  domain?: string;
  [key: string]: unknown;
}

interface VectorItem {
  id: string;
  vector: number[];
  metadata: VectorMetadata;
  behaviorInsights?: {
    associatedBehaviors: string[];
    behaviorPatterns: string[];
    emergenceScore: number;
    innovationIndex: number;
    complexityIndex: number;
    adaptationPotential: number;
  };
  contextualTags?: string[];
  semanticClusters?: string[];
  temporalMetadata?: {
    createdAt: Date;
    lastAccessed: Date;
    accessCount: number;
    relevanceScore: number;
  };
}

export class VectorDB {
  private items: VectorItem[] = [];
  private storagePath: string;
  private hf: HfInference;
  private embeddingModel = 'sentence-transformers/all-MiniLM-L6-v2';
  private emergentBehaviorSystem?: EmergentBehaviorSystem;
  private semanticIndex: Map<string, Set<string>> = new Map(); // For fast pattern lookup
  private behaviorIndex: Map<string, Set<string>> = new Map(); // Behavior to vectors mapping

  constructor(storagePath: string, emergentBehaviorSystem?: EmergentBehaviorSystem) {
    this.storagePath = path.join(storagePath, 'vectordb');
    // Initialize Hugging Face inference - will use public API or user's token if set
    this.hf = new HfInference(process.env.HUGGINGFACE_API_TOKEN);
    this.emergentBehaviorSystem = emergentBehaviorSystem;
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
        logger.warn('Failed to load vector database:', error);
        this.items = [];
      }
    }
  }

  async addEmbedding(key: string, vector: number[], metadata: any) {
    const existingIndex = this.items.findIndex(item => item.id === key);
    if (existingIndex >= 0) {
      this.items[existingIndex] = {
        id: key,
        vector,
        metadata,
        contextualTags: this.items[existingIndex].contextualTags,
        semanticClusters: this.items[existingIndex].semanticClusters,
        temporalMetadata: this.items[existingIndex].temporalMetadata
      };
    } else {
      this.items.push({
        id: key,
        vector,
        metadata,
        contextualTags: [],
        semanticClusters: [],
        temporalMetadata: {
          createdAt: new Date(),
          lastAccessed: new Date(),
          accessCount: 0,
          relevanceScore: 0.5
        }
      });
    }
    await this.save();
  }

  async queryEmbedding(
    vector: number[],
    topK: number = 5
  ): Promise<(VectorItem & { similarity: number })[]> {
    // Simple cosine similarity implementation
    const similarities = this.items.map(item => ({
      item,
      similarity: this.cosineSimilarity(vector, item.vector),
    }));

    similarities.sort((a, b) => b.similarity - a.similarity);
    return similarities.slice(0, topK).map(s => ({ ...s.item, similarity: s.similarity }));
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

  async save() {
    const dataPath = path.join(this.storagePath, 'vectors.json');
    fs.writeFileSync(dataPath, JSON.stringify(this.items, null, 2));
  }

  close() {
    // Cleanup if needed
  }

  // Real embedding implementation using Hugging Face
  async getEmbedding(text: string): Promise<number[]> {
    try {
      // Clean and prepare text for embedding
      const cleanText = text.replace(/\s+/g, ' ').trim();

      if (!cleanText) {
        console.warn('Empty text provided for embedding, using fallback');
        return this.getFallbackEmbedding(text);
      }

      // Use Hugging Face inference for real embeddings
      const response = await this.hf.featureExtraction({
        model: this.embeddingModel,
        inputs: cleanText,
      });

      // Handle different response formats
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

      // Validate embedding
      if (!embedding || embedding.length === 0) {
        console.warn('Invalid embedding received, using fallback');
        return this.getFallbackEmbedding(text);
      }

      // Log embedding generation (debug level)
      return embedding;
    } catch (error: any) {
      console.warn(`Embedding API failed: ${error.message}, using fallback`);
      return this.getFallbackEmbedding(text);
    }
  }

  // Fallback embedding for when API is unavailable
  private getFallbackEmbedding(text: string): number[] {
    // Using fallback embedding generation
    const hash = this.simpleHash(text);
    const embedding = new Array(384).fill(0); // Standard embedding dimension

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
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  // Batch embedding for efficiency
  async getBatchEmbeddings(texts: string[]): Promise<number[][]> {
    const embeddings: number[][] = [];

    // Process in batches to avoid rate limits
    const batchSize = 5;
    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      const batchPromises = batch.map(text => this.getEmbedding(text));

      try {
        const batchResults = await Promise.all(batchPromises);
        embeddings.push(...batchResults);

        // Small delay to respect rate limits
        if (i + batchSize < texts.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      } catch (error: any) {
        console.warn(`Batch embedding failed: ${error.message}`);
        // Add fallback embeddings for failed batch
        for (const text of batch) {
          embeddings.push(this.getFallbackEmbedding(text));
        }
      }
    }

    return embeddings;
  }

  // Alias for addEmbedding to maintain compatibility
  async addDocument(key: string, content: string, metadata: any): Promise<void> {
    const embedding = await this.getEmbedding(content);
    await this.addEmbedding(key, embedding, metadata);
  }

  /**
   * Enhanced document addition with emergent behavior insights
   */
  async addDocumentWithBehaviorInsights(
    key: string,
    content: string,
    metadata: any,
    behaviorContext?: {
      associatedBehaviors?: string[];
      contextualTags?: string[];
      semanticClusters?: string[];
    }
  ): Promise<void> {
    const embedding = await this.getEmbedding(content);

    // Analyze content for emergent behavior insights
    const behaviorInsights = await this.extractBehaviorInsights(content, behaviorContext);
    const contextualTags = behaviorContext?.contextualTags || this.extractContextualTags(content);
    const semanticClusters = behaviorContext?.semanticClusters || this.identifySemanticClusters(content);

    const enhancedItem: VectorItem = {
      id: key,
      vector: embedding,
      metadata,
      behaviorInsights,
      contextualTags,
      semanticClusters,
      temporalMetadata: {
        createdAt: new Date(),
        lastAccessed: new Date(),
        accessCount: 0,
        relevanceScore: this.calculateInitialRelevance(behaviorInsights, contextualTags)
      }
    };

    // Add to main storage
    const existingIndex = this.items.findIndex(item => item.id === key);
    if (existingIndex >= 0) {
      this.items[existingIndex] = enhancedItem;
    } else {
      this.items.push(enhancedItem);
    }

    // Update indexes
    await this.updateIndexes(enhancedItem);

    await this.save();
  }

  /**
   * Enhanced query with behavior-aware similarity
   */
  async queryWithBehaviorInsights(
    query: string,
    options: {
      topK?: number;
      behaviorFilter?: {
        behaviorType?: string[];
        minInnovationIndex?: number;
        maxComplexityIndex?: number;
        requiredTags?: string[];
      };
      contextFilter?: {
        semanticClusters?: string[];
        contextualTags?: string[];
        timeRange?: { start: Date; end: Date };
      };
      hybridSearch?: {
        semanticWeight?: number;
        behaviorWeight?: number;
        temporalWeight?: number;
      };
    } = {}
  ): Promise<(VectorItem & { similarity: number; behaviorScore: number; hybridScore: number })[]> {
    const {
      topK = 5,
      behaviorFilter,
      contextFilter,
      hybridSearch = { semanticWeight: 0.7, behaviorWeight: 0.2, temporalWeight: 0.1 }
    } = options;

    const _queryEmbedding = await this.getEmbedding(query);

    // Calculate base semantic similarities
    const baseResults = await this.queryEmbedding(_queryEmbedding, topK * 2); // Get more for filtering

    // Enhance with behavior insights
    const enhancedResults = await Promise.all(
      baseResults.map(async (result) => {
        const behaviorScore = this.calculateBehaviorScore(query, result, behaviorFilter);
        const temporalScore = this.calculateTemporalScore(result, contextFilter?.timeRange);
        const semanticScore = result.similarity;

        // Calculate hybrid score
        const semanticWeight = hybridSearch.semanticWeight || 0.7;
        const behaviorWeight = hybridSearch.behaviorWeight || 0.2;
        const temporalWeight = hybridSearch.temporalWeight || 0.1;
        const hybridScore = (
          semanticScore * semanticWeight +
          behaviorScore * behaviorWeight +
          temporalScore * temporalWeight
        );

        return {
          ...result,
          similarity: semanticScore,
          behaviorScore,
          hybridScore,
          temporalScore
        };
      })
    );

    // Apply filters
    let filteredResults = enhancedResults;

    if (behaviorFilter) {
      filteredResults = filteredResults.filter(result =>
        this.matchesBehaviorFilter(result, behaviorFilter)
      );
    }

    if (contextFilter) {
      filteredResults = filteredResults.filter(result =>
        this.matchesContextFilter(result, contextFilter)
      );
    }

    // Sort by hybrid score and return top K
    filteredResults.sort((a, b) => b.hybridScore - a.hybridScore);
    return filteredResults.slice(0, topK);
  }

  /**
   * Get contextually relevant documents with emergent behavior insights
   */
  async getContextualInsights(
    query: string,
    context: {
      domain?: string;
      complexity?: number;
      requiredInnovation?: boolean;
      behaviorPatterns?: string[];
    }
  ): Promise<{
    documents: VectorItem[];
    insights: {
      dominantBehaviorType: string;
      averageInnovationIndex: number;
      complexityDistribution: Record<string, number>;
      recommendedPatterns: string[];
      emergentOpportunities: string[];
    };
  }> {
    const _queryEmbedding = await this.getEmbedding(query);

    // Query with behavior-aware similarity
    const results = await this.queryWithBehaviorInsights(query, {
      topK: 10,
      behaviorFilter: {
        minInnovationIndex: context.requiredInnovation ? 0.7 : 0,
        behaviorType: context.behaviorPatterns ?
          this.mapPatternsToBehaviorTypes(context.behaviorPatterns) : undefined
      }
    });

    // Analyze results for insights
    const insights = this.analyzeContextualInsights(results, context);

    return {
      documents: results.map(r => (r as any).item || r),
      insights
    };
  }

  /**
   * Find similar contexts based on behavior patterns
   */
  async findSimilarContexts(
    behaviorPattern: string,
    options: {
      maxComplexity?: number;
      domainFilter?: string[];
      minSuccessRate?: number;
    } = {}
  ): Promise<VectorItem[]> {
    const relevantVectors = this.behaviorIndex.get(behaviorPattern) || new Set();
    const candidates = this.items.filter(item =>
      relevantVectors.has(item.id)
    );

    return candidates.filter(item => this.matchesFilters(item, options));
  }

  /**
   * Update relevance scores based on access patterns and emergent behavior
   */
  async updateRelevanceScores(): Promise<void> {
    const now = new Date();

    for (const item of this.items) {
      if (!item.temporalMetadata) continue;

      const _timeSinceCreation = now.getTime() - item.temporalMetadata.createdAt.getTime();
      const timeSinceAccess = now.getTime() - item.temporalMetadata.lastAccessed.getTime();

      // Base relevance from temporal factors
      let relevanceScore = Math.exp(-timeSinceAccess / (30 * 24 * 60 * 60 * 1000)); // Decay over 30 days

      // Boost relevance based on behavior insights
      if (item.behaviorInsights) {
        const behaviorBoost = item.behaviorInsights.emergenceScore * 0.3;
        const innovationBoost = item.behaviorInsights.innovationIndex * 0.2;
        relevanceScore += behaviorBoost + innovationBoost;
      }

      // Boost based on access patterns (logarithmic growth)
      const accessBoost = Math.log(item.temporalMetadata.accessCount + 1) * 0.1;
      relevanceScore += accessBoost;

      // Boost based on contextual tag popularity
      const tagPopularity = this.calculateTagPopularity(item.contextualTags || []);
      relevanceScore += tagPopularity * 0.1;

      item.temporalMetadata.relevanceScore = Math.min(relevanceScore, 1.0);
    }

    await this.save();
  }

  /**
   * Get emergent behavior statistics from vector database
   */
  getBehaviorStatistics(): {
    totalVectors: number;
    behaviorAnnotatedVectors: number;
    averageInnovationIndex: number;
    behaviorTypeDistribution: Record<string, number>;
    topSemanticClusters: Array<{ cluster: string; count: number }>;
    temporalTrends: {
      recentActivity: number;
      innovationTrend: 'increasing' | 'decreasing' | 'stable';
      complexityTrend: 'increasing' | 'decreasing' | 'stable';
    };
  } {
    const behaviorItems = this.items.filter(item => item.behaviorInsights);
    const totalVectors = this.items.length;
    const behaviorAnnotatedVectors = behaviorItems.length;

    const averageInnovationIndex = behaviorItems.reduce((sum, item) =>
      sum + (item.behaviorInsights?.innovationIndex || 0), 0
    ) / Math.max(behaviorItems.length, 1);

    const behaviorTypeDistribution = behaviorItems.reduce((dist, item) => {
      const behaviorType = item.behaviorInsights?.behaviorPatterns[0] || 'unknown';
      dist[behaviorType] = (dist[behaviorType] || 0) + 1;
      return dist;
    }, {} as Record<string, number>);

    // Count semantic clusters
    const clusterCounts = new Map<string, number>();
    this.items.forEach(item => {
      (item.semanticClusters || []).forEach(cluster => {
        clusterCounts.set(cluster, (clusterCounts.get(cluster) || 0) + 1);
      });
    });

    const topSemanticClusters = Array.from(clusterCounts.entries())
      .sort((a: [string, number], b: [string, number]) => b[1] - a[1])
      .slice(0, 10)
      .map(([cluster, count]) => ({ cluster, count }));

    // Calculate temporal trends (simplified)
    const recentThreshold = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // Last 7 days
    const recentItems = this.items.filter(item => item.temporalMetadata && item.temporalMetadata.createdAt > recentThreshold);
    const recentActivity = recentItems.length;

    const innovationTrend = this.calculateTrend(
      recentItems.map(item => item.behaviorInsights?.innovationIndex || 0)
    );

    const complexityTrend = this.calculateTrend(
      recentItems.map(item => item.behaviorInsights?.complexityIndex || 0)
    );

    return {
      totalVectors,
      behaviorAnnotatedVectors,
      averageInnovationIndex: Math.round(averageInnovationIndex * 100) / 100,
      behaviorTypeDistribution,
      topSemanticClusters,
      temporalTrends: {
        recentActivity,
        innovationTrend,
        complexityTrend
      }
    };
  }

  // Private helper methods

  private async extractBehaviorInsights(
    content: string,
    _behaviorContext?: any
  ): Promise<VectorItem['behaviorInsights']> {
    if (!this.emergentBehaviorSystem) {
      return undefined;
    }

    // Analyze content for behavior patterns
    const behaviors = this.emergentBehaviorSystem.getBehaviors();
    const associatedBehaviors: string[] = [];
    const behaviorPatterns: string[] = [];

    // Simple pattern matching (in real implementation, this would be more sophisticated)
    for (const [behaviorId, behavior] of behaviors) {
      if (content.toLowerCase().includes(behavior.type) ||
          behavior.trigger.context.toLowerCase().includes(content.toLowerCase().substring(0, 50))) {
        associatedBehaviors.push(behaviorId);
        behaviorPatterns.push(behavior.type);
      }
    }

    if (associatedBehaviors.length === 0) {
      return undefined;
    }

    // Calculate derived metrics
    const emergenceScore = associatedBehaviors.length * 0.1; // Simple scoring
    const innovationIndex = this.calculateInnovationIndex(content);
    const complexityIndex = this.calculateComplexityIndex(content);
    const adaptationPotential = this.calculateAdaptationPotential(content);

    return {
      associatedBehaviors,
      behaviorPatterns,
      emergenceScore,
      innovationIndex,
      complexityIndex,
      adaptationPotential
    };
  }

  private extractContextualTags(content: string): string[] {
    const tags: string[] = [];
    const lowerContent = content.toLowerCase();

    // Technology tags
    const techTags = ['react', 'typescript', 'javascript', 'python', 'node', 'api', 'database', 'frontend', 'backend', 'fullstack'];
    techTags.forEach(tag => {
      if (lowerContent.includes(tag)) tags.push(tag);
    });

    // Concept tags
    const conceptTags = ['optimization', 'performance', 'security', 'scalability', 'architecture', 'design', 'testing', 'deployment'];
    conceptTags.forEach(tag => {
      if (lowerContent.includes(tag)) tags.push(tag);
    });

    // Domain tags
    const domainTags = ['web', 'mobile', 'desktop', 'cloud', 'blockchain', 'ai', 'machine-learning', 'data-science'];
    domainTags.forEach(tag => {
      if (lowerContent.includes(tag)) tags.push(tag);
    });

    return tags.slice(0, 10); // Limit to 10 tags
  }

  private identifySemanticClusters(content: string): string[] {
    const clusters: string[] = [];
    const lowerContent = content.toLowerCase();

    // Pattern-based cluster identification
    this.addClusterIfMatches(clusters, lowerContent, ['error', 'bug', 'fix'], 'error-handling');
    this.addClusterIfMatches(clusters, lowerContent, ['performance', 'optimization', 'speed'], 'performance-optimization');
    this.addClusterIfMatches(clusters, lowerContent, ['user', 'interface', 'ui'], 'user-experience');
    this.addClusterIfMatches(clusters, lowerContent, ['security', 'auth', 'permission'], 'security');
    this.addClusterIfMatches(clusters, lowerContent, ['data', 'database', 'storage'], 'data-management');

    return clusters;
  }

  private addClusterIfMatches(clusters: string[], content: string, keywords: string[], clusterName: string): void {
    if (keywords.some(keyword => content.includes(keyword))) {
      clusters.push(clusterName);
    }
  }

  private calculateInitialRelevance(behaviorInsights?: any, contextualTags: string[] = []): number {
    let relevance = 0.5; // Base relevance

    if (behaviorInsights) {
      relevance += behaviorInsights.emergenceScore * 0.2;
      relevance += behaviorInsights.innovationIndex * 0.1;
    }

    relevance += Math.min(contextualTags.length * 0.05, 0.2); // Up to 0.2 for many tags

    return Math.min(relevance, 1.0);
  }

  private async updateIndexes(item: VectorItem): Promise<void> {
    // Update semantic index
    (item.contextualTags || []).forEach(tag => {
      if (!this.semanticIndex.has(tag)) {
        this.semanticIndex.set(tag, new Set());
      }
      this.semanticIndex.get(tag)!.add(item.id);
    });

    // Update behavior index
    if (item.behaviorInsights?.behaviorPatterns) {
      item.behaviorInsights.behaviorPatterns.forEach(pattern => {
        if (!this.behaviorIndex.has(pattern)) {
          this.behaviorIndex.set(pattern, new Set());
        }
        this.behaviorIndex.get(pattern)!.add(item.id);
      });
    }
  }

  private calculateBehaviorScore(
    query: string,
    result: any,
    filter?: any
  ): number {
    if (!result.item.behaviorInsights) return 0.5;

    let score = 0.5; // Base score

    // Behavior pattern matching
    const queryLower = query.toLowerCase();
    const behaviorPatterns = result.item.behaviorInsights.behaviorPatterns;

    const patternMatch = behaviorPatterns.some((pattern: string) =>
      queryLower.includes(pattern)
    );
    if (patternMatch) score += 0.2;

    // Innovation index matching
    const innovationIndex = result.item.behaviorInsights.innovationIndex;
    if (filter?.minInnovationIndex && innovationIndex >= filter.minInnovationIndex) {
      score += 0.1;
    }

    // Complexity index matching
    const complexityIndex = result.item.behaviorInsights.complexityIndex;
    if (filter?.maxComplexityIndex && complexityIndex <= filter.maxComplexityIndex) {
      score += 0.1;
    }

    return Math.min(score, 1.0);
  }

  private calculateTemporalScore(result: any, timeRange?: { start: Date; end: Date }): number {
    if (!timeRange) return 0.5;

    const itemDate = result.item.temporalMetadata.createdAt;

    if (itemDate >= timeRange.start && itemDate <= timeRange.end) {
      return 0.8; // High score for items in time range
    }

    // Gradual decay for items outside range
    const daysDiff = Math.abs(itemDate.getTime() - timeRange.start.getTime()) / (24 * 60 * 60 * 1000);
    return Math.max(0.2, 0.8 - (daysDiff * 0.05));
  }

  private matchesBehaviorFilter(result: any, filter: any): boolean {
    if (!result.item.behaviorInsights) return true; // No filter applied

    if (filter.behaviorType && filter.behaviorType.length > 0) {
      const hasMatchingType = filter.behaviorType.some((type: string) =>
        result.item.behaviorInsights.behaviorPatterns.includes(type)
      );
      if (!hasMatchingType) return false;
    }

    if (filter.minInnovationIndex) {
      if (result.item.behaviorInsights.innovationIndex < filter.minInnovationIndex) {
        return false;
      }
    }

    if (filter.maxComplexityIndex) {
      if (result.item.behaviorInsights.complexityIndex > filter.maxComplexityIndex) {
        return false;
      }
    }

    return true;
  }

  private matchesContextFilter(result: any, filter: any): boolean {
    if (filter.semanticClusters && filter.semanticClusters.length > 0) {
      const hasMatchingCluster = filter.semanticClusters.some((cluster: string) =>
        result.item.semanticClusters.includes(cluster)
      );
      if (!hasMatchingCluster) return false;
    }

    if (filter.contextualTags && filter.contextualTags.length > 0) {
      const hasMatchingTag = filter.contextualTags.some((tag: string) =>
        result.item.contextualTags.includes(tag)
      );
      if (!hasMatchingTag) return false;
    }

    if (filter.timeRange) {
      const itemDate = result.item.temporalMetadata.createdAt;
      if (itemDate < filter.timeRange.start || itemDate > filter.timeRange.end) {
        return false;
      }
    }

    return true;
  }

  private analyzeContextualInsights(results: any[], context: any): any {
    const behaviorItems = results.map(r => r.item).filter(item => item.behaviorInsights);

    if (behaviorItems.length === 0) {
      return {
        dominantBehaviorType: 'unknown',
        averageInnovationIndex: 0,
        complexityDistribution: {},
        recommendedPatterns: [],
        emergentOpportunities: []
      };
    }

    // Find dominant behavior type
    const behaviorTypes = behaviorItems.flatMap(item =>
      item.behaviorInsights.behaviorPatterns
    );
    const typeCounts = behaviorTypes.reduce((counts, type) => {
      counts[type] = (counts[type] || 0) + 1;
      return counts;
    }, {} as Record<string, number>);

    const sortedEntries = (Object.entries(typeCounts) as [string, number][])
      .sort((a, b) => b[1] - a[1]);
    const dominantBehaviorType = sortedEntries[0]?.[0] || 'unknown';

    // Calculate average innovation index
    const averageInnovationIndex = behaviorItems.reduce((sum, item) =>
      sum + item.behaviorInsights.innovationIndex, 0
    ) / behaviorItems.length;

    // Complexity distribution
    const complexityDistribution = behaviorItems.reduce((dist, item) => {
      const complexity = item.behaviorInsights.complexityIndex;
      const level = complexity > 0.7 ? 'high' : complexity > 0.4 ? 'medium' : 'low';
      dist[level] = (dist[level] || 0) + 1;
      return dist;
    }, {} as Record<string, number>);

    // Recommended patterns (most successful)
    const successfulPatterns = behaviorItems
      .filter(item => item.behaviorInsights.emergenceScore > 0.7)
      .flatMap(item => item.behaviorInsights.behaviorPatterns);

    const patternCounts = successfulPatterns.reduce((counts, pattern) => {
      counts[pattern] = (counts[pattern] || 0) + 1;
      return counts;
    }, {} as Record<string, number>);

    const sortedPatterns = (Object.entries(patternCounts) as [string, number][])
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([pattern]) => pattern);

    // Emergent opportunities
    const emergentOpportunities = this.identifyEmergentOpportunities(results, context);

    return {
      dominantBehaviorType,
      averageInnovationIndex: Math.round(averageInnovationIndex * 100) / 100,
      complexityDistribution,
      recommendedPatterns: sortedPatterns,
      emergentOpportunities
    };
  }

  private mapPatternsToBehaviorTypes(patterns: string[]): string[] {
    const behaviorTypeMap: Record<string, string> = {
      'collaboration': 'collaboration',
      'cooperation': 'collaboration',
      'innovation': 'innovation',
      'creative': 'innovation',
      'optimization': 'optimization',
      'efficiency': 'optimization',
      'adaptation': 'adaptation',
      'learning': 'adaptation',
      'breakthrough': 'breakthrough',
      'paradigm': 'breakthrough'
    };

    return patterns.map(pattern => behaviorTypeMap[pattern] || 'collaboration');
  }

  private calculateInnovationIndex(content: string): number {
    const innovationKeywords = [
      'innovative', 'novel', 'creative', 'breakthrough', 'revolutionary',
      'unique', 'original', 'pioneering', 'groundbreaking', 'transformative'
    ];

    const lowerContent = content.toLowerCase();
    const innovationScore = innovationKeywords.reduce((score, keyword) => {
      return lowerContent.includes(keyword) ? score + 0.1 : score;
    }, 0);

    return Math.min(innovationScore, 1.0);
  }

  private calculateComplexityIndex(content: string): number {
    const complexityIndicators = [
      'complex', 'sophisticated', 'advanced', 'intricate', 'elaborate',
      'multifaceted', 'layered', 'nested', 'recursive', 'interdependent'
    ];

    const lowerContent = content.toLowerCase();
    let complexityScore = complexityIndicators.reduce((score, indicator) => {
      return lowerContent.includes(indicator) ? score + 0.05 : score;
    }, 0);

    // Also consider content length as complexity factor
    const lengthComplexity = Math.min(content.length / 2000, 0.5);
    complexityScore += lengthComplexity;

    return Math.min(complexityScore, 1.0);
  }

  private calculateAdaptationPotential(content: string): number {
    const adaptationKeywords = [
      'flexible', 'adaptable', 'configurable', 'extensible', 'modular',
      'customizable', 'dynamic', 'responsive', 'versatile', 'generalized'
    ];

    const lowerContent = content.toLowerCase();
    const adaptationScore = adaptationKeywords.reduce((score, keyword) => {
      return lowerContent.includes(keyword) ? score + 0.1 : score;
    }, 0);

    return Math.min(adaptationScore, 1.0);
  }

  private calculateTagPopularity(tags: string[]): number {
    let totalPopularity = 0;
    tags.forEach(tag => {
      const vectorsWithTag = this.semanticIndex.get(tag)?.size || 0;
      totalPopularity += vectorsWithTag;
    });
    return totalPopularity / Math.max(tags.length, 1) / this.items.length;
  }

  private calculateTrend(values: number[]): 'increasing' | 'decreasing' | 'stable' {
    if (values.length < 2) return 'stable';

    const recent = values.slice(-5); // Last 5 values
    const earlier = values.slice(0, -5); // Earlier values

    const recentAvg = recent.reduce((sum, val) => sum + val, 0) / recent.length;
    const earlierAvg = earlier.reduce((sum, val) => sum + val, 0) / Math.max(earlier.length, 1);

    const change = recentAvg - earlierAvg;

    if (change > 0.1) return 'increasing';
    if (change < -0.1) return 'decreasing';
    return 'stable';
  }

  private identifyEmergentOpportunities(results: any[], _context: any): string[] {
    const opportunities: string[] = [];

    // Look for underrepresented but promising patterns
    const allBehaviorTypes = results
      .map(r => r.item.behaviorInsights?.behaviorPatterns)
      .filter(Boolean)
      .flat();

    const typeCounts = allBehaviorTypes.reduce((counts, type) => {
      counts[type] = (counts[type] || 0) + 1;
      return counts;
    }, {} as Record<string, number>);

    // Find rare but high-potential patterns
    const rarePatterns = Object.entries(typeCounts)
      .filter(([_, count]) => count === 1)
      .map(([type]) => type);

    rarePatterns.forEach(pattern => {
      const highValueItems = results.filter(r =>
        r.item.behaviorInsights?.behaviorPatterns.includes(pattern) &&
        r.item.behaviorInsights.emergenceScore > 0.7
      );

      if (highValueItems.length > 0) {
        opportunities.push(`High-potential ${pattern} pattern detected`);
      }
    });

    return opportunities.slice(0, 5); // Limit to top 5
  }

  /**
   * Check if an item matches the given filter options
   */
  private matchesFilters(item: VectorItem, options: any): boolean {
    return this.checkComplexityFilter(item, options) &&
           this.checkDomainFilter(item, options) &&
           this.checkSuccessRateFilter(item, options);
  }

  private checkComplexityFilter(item: VectorItem, options: any): boolean {
    return !(options.maxComplexity && item.behaviorInsights?.complexityIndex && item.behaviorInsights.complexityIndex > options.maxComplexity);
  }

  private checkDomainFilter(item: VectorItem, options: any): boolean {
    return !(options.domainFilter && item.metadata.domain && !options.domainFilter.includes(item.metadata.domain));
  }

  private checkSuccessRateFilter(item: VectorItem, options: any): boolean {
    return !(options.minSuccessRate && item.behaviorInsights?.emergenceScore && item.behaviorInsights.emergenceScore < options.minSuccessRate);
  }
}
