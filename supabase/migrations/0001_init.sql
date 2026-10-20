-- ============================================================
-- Henkaten Sunter 1 — Supabase init (schema + RLS + storage)
-- Jalankan SEMUA script ini di Supabase SQL Editor project baru,
-- satu kali saja, sebelum app dicoba.
--
-- Beda dengan project lama: default tenant di-hash "Sunter 1" dan
-- custom_line_names/custom_departments mulai KOSONG — line name
-- & departemen ditambahkan sendiri oleh tenant-admin lewat Settings.
-- ============================================================

-- ----------
-- 1. Tenants
-- ----------
create table tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

-- Hanya boleh ada satu tenant default (partial unique index)
create unique index tenants_one_default on tenants ((is_default)) where is_default;

-- Default tenant untuk app ini = Sunter 1.
-- Traffic anonim (belum login) otomatis resolve ke tenant ini.
insert into tenants (name, slug, is_default) values ('Sunter 1', 'sunter-1', true);

alter table tenants enable row level security;

-- Daftar nama tenant tidak sensitif: siapa saja boleh baca (dipakai
-- Navbar untuk indikator nama divisi, dan getDefaultTenantId()).
-- INSERT/UPDATE/DELETE tidak ada policy -> hanya service_role (Netlify
-- Function create-tenant) yang bisa membuat tenant.
create policy "tenants readable by anyone" on tenants for select using (true);

-- -------------------
-- 2. Henkaten records
-- -------------------
create table henkaten_records (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
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

create index henkaten_records_tenant_created on henkaten_records (tenant_id, created_at desc);

alter table henkaten_records enable row level security;

-- Anon (belum login) hanya boleh sentuh tenant default (Sunter 1).
-- User login hanya boleh sentuh tenant yang tercantum di app_metadata
-- JWT-nya (di-set oleh create-user Function, tidak bisa diedit user sendiri).
create policy "henkaten records select own or default" on henkaten_records for select using (
  tenant_id = (select id from tenants where is_default)
  or tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
);

create policy "henkaten records insert own or default" on henkaten_records for insert with check (
  (auth.role() = 'anon' and tenant_id = (select id from tenants where is_default))
  or tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
);

create policy "henkaten records update own or default" on henkaten_records for update using (
  tenant_id = (select id from tenants where is_default)
  or tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
);

create policy "henkaten records delete own or default" on henkaten_records for delete using (
  tenant_id = (select id from tenants where is_default)
  or tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
);

-- ----------------------------
-- 3. Opsi dropdown custom
--    (Line Name & Departemen)
--    Mulai KOSONG per tenant.
-- ----------------------------
create table custom_line_names (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  unique (tenant_id, name)
);

create table custom_departments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  unique (tenant_id, name)
);

alter table custom_line_names enable row level security;
alter table custom_departments enable row level security;

create policy "custom line names select own or default" on custom_line_names for select using (
  tenant_id = (select id from tenants where is_default)
  or tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
);

create policy "custom line names insert own or default" on custom_line_names for insert with check (
  (auth.role() = 'anon' and tenant_id = (select id from tenants where is_default))
  or tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
);

create policy "custom line names delete own or default" on custom_line_names for delete using (
  tenant_id = (select id from tenants where is_default)
  or tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
);

create policy "custom departments select own or default" on custom_departments for select using (
  tenant_id = (select id from tenants where is_default)
  or tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
);

create policy "custom departments insert own or default" on custom_departments for insert with check (
  (auth.role() = 'anon' and tenant_id = (select id from tenants where is_default))
  or tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
);

create policy "custom departments delete own or default" on custom_departments for delete using (
  tenant_id = (select id from tenants where is_default)
  or tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
);

-- ----------
-- 4. Storage
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
