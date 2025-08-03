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
Object.defineProperty(exports, "__esModule", { value: true });
exports.VectorDB = void 0;
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
class VectorDB {
    constructor(storagePath) {
        this.items = [];
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
            similarity: this.cosineSimilarity(vector, item.vector)
        }));
        similarities.sort((a, b) => b.similarity - a.similarity);
        return similarities.slice(0, topK).map(s => s.item);
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
    // Helper to get embedding (mock implementation for now)
    async getEmbedding(text) {
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
    simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash);
    }
}
exports.VectorDB = VectorDB;
//# sourceMappingURL=vectorDB.js.map