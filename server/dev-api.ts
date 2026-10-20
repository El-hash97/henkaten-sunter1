import type { IncomingMessage, ServerResponse } from 'node:http';
import { handle } from './api';
import { nodeToWebRequest, sendWebResponse } from './node-adapter';

export function apiDevMiddleware() {
  return async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    if (!req.url?.startsWith('/api/')) {
      next();
      return;
    }

    try {
      const request = await nodeToWebRequest(req);
      await sendWebResponse(await handle(request), res);
    } catch (error) {
      console.error(error);
      res.statusCode = 500;
      res.setHeader('content-type', 'application/json; charset=utf-8');
      res.end(JSON.stringify({ error: 'Terjadi kesalahan server' }));
    }
  };
}
