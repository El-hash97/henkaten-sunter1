import { deleteRecord, json, updateRecord, withErrors } from '../../server/api';

export const PATCH = (request: Request) =>
  withErrors(async () => json(await updateRecord(request)));

export const DELETE = (request: Request) =>
  withErrors(async () => json(await deleteRecord(request)));
