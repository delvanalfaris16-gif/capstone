-- MIGRASI: bukti transfer wajib (screenshot) — tanpa hapus data.
-- Jalankan sekali di Supabase > SQL Editor > Run.
-- 1) kolom proof_url, 2) bucket storage publik, 3) policy permisif (seperti tabel).

alter table transactions add column if not exists proof_url text;

insert into storage.buckets (id, name, public)
values ('bukti-transfer', 'bukti-transfer', true)
on conflict (id) do update set public = true;

drop policy if exists "bukti upload" on storage.objects;
drop policy if exists "bukti read" on storage.objects;
drop policy if exists "bukti delete" on storage.objects;

create policy "bukti upload" on storage.objects
  for insert to anon, authenticated with check (bucket_id = 'bukti-transfer');
create policy "bukti read" on storage.objects
  for select to anon, authenticated using (bucket_id = 'bukti-transfer');
create policy "bukti delete" on storage.objects
  for delete to anon, authenticated using (bucket_id = 'bukti-transfer');
