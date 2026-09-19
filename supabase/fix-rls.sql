-- FIX login "permission denied for table profiles" TANPA hapus data.
-- Jalankan file ini sekali di Supabase > SQL Editor > Run.
-- Penyebab: tabel dibuat tanpa GRANT ke anon, jadi policy saja tidak cukup.

grant all on profiles to anon, authenticated;
grant all on students to anon, authenticated;
grant all on transactions to anon, authenticated;
grant all on messages to anon, authenticated;

drop policy if exists "open all" on profiles;
drop policy if exists "open all" on students;
drop policy if exists "open all" on transactions;
drop policy if exists "open all" on messages;

create policy "open all" on profiles for all to anon, authenticated using (true) with check (true);
create policy "open all" on students for all to anon, authenticated using (true) with check (true);
create policy "open all" on transactions for all to anon, authenticated using (true) with check (true);
create policy "open all" on messages for all to anon, authenticated using (true) with check (true);

-- Verifikasi: harusnya 4 (admin, orangtua1, orangtua2, kasir1)
select count(*) as total_profiles from profiles;
