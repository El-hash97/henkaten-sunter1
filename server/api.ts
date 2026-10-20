import { getSql } from './db';
import { presignUpload, publicUrl, type BucketKey } from './storage';

export class HttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });

export async function withErrors(fn: () => Promise<Response>): Promise<Response> {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof HttpError) return json({ error: error.message }, error.status);
    const known = error as { code?: string; message?: string };
    if (known.code === '23505') return json({ error: 'Nama sudah ada' }, 409);
    if (known.code === '22P02') return json({ error: 'ID tidak valid' }, 400);
    console.error(error);
    return json({ error: known.message ?? 'Terjadi kesalahan server' }, 500);
  }
}

async function readJson(request: Request): Promise<Record<string, unknown>> {
  try {
    const body = await request.json();
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      throw new Error('invalid');
    }
    return body as Record<string, unknown>;
  } catch {
    throw new HttpError(400, 'Body JSON tidak valid');
  }
}

function idFromRequest(request: Request): string {
  const id = new URL(request.url).searchParams.get('id');
  if (!id) throw new HttpError(400, 'Parameter id wajib diisi');
  return id;
}

const RECORD_COLUMNS = [
  'line_name',
  'date_start',
  'date_finish',
  'category',
  'henkaten_info',
  'risk_level',
  'tujuan_henkaten',
  'pic_name',
  'departemen',
  'photo',
  'trial_document',
  'trial_document_name',
  'keterangan',
  'created_by',
] as const;

function pickColumns(body: Record<string, unknown>) {
  const row: Record<string, unknown> = {};
  for (const column of RECORD_COLUMNS) {
    if (body[column] !== undefined) row[column] = body[column];
  }
  return row;
}

export async function listRecords() {
  return getSql()`select * from henkaten_records order by created_at desc`;
}

export async function createRecord(request: Request) {
  const body = await readJson(request);
  const row = pickColumns(body);
  if (!row.date_start || !row.date_finish) {
    throw new HttpError(400, 'date_start dan date_finish wajib diisi');
  }
  const columns = Object.keys(row);
  const placeholders = columns.map((_, i) => `$${i + 1}`);
  const rows = await getSql().query(
    `insert into henkaten_records (${columns.join(', ')}) values (${placeholders.join(', ')}) returning *`,
    columns.map((column) => row[column])
  );
  return rows[0];
}

export async function updateRecord(request: Request) {
  const id = idFromRequest(request);
  const row = pickColumns(await readJson(request));
  const columns = Object.keys(row);
  if (columns.length === 0) {
    throw new HttpError(400, 'Tidak ada field untuk diupdate');
  }
  const sets = columns.map((column, i) => `${column} = $${i + 1}`);
  const rows = await getSql().query(
    `update henkaten_records set ${sets.join(', ')} where id = $${columns.length + 1} returning *`,
    [...columns.map((column) => row[column]), id]
  );
  if (rows.length === 0) throw new HttpError(404, 'Data tidak ditemukan');
  return rows[0];
}

export async function deleteRecord(request: Request) {
  const id = idFromRequest(request);
  const rows = await getSql().query('delete from henkaten_records where id = $1 returning id', [id]);
  if (rows.length === 0) throw new HttpError(404, 'Data tidak ditemukan');
  return { ok: true };
}

export async function listOptions() {
  const [lineNames, departments] = await Promise.all([
    getSql()`select id, name from custom_line_names order by name asc`,
    getSql()`select id, name from custom_departments order by name asc`,
  ]);
  return { lineNames, departments };
}

type OptionTable = 'custom_line_names' | 'custom_departments';

export async function addOption(table: OptionTable, request: Request) {
  const body = await readJson(request);
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (!name) throw new HttpError(400, 'Nama wajib diisi');
  const rows = await getSql().query(`insert into ${table} (name) values ($1) returning *`, [name]);
  return rows[0];
}

export async function deleteOption(table: OptionTable, request: Request) {
  const id = idFromRequest(request);
  const rows = await getSql().query(`delete from ${table} where id = $1 returning id`, [id]);
  if (rows.length === 0) throw new HttpError(404, 'Data tidak ditemukan');
  return { ok: true };
}

function fileExtension(filename: string): string {
  const ext = filename.split('.').pop() ?? '';
  return /^[A-Za-z0-9]{1,10}$/.test(ext) ? ext.toLowerCase() : 'bin';
}

export async function createUpload(request: Request) {
  const body = await readJson(request);
  const bucket = body.bucket;
  if (bucket !== 'photos' && bucket !== 'docs') {
    throw new HttpError(400, 'bucket harus "photos" atau "docs"');
  }
  const filename = typeof body.filename === 'string' ? body.filename : '';
  const contentType =
    typeof body.contentType === 'string' && body.contentType.includes('/')
      ? body.contentType
      : 'application/octet-stream';
  const key = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${fileExtension(filename)}`;
  const uploadUrl = await presignUpload(bucket as BucketKey, key, contentType);
  return { uploadUrl, publicUrl: publicUrl(bucket as BucketKey, key) };
}
