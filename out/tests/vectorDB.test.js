/**
 * Integration tests for VectorDB - Real Hugging Face API integration
 */
import { VectorDB } from '../src/db/vectorDB';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
// Load environment variables
dotenv.config();
describe('VectorDB', () => {
    let vectorDB;
    const testStoragePath = './test_vectors';
    beforeEach(async () => {
        // Clean up any existing test data
        if (fs.existsSync(testStoragePath)) {
            fs.rmSync(testStoragePath, { recursive: true, force: true });
        }
        vectorDB = new VectorDB(testStoragePath);
        await vectorDB.init();
    });
    afterEach(async () => {
        if (vectorDB) {
            vectorDB.close();
        }
        // Clean up test data
        if (fs.existsSync(testStoragePath)) {
            fs.rmSync(testStoragePath, { recursive: true, force: true });
        }
    });
    describe('Initialization', () => {
        it('should initialize successfully', () => {
            expect(vectorDB).toBeDefined();
        });
        it('should create storage directory', () => {
            expect(fs.existsSync(testStoragePath)).toBe(true);
        });
    });
    describe('Real Embedding Generation', () => {
        it('should generate embeddings using real Hugging Face API', async () => {
            const text = 'This is a test document for embedding generation.';
            const embedding = await vectorDB.getEmbedding(text);
            expect(embedding).toBeDefined();
            expect(Array.isArray(embedding)).toBe(true);
            expect(embedding.length).toBeGreaterThan(0);
            expect(embedding.every(val => typeof val === 'number')).toBe(true);
        }, 15000);
        it('should generate consistent embeddings for same text', async () => {
            const text = 'Consistent embedding test text.';
            const embedding1 = await vectorDB.getEmbedding(text);
            const embedding2 = await vectorDB.getEmbedding(text);
            expect(embedding1).toEqual(embedding2);
        }, 20000);
        it('should generate different embeddings for different texts', async () => {
            const text1 = 'This is about cats and animals.';
            const text2 = 'This is about programming and computers.';
            const embedding1 = await vectorDB.getEmbedding(text1);
            const embedding2 = await vectorDB.getEmbedding(text2);
            expect(embedding1).not.toEqual(embedding2);
        }, 20000);
    });
    describe('Document Management', () => {
        it('should add and retrieve documents', async () => {
            const key = 'test-doc';
            const text = 'This is a test document for storage and retrieval.';
            const metadata = { category: 'test', timestamp: Date.now() };
            await vectorDB.addDocument(key, text, metadata);
            // Verify the document was stored
            const embedding = await vectorDB.getEmbedding(text);
            const results = await vectorDB.queryEmbedding(embedding, 1);
            expect(results).toHaveLength(1);
            expect(results[0].id).toBe(key);
            expect(results[0].metadata).toMatchObject(metadata);
        }, 20000);
        it('should handle batch embedding requests', async () => {
            const texts = [
                'First test document about cats',
                'Second test document about dogs',
                'Third test document about birds'
            ];
            const embeddings = await vectorDB.getBatchEmbeddings(texts);
            expect(embeddings).toHaveLength(texts.length);
            embeddings.forEach(embedding => {
                expect(Array.isArray(embedding)).toBe(true);
                expect(embedding.length).toBeGreaterThan(0);
            });
        }, 30000);
    });
    describe('Similarity Search', () => {
        beforeEach(async () => {
            // Add test documents
            await vectorDB.addDocument('doc1', 'JavaScript programming tutorial', { topic: 'programming' });
            await vectorDB.addDocument('doc2', 'Python machine learning guide', { topic: 'programming' });
            await vectorDB.addDocument('doc3', 'Cooking pasta recipes', { topic: 'cooking' });
            await vectorDB.addDocument('doc4', 'Web development with React', { topic: 'programming' });
        });
        it('should find similar documents', async () => {
            const queryEmbedding = await vectorDB.getEmbedding('TypeScript programming tutorial');
            const results = await vectorDB.queryEmbedding(queryEmbedding, 2);
            expect(results).toHaveLength(2);
            expect(results[0].similarity).toBeGreaterThan(0);
            expect(results[0].similarity).toBeGreaterThan(results[1].similarity);
        }, 25000);
        it('should return results in similarity order', async () => {
            const queryEmbedding = await vectorDB.getEmbedding('programming languages tutorial');
            const results = await vectorDB.queryEmbedding(queryEmbedding, 3);
            expect(results.length).toBeGreaterThan(1);
            // Check that results are sorted by similarity (descending)
            for (let i = 1; i < results.length; i++) {
                expect(results[i - 1].similarity).toBeGreaterThanOrEqual(results[i].similarity);
            }
        }, 25000);
    });
    describe('Persistence', () => {
        it('should save and load data correctly', async () => {
            const key = 'persistent-doc';
            const text = 'This document should persist across sessions.';
            const metadata = { persistent: true };
            await vectorDB.addDocument(key, text, metadata);
            await vectorDB.save();
            // Create new instance to test persistence
            const newVectorDB = new VectorDB(testStoragePath);
            await newVectorDB.init();
            const queryEmbedding = await newVectorDB.getEmbedding(text);
            const results = await newVectorDB.queryEmbedding(queryEmbedding, 1);
            expect(results).toHaveLength(1);
            expect(results[0].id).toBe(key);
            expect(results[0].metadata).toMatchObject(metadata);
            newVectorDB.close();
        }, 25000);
        it('should handle save errors gracefully', async () => {
            // This should not throw an error even if save fails
            expect(() => vectorDB.save()).not.toThrow();
        });
    });
    describe('Error Handling', () => {
        it('should handle invalid text input', async () => {
            const embedding = await vectorDB.getEmbedding('');
            expect(embedding).toBeDefined();
            expect(Array.isArray(embedding)).toBe(true);
        }, 10000);
        it('should handle API rate limits gracefully', async () => {
            // Test with multiple rapid requests
            const promises = Array(5).fill(0).map((_, i) => vectorDB.getEmbedding(`Test text ${i}`));
            const results = await Promise.all(promises);
            results.forEach(embedding => {
                expect(embedding).toBeDefined();
                expect(Array.isArray(embedding)).toBe(true);
            });
        }, 30000);
    });
});
//# sourceMappingURL=vectorDB.test.js.map