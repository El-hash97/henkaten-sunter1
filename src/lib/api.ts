export interface CustomOption {
  id: string;
  name: string;
}

export const errorMessage = (err: unknown): string =>
  err instanceof Error ? err.message : String(err);

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api${path}`, {
    ...init,
    headers: {
      ...(init?.body ? { 'content-type': 'application/json' } : {}),
      ...init?.headers,
    },
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new Error(data?.error ?? `Permintaan gagal (${response.status})`);
  }

  return data as T;
}

export type BucketKey = 'photos' | 'docs';

async function uploadFile(bucket: BucketKey, file: File): Promise<string> {
  const contentType = file.type || 'application/octet-stream';
  const { uploadUrl, publicUrl } = await request<{ uploadUrl: string; publicUrl: string }>(
    '/uploads',
    {
      method: 'POST',
      body: JSON.stringify({ bucket, filename: file.name, contentType }),
    }
  );

  const put = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'content-type': contentType },
    body: file,
  });

  if (!put.ok) {
    throw new Error(`Upload gagal (${put.status})`);
  }

  return publicUrl;
}

export const api = {
  listRecords: () => request<Record<string, unknown>[]>('/records'),
  createRecord: (record: Record<string, unknown>) =>
    request<Record<string, unknown>>('/records', { method: 'POST', body: JSON.stringify(record) }),
  updateRecord: (id: string, patch: Record<string, unknown>) =>
    request<Record<string, unknown>>(`/records/detail?id=${id}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    }),
  deleteRecord: (id: string) => request<{ ok: true }>(`/records/detail?id=${id}`, { method: 'DELETE' }),

  listOptions: () => request<{ lineNames: CustomOption[]; departments: CustomOption[] }>('/options'),
  addLineName: (name: string) =>
    request<CustomOption>('/line-names', { method: 'POST', body: JSON.stringify({ name }) }),
  deleteLineName: (id: string) => request<{ ok: true }>(`/line-names?id=${id}`, { method: 'DELETE' }),
  addDepartment: (name: string) =>
    request<CustomOption>('/departments', { method: 'POST', body: JSON.stringify({ name }) }),
  deleteDepartment: (id: string) =>
    request<{ ok: true }>(`/departments?id=${id}`, { method: 'DELETE' }),

  uploadFile,
};
