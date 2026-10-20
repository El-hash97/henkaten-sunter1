import { json, listOptions, withErrors } from '../../server/api';

export const GET = () => withErrors(async () => json(await listOptions()));
