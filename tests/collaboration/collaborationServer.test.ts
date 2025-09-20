import { createServer } from 'http';
import type { AddressInfo } from 'net';

import { CollaborationServer } from '../../src/server/collaborationServer';

describe('CollaborationServer', () => {
  describe('start', () => {
    it('rejects when the port is already in use', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const blockingServer = createServer();
      await new Promise<void>(resolve =>
        blockingServer.listen({ port: 0, host: '127.0.0.1' }, resolve)
      );

      const port = (blockingServer.address() as AddressInfo).port;
      const collaborationServer = new CollaborationServer(port);

      try {
        await expect(collaborationServer.start()).rejects.toMatchObject({
          code: 'EADDRINUSE',
        });
      } finally {
        process.env.NODE_ENV = originalEnv;
        await collaborationServer.stop().catch(() => undefined);
        await new Promise<void>(resolve => blockingServer.close(() => resolve()));
      }
    });
  });
});
