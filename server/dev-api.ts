import type { IncomingMessage, ServerResponse } from 'node:http';
import {
  addOption,
  createRecord,
  createUpload,
  deleteOption,
  deleteRecord,
  json,
  listOptions,
  listRecords,
  updateRecord,
  withErrors,
} from './api.js';
import { nodeToWebRequest, sendWebResponse } from './node-adapter.js';

type RouteHandler = (request: Request) => Promise<Response>;

const routes: Record<string, Partial<Record<string, RouteHandler>>> = {
  '/api/records': {
    GET: () => withErrors(async () => json(await listRecords())),
    POST: (request) => withErrors(async () => json(await createRecord(request), 201)),
  },
  '/api/records/detail': {
    PATCH: (request) => withErrors(async () => json(await updateRecord(request))),
    DELETE: (request) => withErrors(async () => json(await deleteRecord(request))),
  },
  '/api/options': {
    GET: () => withErrors(async () => json(await listOptions())),
  },
  '/api/line-names': {
    POST: (request) => withErrors(async () => json(await addOption('custom_line_names', request), 201)),
    DELETE: (request) => withErrors(async () => json(await deleteOption('custom_line_names', request))),
  },
  '/api/departments': {
    POST: (request) => withErrors(async () => json(await addOption('custom_departments', request), 201)),
    DELETE: (request) => withErrors(async () => json(await deleteOption('custom_departments', request))),
  },
  '/api/uploads': {
    POST: (request) => withErrors(async () => json(await createUpload(request), 201)),
  },
};

export function apiDevMiddleware() {
  return async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    if (!req.url?.startsWith('/api/')) {
      next();
      return;
    }

    try {
      const pathname = new URL(req.url, 'http://localhost').pathname;
      const handler = routes[pathname]?.[req.method ?? 'GET'];

      if (!handler) {
        await sendWebResponse(json({ error: 'Endpoint tidak ditemukan' }, 404), res);
        return;
      }

      await sendWebResponse(await handler(await nodeToWebRequest(req)), res);
    } catch (error) {
      console.error(error);
      res.statusCode = 500;
      res.setHeader('content-type', 'application/json; charset=utf-8');
      res.end(JSON.stringify({ error: 'Terjadi kesalahan server' }));
    }
  };
}
