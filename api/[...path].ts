import type { IncomingMessage, ServerResponse } from 'node:http';
import { handle } from '../server/api';
import { nodeToWebRequest, sendWebResponse } from '../server/node-adapter';

export default async function handler(
  req: Request | IncomingMessage,
  res?: ServerResponse
): Promise<Response | void> {
  if (res) {
    await sendWebResponse(await handle(await nodeToWebRequest(req as IncomingMessage)), res);
    return;
  }
  return handle(req as Request);
}
