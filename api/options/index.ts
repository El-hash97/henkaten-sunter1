import { json, listOptions, withErrors } from '../../server/api.js';

export const GET = () => withErrors(async () => json(await listOptions()));
