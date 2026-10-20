# Henkaten Sunter 1

Clone aplikasi Henkaten (Vite + React 19 + Supabase, deploy ke Netlify) untuk kebutuhan **Sunter 1**.

- Database baru, **mulai dari data kosong** — tidak ada record/opsi lama yang terbawa.
- **Line Name & Departemen dicustom sendiri** per divisi lewat menu Pengaturan (tenant-admin).
- Arsitektur multi-tenant: satu tenant default bernama `Sunter 1` untuk pemakaian tanpa login.

## Setup Supabase (project baru)

1. Buat **Supabase project baru** di [supabase.com](https://supabase.com) (jangan pakai project lama).
2. Buka **SQL Editor** pada project baru, paste seluruh isi
   [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql), lalu jalankan.
   Script ini membuat: tabel `tenants` (default tenant `Sunter 1`), `henkaten_records`,
   `custom_line_names`, `custom_departments` (mulai kosong), RLS policies, dan
   bucket storage `henkaten_photos` + `henkaten_trial_docs`.
3. Ambil kredensial project baru:
   - **Project URL** & **anon/publishable key** — Settings → API
   - **service_role/secret key** — Settings → API (server-side saja, jangan ever dikirim ke client)

## Env vars

Isi `.env.local` (lokal) — lihat `.env.example`:

```
VITE_SUPABASE_URL=<url project supabase baru>
VITE_SUPABASE_ANON_KEY=<anon key project baru>
SUPABASE_SERVICE_ROLE_KEY=<secret key project baru>
SUPER_ADMIN_PASSWORD=<password super-admin, bebas tapi kuat>
```

Saat deploy ke Netlify (Settings → Environment variables), set 4 var yang sama
(`VITE_-_prefixed` tetap perlu di-set di site env vars untuk build production).

## Jalankan lokal

```bash
npm install
npm run dev
```

## Setelah deploy (urutan pertama kali)

1. Buka site production, scroll ke footer → klik **Super Admin** → masukkan
   `SUPER_ADMIN_PASSWORD`.
2. Di tab buat admin: pilih tenant `Sunter 1`, isi username + password untuk
   **tenant-admin** pertama.
3. Logout/belum perlu — klik ikon **Login** di navbar → login sebagai tenant-admin tersebut.
4. Menu **Pengaturan** → tambahkan daftar **Line Name** & **Departemen** milik
   Sunter 1 → beres, form input & rekap bisa dipakai (dropdown mulai dari kosong).

> Detail flow super-admin/tenant-admin ada di `netlify/functions/create-tenant.ts`
> dan `netlify/functions/create-user.ts`. RLS menjamin data tenant lain tidak terlihat.
