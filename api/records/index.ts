import { createRecord, json, listRecords, withErrors } from '../../server/api';

export const GET = () => withErrors(async () => json(await listRecords()));

export const POST = (request: Request) =>
  withErrors(async () => json(await createRecord(request), 201));
