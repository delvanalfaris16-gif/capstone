-- SISKA Supabase Schema
-- Cara pakai: Supabase Dashboard > SQL Editor > paste seluruh file ini > Run
-- Auth: JS sederhana (query tabel profiles), jadi RLS dibuka permissive untuk anon.

-- ============ RESET BERSIH (atasi konflik tipe uuid vs text) ============
-- profiles lama Supabase biasanya id=uuid, sedangkan SISKA pakai id=text (usr001).
-- DROP dulu agar CREATE di bawah selalu bertipe text dan FK cocok.
drop table if exists messages cascade;
drop table if exists transactions cascade;
drop table if exists students cascade;
drop table if exists profiles cascade;

-- ============ TABLES ============
create table profiles (
  id text primary key,
  username text unique not null,
  password text not null,
  role text not null check (role in ('admin_kasir','orangtua')),
  name text not null,
  email text,
  subject text,
  children jsonb default '[]'::jsonb,
  permissions jsonb default '["read","write"]'::jsonb,
  created_at timestamptz default now()
);

create table students (
  id text primary key,
  nis text unique not null,
  name text not null,
  class_name text not null,
  -- tanpa FK keras ke profiles(id) agar tahan terhadap profiles lama bertipe uuid.
  -- Relasi dijaga di aplikasi (parent_id = profiles.id secara logika).
  parent_id text,
  parent_name text,
  address text default '',
  phone text default '',
  email text default '',
  created_at timestamptz default now()
);

create table transactions (
  id text primary key,
  date date default current_date,
  from_user text not null,
  from_name text not null,
  to_user text not null,
  to_name text not null,
  nis text not null,
  student_name text not null,
  amount int not null check (amount >= 0),
  note text default '',
  status text not null default 'pending' check (status in ('pending','completed','cancelled','revision','refunded')),
  verified_by text,
  proof_url text,
  reject_reason text,
  refunded_at timestamptz,
  kind text not null default 'topup' check (kind in ('topup','pengeluaran')),
  payment_channel text,
  gateway_ref text,
  paid_at timestamptz,
  created_at timestamptz default now()
);

create table messages (
  id text primary key,
  from_user text not null,
  from_name text not null,
  nis text not null,
  student_name text not null,
  message text not null,
  date date default current_date,
  status text not null default 'unread' check (status in ('unread','read')),
  created_at timestamptz default now()
);

create table if not exists app_settings (
  id int primary key,
  dana_number text default '',
  dana_name text default '',
  dana_qr_url text default '',
  updated_at timestamptz default now(),
  constraint app_settings_single_row check (id = 1)
);

-- ============ INDEXES ============
create index if not exists idx_profiles_username on profiles(username);
create index if not exists idx_profiles_role on profiles(role);
create index if not exists idx_students_nis on students(nis);
create index if not exists idx_students_parent on students(parent_id);
create index if not exists idx_trx_from on transactions(from_user);
create index if not exists idx_trx_to on transactions(to_user);
create index if not exists idx_trx_status on transactions(status);
create index if not exists idx_msg_status on messages(status);

-- ============ RLS + GRANT (permissive, karena auth JS custom) ============
-- PENTING: tabel baru butuh GRANT ke anon/authenticated, kalau tidak
-- query anon selalu "permission denied for table ..." walau policy ada.
alter table profiles enable row level security;
alter table students enable row level security;
alter table transactions enable row level security;
alter table messages enable row level security;
alter table app_settings enable row level security;

grant all on profiles to anon, authenticated;
grant all on students to anon, authenticated;
grant all on transactions to anon, authenticated;
grant all on messages to anon, authenticated;
grant all on app_settings to anon, authenticated;

drop policy if exists "open all" on profiles;
drop policy if exists "open all" on students;
drop policy if exists "open all" on transactions;
drop policy if exists "open all" on messages;
drop policy if exists "open all" on app_settings;

create policy "open all" on profiles for all to anon, authenticated using (true) with check (true);
create policy "open all" on students for all to anon, authenticated using (true) with check (true);
create policy "open all" on transactions for all to anon, authenticated using (true) with check (true);
create policy "open all" on messages for all to anon, authenticated using (true) with check (true);
create policy "open all" on app_settings for all to anon, authenticated using (true) with check (true);

-- ============ SEED (dari data/*.json lama) ============
insert into profiles (id, username, password, role, name, email, subject, children, permissions) values
  ('usr000','admin','123456','admin_kasir','Admin Kasir','admin@example.com',null,'[]','["read","write","delete","manage_users","manage_students","manage_transactions","manage_messages"]'),
  ('usr001','orangtua1','123456','orangtua','Budi Santoso','budi@example.com',null,'["siswa001","siswa002","siswa004"]','["read","write"]'),
  ('usr002','orangtua2','123456','orangtua','Siti Aminah','siti@example.com',null,'["siswa003","siswa005"]','["read","write"]'),
  ('usr005','kasir1','123456','admin_kasir','Rizki Fadli','rizki@example.com',null,'[]','["read","write","verify_transactions"]')
on conflict (id) do nothing;

insert into students (id, nis, name, class_name, parent_id, parent_name, address, phone, email) values
  ('siswa001','0012024001','Ahmad Fauzi','X-IPA-1','usr001','Budi Santoso','Jl. Merdeka No. 10','081234567890','ahmad@example.com'),
  ('siswa002','0012024002','Dian Putri','X-IPA-2','usr001','Budi Santoso','Jl. Pendidikan No. 5','081234567891','dian@example.com'),
  ('siswa003','0012024003','Faisal Rahman','XI-IPS-1','usr002','Siti Aminah','Jl. Melati No. 20','081234567892','faisal@example.com'),
  ('siswa004','0012024004','Siti Khairunnisa','X-IPA-1','usr001','Budi Santoso','Jl. Mawar No. 15','081234567893','khairun@example.com'),
  ('siswa005','0012024005','Rizky Pratama','XI-IPA-1','usr002','Siti Aminah','Jl. Kenanga No. 8','081234567894','rizky@example.com')
on conflict (id) do nothing;

insert into transactions (id, date, from_user, from_name, to_user, to_name, nis, student_name, amount, note, status, verified_by) values
  ('trx_new_1','2026-09-19','usr001','Budi Santoso','usr004','Bu Dina Pratama','0012024001','Ahmad Fauzi',50000,'Uang saku','completed','kasir1'),
  ('trx_new_2','2026-09-19','usr001','Budi Santoso','usr003','Pak Hendra Wijaya','0012024001','Ahmad Fauzi',50000,'Uang makan','pending',null)
on conflict (id) do nothing;

insert into messages (id, from_user, from_name, nis, student_name, message, date, status) values
  ('msg001','usr001','Budi Santoso','0012024001','Ahmad Fauzi','Saya ingin membatasi pengeluaran uang saku Ahmad menjadi maksimal 50.000 per minggu. Mohon diatur oleh pihak sekolah.','2026-09-18','read'),
  ('msg002','usr002','Siti Aminah','0012024003','Faisal Rahman','Tolong pantau penggunaan uang saku Faisal, saya ingin ia belajar mengelola keuangan lebih baik.','2026-09-17','unread')
on conflict (id) do nothing;

insert into app_settings (id, dana_number, dana_name, dana_qr_url) values
  (1, '', '', '')
on conflict (id) do nothing;
