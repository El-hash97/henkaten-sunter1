-- ============================================================
-- Henkaten Sunter 1 — Neon init (single division, data kosong)
-- Jalankan sekali di project Neon baru.
--
-- Catatan: akses database lewat serverless function (server-side),
-- jadi RLS tidak dipakai. Foto & dokumen disimpan di Neon Object
-- Storage (bucket public_read: henkaten-photos, henkaten-trial-docs).
--
-- Custom Line Name & Departemen mulai KOSONG — diisi sendiri lewat
-- menu Pengaturan (password admin).
-- ============================================================

-- -------------------
-- 1. Henkaten records
-- -------------------
create table if not exists henkaten_records (
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

create index if not exists henkaten_records_created on henkaten_records (created_at desc);

-- ----------------------------
-- 2. Opsi dropdown custom
--    (Line Name & Departemen)
--    Mulai KOSONG — diisi lewat Pengaturan.
-- ----------------------------
create table if not exists custom_line_names (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now(),
  unique (name)
);

create table if not exists custom_departments (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now(),
  unique (name)
);
