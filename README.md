# Henkaten Sunter 1

Aplikasi Henkaten (Vite + React 19 + Neon Postgres, deploy ke Vercel) untuk kebutuhan **Sunter 1**.

**Tanpa multi-tenant** — satu divisi saja, tanpa login.

- Database mulai dari **data kosong**.
- **Line Name & Departemen dicustom sendiri** lewat menu Pengaturan (gate password `VITE_ADMIN_PASSWORD` di client).
- Foto & dokumen trial disimpan di **Neon Object Storage** (bucket `henkaten-photos` + `henkaten-trial-docs`).
- Query database dan pembuatan URL upload dilakukan di **Vercel Function** (`api/`), bukan dari browser — kredensial tidak pernah ikut ke bundle client.

## Arsitektur

```
Browser (React SPA)
  ├─ fetch /api/*  ──►  api/[...path].ts (Vercel Function)
  │                       ├─ @neondatabase/serverless  ──►  Neon Postgres
  │                       └─ presigned S3 URL            ──►  Neon Object Storage
  └─ PUT file langsung ke presigned URL (Object Storage)
```

- `server/api.ts` — handler + routing (dipakai Vercel dan dev server Vite).
- `server/db.ts` — koneksi Postgres.
- `server/storage.ts` — presigned upload URL.
- `neon/migrations/` — skema database.

## Setup Neon (project baru)

1. Login CLI: `npx neon@latest login`
2. Buat project + link (Object Storage butuh region `aws-us-east-2` atau
   `aws-eu-central-1`):
   ```bash
   npx neon@latest link --project-name henkaten-sunter1 --region-id aws-us-east-2
   ```
3. Buat bucket Object Storage (nama wajib pakai tanda hubung):
   ```bash
   npx neon@latest bucket create henkaten-photos --access-level public_read
   npx neon@latest bucket create henkaten-trial-docs --access-level public_read
   ```
4. Tarik env (`DATABASE_URL` + kredensial Object Storage) ke `.env.local`:
   ```bash
   npx neon@latest env pull --file .env.local
   ```
5. Jalankan migrasi:
   ```bash
   npm run db:migrate neon/migrations/0001_init.sql
   ```

## Env vars

`.env.local` untuk lokal (lihat `.env.example`). Semua variabel di bawah
**hanya untuk server** — jangan beri prefix `VITE_` kecuali `VITE_ADMIN_PASSWORD`.

```
DATABASE_URL=<connection string pooler dari Neon>
AWS_ACCESS_KEY_ID=<dari neon env pull>
AWS_SECRET_ACCESS_KEY=<dari neon env pull>
AWS_ENDPOINT_URL_S3=<dari neon env pull>
AWS_REGION=us-east-2
VITE_ADMIN_PASSWORD=<password gerbang Pengaturan>
```

Saat deploy ke Vercel, set variabel yang sama di **Project → Settings → Environment Variables**.
`DATABASE_URL` dan kredensial Object Storage wajib ada di runtime function.

## Jalankan lokal

```bash
npm install
npm run dev
```

`npm run dev` menjalankan Vite sekaligus handler `/api/*` (lewat middleware di
`vite.config.ts`), jadi tidak perlu `vercel dev`.

## Pemakaian pertama kali

1. Buka app → klik ikon **Pengaturan** di navbar → masukkan `VITE_ADMIN_PASSWORD`.
2. Tambahkan daftar **Line Name** & **Departemen** milik Sunter 1.
3. Form Input & Rekap-Data langsung bisa dipakai (dropdown terisi dari daftar itu).

> Catatan: gate password admin dibandingkan di client (inlined di bundle) —
> cukup untuk mencegah salah klik, bukan keamanan keras.
