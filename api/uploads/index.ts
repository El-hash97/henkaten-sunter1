import { createUpload, json, withErrors } from '../../server/api';

export const POST = (request: Request) =>
  withErrors(async () => json(await createUpload(request), 201));
