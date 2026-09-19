-- MIGRASI LEDGER: jenis transaksi + channel bayar + setting DANA — tanpa hapus data.
-- Jalankan sekali di Supabase > SQL Editor > Run.
-- Saldo = SUM(topup completed) - SUM(pengeluaran completed), per NIS.

-- 1. Kolom ledger (idempotent)
alter table transactions add column if not exists kind text default 'topup';
alter table transactions add column if not exists payment_channel text;
alter table transactions add column if not exists gateway_ref text;
alter table transactions add column if not exists paid_at timestamptz;

-- 2. Data lama = topup
update transactions set kind = 'topup' where kind is null;

-- 3. Check kind
do $$
begin
  alter table transactions drop constraint if exists transactions_kind_check;
exception when undefined_object then null;
end $$;
alter table transactions add constraint transactions_kind_check
  check (kind in ('topup','pengeluaran'));

create index if not exists idx_trx_kind on transactions(kind);
create index if not exists idx_trx_nis on transactions(nis);

-- 4. Setting tunggal: DANA admin + siap kolom lain
create table if not exists app_settings (
  id int primary key,
  dana_number text default '',
  dana_name text default '',
  dana_qr_url text default '',
  updated_at timestamptz default now(),
  constraint app_settings_single_row check (id = 1)
);
insert into app_settings (id) values (1) on conflict (id) do nothing;

alter table app_settings enable row level security;
grant all on app_settings to anon, authenticated;
drop policy if exists "open all" on app_settings;
create policy "open all" on app_settings for all to anon, authenticated
  using (true) with check (true);

-- Verifikasi
select kind, status, count(*) from transactions group by kind, status order by kind, status;
select id, dana_number, dana_name from app_settings;
