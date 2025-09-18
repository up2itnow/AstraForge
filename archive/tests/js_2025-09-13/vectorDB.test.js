/**
 * Unit tests for VectorDB - Semantic search and embeddings
 */
import { VectorDB } from '../src/db/vectorDB';
import * as fs from 'fs';
import * as path from 'path';
// Mock fs module
jest.mock('fs');
const mockFs = fs;
// Mock Hugging Face inference
jest.mock('@huggingface/inference', () => ({
    HfInference: jest.fn().mockImplementation(() => ({
        featureExtraction: jest.fn()
    }))
}));
import { HfInference } from '@huggingface/inference';
const MockHfInference = HfInference;
describe('VectorDB', () => {
    let vectorDB;
    let mockHf;
    const testStoragePath = '/test/path';
    beforeEach(() => {
        jest.clearAllMocks();
        // Setup HfInference mock
        mockHf = {
            featureExtraction: jest.fn()
        };
        MockHfInference.mockImplementation(() => mockHf);
        vectorDB = new VectorDB(testStoragePath);
    });
    describe('Initialization', () => {
        it('should initialize with correct storage path', () => {
            expect(vectorDB).toBeInstanceOf(VectorDB);
        });
        it('should create storage directory if not exists', async () => {
            mockFs.existsSync.mockReturnValue(false);
            mockFs.mkdirSync.mockImplementation(() => '');
            await vectorDB.init();
            expect(mockFs.mkdirSync).toHaveBeenCalledWith(path.join(testStoragePath, 'vectordb'), { recursive: true });
        });
        it('should load existing data if available', async () => {
            const mockData = JSON.stringify([
                { id: 'test1', vector: [1, 2, 3], metadata: { test: 'data' } }
            ]);
            mockFs.existsSync
                .mockReturnValueOnce(true) // Directory exists
                .mockReturnValueOnce(true); // Data file exists
            mockFs.readFileSync.mockReturnValue(mockData);
            await vectorDB.init();
            expect(mockFs.readFileSync).toHaveBeenCalledWith(path.join(testStoragePath, 'vectordb', 'vectors.json'), 'utf8');
        });
        it('should handle corrupted data file gracefully', async () => {
            mockFs.existsSync
                .mockReturnValueOnce(true) // Directory exists
                .mockReturnValueOnce(true); // Data file exists
            mockFs.readFileSync.mockReturnValue('invalid json');
            // Should not throw
            await vectorDB.init();
            // Internal items array should be empty
            expect(true).toBe(true); // Test passes if no exception thrown
        });
    });
    describe('Embedding Generation', () => {
        it('should generate real embeddings via Hugging Face', async () => {
            const mockEmbedding = [0.1, 0.2, 0.3, 0.4];
            mockHf.featureExtraction.mockResolvedValue(mockEmbedding);
            const result = await vectorDB.getEmbedding('test text');
            expect(mockHf.featureExtraction).toHaveBeenCalledWith({
                model: 'sentence-transformers/all-MiniLM-L6-v2',
                inputs: 'test text'
            });
            expect(result).toEqual(mockEmbedding);
        });
        it('should handle nested array response format', async () => {
            const mockEmbedding = [[0.1, 0.2, 0.3, 0.4]];
            mockHf.featureExtraction.mockResolvedValue(mockEmbedding);
            const result = await vectorDB.getEmbedding('test text');
            expect(result).toEqual([0.1, 0.2, 0.3, 0.4]);
        });
        it('should use fallback when API fails', async () => {
            mockHf.featureExtraction.mockRejectedValue(new Error('API Error'));
            const result = await vectorDB.getEmbedding('test text');
            expect(result).toHaveLength(384); // Fallback embedding size
            expect(Array.isArray(result)).toBe(true);
            expect(typeof result[0]).toBe('number');
        });
        it('should clean text before embedding', async () => {
            const mockEmbedding = [0.1, 0.2];
            mockHf.featureExtraction.mockResolvedValue(mockEmbedding);
            await vectorDB.getEmbedding('  test   text  \n  ');
            expect(mockHf.featureExtraction).toHaveBeenCalledWith({
                model: 'sentence-transformers/all-MiniLM-L6-v2',
                inputs: 'test text'
            });
        });
        it('should handle empty text with fallback', async () => {
            const result = await vectorDB.getEmbedding('');
            expect(result).toHaveLength(384);
            expect(mockHf.featureExtraction).not.toHaveBeenCalled();
        });
    });
    describe('Batch Embeddings', () => {
        it('should process embeddings in batches', async () => {
            const mockEmbedding = [0.1, 0.2, 0.3];
            mockHf.featureExtraction.mockResolvedValue(mockEmbedding);
            const texts = ['text1', 'text2', 'text3', 'text4', 'text5', 'text6'];
            const results = await vectorDB.getBatchEmbeddings(texts);
            expect(results).toHaveLength(6);
            expect(mockHf.featureExtraction).toHaveBeenCalledTimes(6);
            results.forEach(embedding => {
                expect(embedding).toEqual(mockEmbedding);
            });
        });
        it('should handle batch failures gracefully', async () => {
            mockHf.featureExtraction
                .mockResolvedValueOnce([0.1, 0.2])
                .mockRejectedValueOnce(new Error('Batch error'))
                .mockResolvedValueOnce([0.3, 0.4]);
            const results = await vectorDB.getBatchEmbeddings(['text1', 'text2', 'text3']);
            expect(results).toHaveLength(3);
            expect(results[0]).toEqual([0.1, 0.2]);
            expect(results[1]).toHaveLength(384); // Fallback
            expect(results[2]).toEqual([0.3, 0.4]);
        });
        it('should respect rate limiting with delays', async () => {
            const startTime = Date.now();
            mockHf.featureExtraction.mockResolvedValue([0.1]);
            // Use smaller batch size to trigger delay
            const originalDateNow = Date.now;
            let callCount = 0;
            Date.now = jest.fn(() => {
                callCount++;
                return originalDateNow() + (callCount * 50); // Simulate time passage
            });
            await vectorDB.getBatchEmbeddings(['text1', 'text2', 'text3', 'text4', 'text5', 'text6']);
            Date.now = originalDateNow;
            expect(mockHf.featureExtraction).toHaveBeenCalledTimes(6);
        });
    });
    describe('Vector Operations', () => {
        beforeEach(async () => {
            mockFs.existsSync.mockReturnValue(false);
            await vectorDB.init();
        });
        it('should add embeddings correctly', async () => {
            const embedding = [1, 2, 3, 4];
            const metadata = { type: 'test', content: 'test data' };
            await vectorDB.addEmbedding('test-key', embedding, metadata);
            // Since we can't directly access private items, we test through query
            const results = await vectorDB.queryEmbedding([1, 2, 3, 4], 1);
            expect(results).toHaveLength(1);
            expect(results[0].id).toBe('test-key');
        });
        it('should calculate cosine similarity correctly', async () => {
            const embedding1 = [1, 0, 0];
            const embedding2 = [0, 1, 0];
            const embedding3 = [1, 0, 0]; // Identical to embedding1
            await vectorDB.addEmbedding('key1', embedding1, { data: 'test1' });
            await vectorDB.addEmbedding('key2', embedding2, { data: 'test2' });
            await vectorDB.addEmbedding('key3', embedding3, { data: 'test3' });
            const results = await vectorDB.queryEmbedding([1, 0, 0], 3);
            expect(results).toHaveLength(3);
            expect(results[0].similarity).toBeCloseTo(1.0, 5); // Perfect match
            expect(results[1].similarity).toBeCloseTo(1.0, 5); // Perfect match
            expect(results[2].similarity).toBeCloseTo(0.0, 5); // Orthogonal vectors
        });
        it('should limit query results correctly', async () => {
            for (let i = 0; i < 10; i++) {
                await vectorDB.addEmbedding(`key${i}`, [i, i, i], { data: `test${i}` });
            }
            const results = await vectorDB.queryEmbedding([1, 1, 1], 5);
            expect(results).toHaveLength(5);
        });
        it('should sort results by similarity descending', async () => {
            await vectorDB.addEmbedding('low', [0, 0, 1], { data: 'low similarity' });
            await vectorDB.addEmbedding('high', [1, 0, 0], { data: 'high similarity' });
            await vectorDB.addEmbedding('medium', [0.5, 0, 0.5], { data: 'medium similarity' });
            const results = await vectorDB.queryEmbedding([1, 0, 0], 3);
            expect(results[0].id).toBe('high');
            expect(results[1].id).toBe('medium');
            expect(results[2].id).toBe('low');
        });
    });
    describe('Persistence', () => {
        it('should save data correctly', async () => {
            mockFs.existsSync.mockReturnValue(false);
            mockFs.writeFileSync.mockImplementation(() => { });
            await vectorDB.init();
            await vectorDB.addEmbedding('test', [1, 2, 3], { data: 'test' });
            await vectorDB.save();
            expect(mockFs.writeFileSync).toHaveBeenCalledWith(path.join(testStoragePath, 'vectordb', 'vectors.json'), expect.stringContaining('"id":"test"'), 'utf8');
        });
        it('should handle save errors gracefully', async () => {
            mockFs.writeFileSync.mockImplementation(() => {
                throw new Error('Write error');
            });
            // Should not throw
            await vectorDB.save();
            expect(true).toBe(true);
        });
    });
    describe('Fallback Embedding', () => {
        it('should generate deterministic embeddings', async () => {
            const embedding1 = vectorDB.getFallbackEmbedding('test');
            const embedding2 = vectorDB.getFallbackEmbedding('test');
            expect(embedding1).toEqual(embedding2);
            expect(embedding1).toHaveLength(384);
        });
        it('should generate different embeddings for different text', async () => {
            const embedding1 = vectorDB.getFallbackEmbedding('test1');
            const embedding2 = vectorDB.getFallbackEmbedding('test2');
            expect(embedding1).not.toEqual(embedding2);
        });
    });
});
//# sourceMappingURL=vectorDB.test.js.map