import * as path from 'path';
import * as fs from 'fs';
import { HfInference } from '@huggingface/inference';
export class VectorDB {
    constructor(storagePath) {
        this.items = [];
        this.embeddingModel = 'sentence-transformers/all-MiniLM-L6-v2';
        this.storagePath = path.join(storagePath, 'vectordb');
        // Initialize Hugging Face inference - will use public API or user's token if set
        this.hf = new HfInference(process.env.HUGGINGFACE_API_TOKEN);
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
            }
            catch (error) {
                console.warn('Failed to load vector database:', error);
                this.items = [];
            }
        }
    }
    async addEmbedding(key, vector, metadata) {
        const existingIndex = this.items.findIndex(item => item.id === key);
        if (existingIndex >= 0) {
            this.items[existingIndex] = { id: key, vector, metadata };
        }
        else {
            this.items.push({ id: key, vector, metadata });
        }
        await this.save();
    }
    async queryEmbedding(vector, topK = 5) {
        // Simple cosine similarity implementation
        const similarities = this.items.map(item => ({
            item,
            similarity: this.cosineSimilarity(vector, item.vector),
        }));
        similarities.sort((a, b) => b.similarity - a.similarity);
        return similarities.slice(0, topK).map(s => ({ ...s.item, similarity: s.similarity }));
    }
    cosineSimilarity(a, b) {
        if (a.length !== b.length)
            return 0;
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
    async getEmbedding(text) {
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
            let embedding;
            if (Array.isArray(response)) {
                if (Array.isArray(response[0])) {
                    embedding = response[0];
                }
                else {
                    embedding = response;
                }
            }
            else {
                throw new Error('Unexpected response format from embedding API');
            }
            // Validate embedding
            if (!embedding || embedding.length === 0) {
                console.warn('Invalid embedding received, using fallback');
                return this.getFallbackEmbedding(text);
            }
            console.log(`Generated embedding for "${cleanText.substring(0, 50)}..." (${embedding.length} dimensions)`);
            return embedding;
        }
        catch (error) {
            console.warn(`Embedding API failed: ${error.message}, using fallback`);
            return this.getFallbackEmbedding(text);
        }
    }
    // Fallback embedding for when API is unavailable
    getFallbackEmbedding(text) {
        console.log('Using fallback embedding generation');
        const hash = this.simpleHash(text);
        const embedding = new Array(384).fill(0); // Standard embedding dimension
        // Create a deterministic but distributed embedding based on text
        for (let i = 0; i < embedding.length; i++) {
            embedding[i] = Math.sin((hash + i) * 0.1) * Math.cos((hash + i) * 0.2);
        }
        return embedding;
    }
    simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = (hash << 5) - hash + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash);
    }
    // Batch embedding for efficiency
    async getBatchEmbeddings(texts) {
        const embeddings = [];
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
            }
            catch (error) {
                console.warn(`Batch embedding failed: ${error.message}`);
                // Add fallback embeddings for failed batch
                for (const text of batch) {
                    embeddings.push(this.getFallbackEmbedding(text));
                }
            }
        }
        return embeddings;
    }
}
//# sourceMappingURL=vectorDB.js.map