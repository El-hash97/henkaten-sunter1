import { addOption, deleteOption, json, withErrors } from '../../server/api.js';

export const POST = (request: Request) =>
  withErrors(async () => json(await addOption('custom_departments', request), 201));

export const DELETE = (request: Request) =>
  withErrors(async () => json(await deleteOption('custom_departments', request)));
