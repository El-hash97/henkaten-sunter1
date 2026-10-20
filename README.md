# Henkaten Sunter 1

Aplikasi Henkaten (Vite + React 19 + Supabase, deploy ke Netlify/Vercel) untuk kebutuhan **Sunter 1**.

**Tanpa multi-tenant** — satu divisi saja, login Supabase Auth dihilangkan.

- Database mulai dari **data kosong**.
- **Line Name & Departemen dicustom sendiri** lewat menu Pengaturan (gate password `VITE_ADMIN_PASSWORD` di client).
- Custom Line Name & Departemen juga mulai kosong — daftar dibangun sebelum dipakai.

## Setup Supabase (project baru)

1. Buat **Supabase project baru** di [supabase.com](https://supabase.com).
2. Buka **SQL Editor**, paste seluruh isi
   [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql), lalu jalankan.
   Membuat: tabel `henkaten_records`, `custom_line_names`, `custom_departments`
   (semua kosong), RLS permissive, dan bucket `henkaten_photos` + `henkaten_trial_docs`.
3. Ambil **Project URL** & **anon key** — Settings → API.

## Env vars

Isi `.env.local` (lokal) — lihat `.env.example`:

```
VITE_SUPABASE_URL=<url project supabase baru>
VITE_SUPABASE_ANON_KEY=<anon key project baru>
VITE_ADMIN_PASSWORD=<password gerbang Pengaturan>
```

Saat deploy ke Netlify/Vercel, set 3 var yang sama di site env vars
(`VITE_-prefixed` wajib di-set untuk build production).

## Jalankan lokal

```bash
npm install
npm run dev
```

## Pemakaian pertama kali

1. Buka app → klik ikon **Pengaturan** di navbar → masukkan `VITE_ADMIN_PASSWORD`.
2. Tambahkan daftar **Line Name** & **Departemen** milik Sunter 1.
3. Form Input & Rekap-Data langsung bisa dipakai (dropdown terisi dari daftar itu).

> Catatan: gate password admin dibandingkan di client (inlined di bundle) —
> sama seperti perilaku baseline aplikasi asli. Cukup untuk mencegah salah
> klik, bukan keamanan keras.
