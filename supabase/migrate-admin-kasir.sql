-- MIGRASI: gabung role admin + kasir -> admin_kasir + hapus role guru (tanpa hapus data transaksi/siswa).
-- Jalankan sekali di Supabase > SQL Editor > Run.
-- (Menggantikan migrate-remove-guru.sql yang terpisah — cukup run file ini saja.)

-- 1. Lepas check lama (namanya bisa beda, jadi drop pakai DO block)
do $$
begin
  alter table profiles drop constraint if exists profiles_role_check;
exception when undefined_object then null;
end $$;

-- 2. Pindahkan data lama ke role baru + hapus akun guru
update profiles set role = 'admin_kasir' where role in ('admin', 'kasir');
delete from profiles where role = 'guru';

-- 3. Pasang check baru (2 role saja)
alter table profiles add constraint profiles_role_check
  check (role in ('admin_kasir','orangtua'));

-- Verifikasi: harusnya tiap role hanya admin_kasir/orangtua
select role, count(*) from profiles group by role order by role;
