-- ============================================================
-- Henkaten Sunter 1 — Supabase init (single division, data kosong)
-- Jalankan SEMUA script ini di Supabase SQL Editor project baru,
-- satu kali saja, sebelum app dicoba.
--
-- Custom Line Name & Departemen mulai KOSONG — diisi sendiri lewat
-- menu Pengaturan (password admin).
-- ============================================================

-- -------------------
-- 1. Henkaten records
-- -------------------
create table henkaten_records (
  id uuid primary key default gen_random_uuid(),
  line_name text not null default '',
  date_start date not null,
  date_finish date not null,
  category text,
  henkaten_info text,
  risk_level text,
  tujuan_henkaten text,
  pic_name text,
  departemen text,
  photo text,
  trial_document text,
  trial_document_name text,
  keterangan text,
  created_by text not null default '',
  created_at timestamptz not null default now()
);

create index henkaten_records_created on henkaten_records (created_at desc);

alter table henkaten_records enable row level security;

-- Aplikasi ini diakses siapa saja yang buka site (antri divisi), admin gate
-- hanya di sisi client untuk menu Pengaturan. Pola permissive memirror
-- perilaku baseline aplikasi asli.
create policy "henkaten records read" on henkaten_records for select using (true);
create policy "henkaten records insert" on henkaten_records for insert with check (true);
create policy "henkaten records update" on henkaten_records for update using (true);
create policy "henkaten records delete" on henkaten_records for delete using (true);

-- ----------------------------
-- 2. Opsi dropdown custom
--    (Line Name & Departemen)
--    Mulai KOSONG — diisi lewat Pengaturan.
-- ----------------------------
create table custom_line_names (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now(),
  unique (name)
);

create table custom_departments (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now(),
  unique (name)
);

alter table custom_line_names enable row level security;
alter table custom_departments enable row level security;

create policy "custom line names all" on custom_line_names for all using (true) with check (true);
create policy "custom departments all" on custom_departments for all using (true) with check (true);

-- ----------
-- 3. Storage
--    Bucket public: foto & dokumen diakses lewat public URL yang
--    disimpan di kolom photo / trial_document.
-- ----------
insert into storage.buckets (id, name, public) values
  ('henkaten_photos', 'henkaten_photos', true),
  ('henkaten_trial_docs', 'henkaten_trial_docs', true);

create policy "henkaten photos public read" on storage.objects for select using (
  bucket_id = 'henkaten_photos'
);
create policy "henkaten photos public upload" on storage.objects for insert with check (
  bucket_id = 'henkaten_photos'
);
create policy "henkaten photos public delete" on storage.objects for delete using (
  bucket_id = 'henkaten_photos'
);

create policy "henkaten trial docs public read" on storage.objects for select using (
  bucket_id = 'henkaten_trial_docs'
);
create policy "henkaten trial docs public upload" on storage.objects for insert with check (
  bucket_id = 'henkaten_trial_docs'
);
create policy "henkaten trial docs public delete" on storage.objects for delete using (
  bucket_id = 'henkaten_trial_docs'
);
