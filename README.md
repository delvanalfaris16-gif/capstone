# SISKA v2 — Next.js + Supabase + shadcn

Refactor penuh dari Express + vanilla + JSON (`_legacy/`) ke Next.js App Router + Supabase + komponen gaya shadcn. Semua fitur 1:1.

## Fitur (semua di `/dashboard` per-role)
- Login JS sederhana (query `profiles` by username+password, session di localStorage)
- Beranda: statistik + warning uang saku + transaksi terakhir (auto-refresh 5 dtk)
- Transfer (orang tua): pilih anak (dropdown, tanpa ketik NIS), nominal bebas (min Rp 1.000), transfer via DANA admin + screenshot bukti **wajib**
- Mutasi: filter status + tanggal; riwayat plus/minus; admin validasi via **Terima (boleh koreksi nominal) / Minta perbaikan (alasan wajib) / Kembalikan dana** — tanpa tombol Tolak; ortu bisa perbaiki & ajukan ulang; badge "menunggu" di header admin
- Saldo anak = total topup PAID − pengeluaran (ledger, per NIS); pengeluaran hanya dicatat admin kasir (cek saldo, tolak jika kurang)
- Pesan & Saran: pilih NIS siswa, kirim, hapus (admin kasir)
- Profile: data akun + anak (relasi `students.parent_id`)
- Panel Admin Kasir: statistik, tambah/hapus user, hapus siswa, cek data orang tua (gabungan hak admin + kasir)

## Setup Supabase (Anda sudah punya project)
1. Buka Supabase Dashboard > SQL Editor > paste isi `supabase/schema.sql` > Run (buat tabel + RLS permissive + seed demo).
2. Project Settings > API > salin URL + anon key ke `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://xyzcompany.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=isi-anon-key-disini
```
3. Akun demo: `admin` (Admin Kasir) / `orangtua1` — pass `123456`. Hanya 2 role: `admin_kasir`, `orangtua`. DB yang sudah jalan, run berurutan sekali: `supabase/migrate-admin-kasir.sql`, `supabase/migrate-bukti-transfer.sql`, `supabase/migrate-ledger.sql`, `supabase/migrate-revision.sql`.

Auth sengaja **JS query biasa** (tanpa Supabase Auth) sesuai request — migrasi 1:1 dari `users.json`.

## Jalankan
```bash
npm install
npm run dev   # http://localhost:3000
npm run build # verifikasi production (sudah lolos)
```

## Struktur
```
app/page.tsx            login
app/dashboard/page.tsx  shell + sidebar per-role
components/view-*.tsx   home, transfer, mutation, messages, profile, admin
components/ui/*         button, card, form, trx (shadcn-style)
components/qr-scanner.tsx
lib/supabase.ts         client + types
lib/auth.tsx            context login/logout
lib/utils.ts
supabase/schema.sql     tabel + seed
_legacy/                backup Express lama
```
