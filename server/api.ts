import { getSql } from './db';
import { presignUpload, publicUrl, type BucketKey } from './storage';

class HttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });

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

async function listRecords() {
  return getSql()`select * from henkaten_records order by created_at desc`;
}

async function createRecord(body: Record<string, unknown>) {
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

async function updateRecord(id: string, body: Record<string, unknown>) {
  const row = pickColumns(body);
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

async function deleteRecord(id: string) {
  const rows = await getSql().query('delete from henkaten_records where id = $1 returning id', [id]);
  if (rows.length === 0) throw new HttpError(404, 'Data tidak ditemukan');
}

async function listOptions() {
  const [lineNames, departments] = await Promise.all([
    getSql()`select id, name from custom_line_names order by name asc`,
    getSql()`select id, name from custom_departments order by name asc`,
  ]);
  return { lineNames, departments };
}

async function addOption(table: 'custom_line_names' | 'custom_departments', body: Record<string, unknown>) {
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (!name) throw new HttpError(400, 'Nama wajib diisi');
  const rows = await getSql().query(`insert into ${table} (name) values ($1) returning *`, [name]);
  return rows[0];
}

async function deleteOption(table: 'custom_line_names' | 'custom_departments', id: string) {
  const rows = await getSql().query(`delete from ${table} where id = $1 returning id`, [id]);
  if (rows.length === 0) throw new HttpError(404, 'Data tidak ditemukan');
}

function fileExtension(filename: string): string {
  const ext = filename.split('.').pop() ?? '';
  return /^[A-Za-z0-9]{1,10}$/.test(ext) ? ext.toLowerCase() : 'bin';
}

async function createUpload(body: Record<string, unknown>) {
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

export async function handle(request: Request): Promise<Response> {
  try {
    const { pathname } = new URL(request.url);
    const segments = pathname.replace(/^\/api\/?/, '').split('/').filter(Boolean);
    const method = request.method.toUpperCase();
    const [resource, id] = segments;

    if (segments.length === 0) return json({ ok: true });

    if (resource === 'records') {
      if (segments.length === 1) {
        if (method === 'GET') return json(await listRecords());
        if (method === 'POST') return json(await createRecord(await readJson(request)), 201);
      }
      if (segments.length === 2) {
        if (method === 'PATCH') return json(await updateRecord(id, await readJson(request)));
        if (method === 'DELETE') {
          await deleteRecord(id);
          return json({ ok: true });
        }
      }
    }

    if (resource === 'options' && segments.length === 1 && method === 'GET') {
      return json(await listOptions());
    }

    if (resource === 'line-names' || resource === 'departments') {
      const table = resource === 'line-names' ? 'custom_line_names' : 'custom_departments';
      if (segments.length === 1 && method === 'POST') {
        return json(await addOption(table, await readJson(request)), 201);
      }
      if (segments.length === 2 && method === 'DELETE') {
        await deleteOption(table, id);
        return json({ ok: true });
      }
    }

    if (resource === 'uploads' && segments.length === 1 && method === 'POST') {
      return json(await createUpload(await readJson(request)), 201);
    }

    throw new HttpError(404, 'Endpoint tidak ditemukan');
  } catch (error) {
    if (error instanceof HttpError) return json({ error: error.message }, error.status);
    const known = error as { code?: string; message?: string };
    if (known.code === '23505') return json({ error: 'Nama sudah ada' }, 409);
    if (known.code === '22P02') return json({ error: 'ID tidak valid' }, 400);
    console.error(error);
    return json({ error: known.message ?? 'Terjadi kesalahan server' }, 500);
  }
}
