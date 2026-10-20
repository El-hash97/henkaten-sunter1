import { addOption, deleteOption, json, withErrors } from '../../server/api';

export const POST = (request: Request) =>
  withErrors(async () => json(await addOption('custom_line_names', request), 201));

export const DELETE = (request: Request) =>
  withErrors(async () => json(await deleteOption('custom_line_names', request)));
