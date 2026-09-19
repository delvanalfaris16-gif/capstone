-- MIGRASI: hapus role guru (tanpa hapus data transaksi/siswa).
-- Jalankan sekali di Supabase > SQL Editor > Run.
-- Transaksi lama ke guru tetap tersimpan (kolom to_name/nis tidak dihapus),
-- hanya akun login guru yang dihapus.

-- 1. Lepas check lama (nama constraint bisa beda, jadi pakai DO block)
do $$
begin
  alter table profiles drop constraint if exists profiles_role_check;
exception when undefined_object then null;
end $$;

-- 2. Hapus akun guru
delete from profiles where role = 'guru';

-- 3. Pasang check baru (2 role saja)
alter table profiles add constraint profiles_role_check
  check (role in ('admin_kasir','orangtua'));

-- Verifikasi: harusnya hanya admin_kasir/orangtua
select role, count(*) from profiles group by role order by role;
