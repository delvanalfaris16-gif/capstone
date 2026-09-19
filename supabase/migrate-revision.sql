-- MIGRASI DESAIN B: hapus jalan buntu "Tolak", ganti alur non-destruktif — tanpa hapus data.
-- Jalankan sekali di Supabase > SQL Editor > Run.
-- pending -> completed (Terima, boleh koreksi nominal) | revision (Minta perbaikan) | refunded (Kembalikan dana)
-- Baris cancelled LAMA dibiarkan historis apa adanya.

do $$
begin
  alter table transactions drop constraint if exists transactions_status_check;
exception when undefined_object then null;
end $$;
alter table transactions add constraint transactions_status_check
  check (status in ('pending','completed','cancelled','revision','refunded'));

alter table transactions add column if not exists reject_reason text;
alter table transactions add column if not exists refunded_at timestamptz;

create index if not exists idx_trx_status on transactions(status);

-- Verifikasi
select status, count(*) from transactions group by status order by status;
