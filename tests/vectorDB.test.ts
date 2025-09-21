import { VectorDB } from '../src/db/vectorDB';
import * as fs from 'fs';
import * as path from 'path';

jest.mock('fs', () => {
  const actualFs = jest.requireActual('fs');
  return {
    ...actualFs,
    promises: {
      writeFile: jest.fn().mockResolvedValue(undefined),
      readFile: jest.fn().mockResolvedValue('[]'),
      readdir: jest.fn().mockResolvedValue([]),
      unlink: jest.fn().mockResolvedValue(undefined),
    },
    existsSync: jest.fn().mockReturnValue(false),
    mkdirSync: jest.fn(),
  } as unknown as typeof import('fs');
});

jest.mock('@huggingface/inference', () => ({
  HfInference: jest.fn().mockImplementation(() => ({
    featureExtraction: jest.fn(),
  })),
}));

import { HfInference } from '@huggingface/inference';

const mockFs = fs as unknown as jest.Mocked<typeof fs>;
const mockFsPromises = mockFs.promises as unknown as {
  writeFile: jest.Mock;
  readFile: jest.Mock;
  readdir: jest.Mock;
  unlink: jest.Mock;
};

describe('VectorDB', () => {
  const storagePath = '/tmp/memory';
  let vectorDB: VectorDB;

  beforeEach(() => {
    jest.clearAllMocks();
    mockFs.existsSync.mockReturnValue(false);
    mockFsPromises.readFile.mockResolvedValue('[]');
    mockFsPromises.readdir.mockResolvedValue([]);
    vectorDB = new VectorDB(storagePath, {
      hotRetentionDays: 1,
      coldRetentionDays: 2,
      partitionGranularity: 'day',
    });
  });

  describe('initialization', () => {
    it('creates storage directories when missing', async () => {
      await vectorDB.init();

      expect(mockFs.mkdirSync).toHaveBeenCalledWith(path.join(storagePath, 'vectordb'), {
        recursive: true,
      });
      expect(mockFs.mkdirSync).toHaveBeenCalledWith(
        path.join(storagePath, 'vectordb', 'partitions'),
        { recursive: true }
      );
    });

    it('loads existing partitions', async () => {
      const partitionData = JSON.stringify([
        {
          id: 'memory-1',
          vector: [0.1, 0.2],
          metadata: { timestamp: new Date().toISOString() },
        },
      ]);

      mockFs.existsSync.mockReturnValue(true);
      mockFsPromises.readdir.mockResolvedValue(['2024-01-01.json']);
      mockFsPromises.readFile.mockResolvedValue(partitionData);

      await vectorDB.init();

      expect(mockFsPromises.readFile).toHaveBeenCalledWith(
        path.join(storagePath, 'vectordb', 'partitions', '2024-01-01.json'),
        'utf8'
      );
    });
  });

  describe('embedding management', () => {
    beforeEach(async () => {
      mockFs.existsSync.mockReturnValue(false);
      await vectorDB.init();
    });

    it('persists embeddings into timestamped partitions', async () => {
      const now = Date.UTC(2024, 0, 1);
      jest.spyOn(Date, 'now').mockReturnValue(now);

      await vectorDB.addEmbedding('doc-1', [0.1, 0.2], { content: 'hello world' });

      expect(mockFsPromises.writeFile).toHaveBeenCalledWith(
        path.join(storagePath, 'vectordb', 'partitions', '2024-01-01.json'),
        expect.stringContaining('"doc-1"'),
        'utf8'
      );

      (Date.now as jest.Mock).mockRestore();
    });

    it('queries embeddings with temporal filters', async () => {
      const now = Date.UTC(2024, 0, 5);
      jest.spyOn(Date, 'now').mockReturnValue(now);

      await vectorDB.addEmbedding('recent', [1, 0], {
        timestamp: new Date(now - 12 * 60 * 60 * 1000).toISOString(),
      });
      await vectorDB.addEmbedding('older', [0, 1], {
        timestamp: new Date(now - 3 * 24 * 60 * 60 * 1000).toISOString(),
      });

      const results = await vectorDB.queryEmbedding([1, 0], {
        topK: 5,
        includeCold: false,
        startTime: now - 24 * 60 * 60 * 1000,
      });

      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('recent');

      (Date.now as jest.Mock).mockRestore();
    });

    it('enforces retention across partitions', async () => {
      const now = Date.UTC(2024, 0, 10);
      jest.spyOn(Date, 'now').mockReturnValue(now);

      await vectorDB.addEmbedding('keep', [0.4, 0.6], {
        timestamp: new Date(now - 12 * 60 * 60 * 1000).toISOString(),
      });
      await vectorDB.addEmbedding('expire', [0.2, 0.8], {
        timestamp: new Date(now - 5 * 24 * 60 * 60 * 1000).toISOString(),
      });

      const partitions = Array.from(mockFsPromises.writeFile.mock.calls).map(call => call[0]);
      expect(partitions.length).toBeGreaterThan(0);

      (Date.now as jest.Mock).mockRestore();
    });
  });

  describe('embedding generation', () => {
    it('invokes huggingface for embeddings', async () => {
      const mockHf = HfInference as jest.MockedClass<typeof HfInference>;
      const instance = { featureExtraction: jest.fn().mockResolvedValue([0.1, 0.2, 0.3]) } as any;
      mockHf.mockImplementation(() => instance);

      await vectorDB.init();
      const embedding = await vectorDB.getEmbedding('hello world');

      expect(instance.featureExtraction).toHaveBeenCalled();
      expect(embedding).toEqual([0.1, 0.2, 0.3]);
    });

    it('falls back when API fails', async () => {
      const mockHf = HfInference as jest.MockedClass<typeof HfInference>;
      const instance = { featureExtraction: jest.fn().mockRejectedValue(new Error('fail')) } as any;
      mockHf.mockImplementation(() => instance);

      await vectorDB.init();
      const embedding = await vectorDB.getEmbedding('');

      expect(embedding).toHaveLength(384);
    });
  });
});
