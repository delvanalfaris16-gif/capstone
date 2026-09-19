"use client";
import { useEffect, useState } from "react";
import { supabase, type Profile, type Student, type StudentBalance, type Transaction, isAdminKasir, fetchMyChildren, computeBalances } from "@/lib/supabase";
import { formatRupiah } from "@/lib/utils";
import { Card, CardMicroLabel, StatCell } from "./ui/card";
import { TrxItem } from "./ui/trx";
import { Button } from "./ui/button";
import { TriangleAlert, Plus } from "lucide-react";
import { requestTopup } from "./view-transfer";

export function HomeView({ user, go }: { user: Profile; go: (v: string) => void }) {
  const [stats, setStats] = useState({ total: 0, pending: 0, totalIn: 0, unread: 0, spent: 0 });
  const [recent, setRecent] = useState<Transaction[]>([]);
  const [warning, setWarning] = useState(false);
  const [kidBalances, setKidBalances] = useState<{ student: Student; balance: StudentBalance | undefined }[]>([]);
  const isParent = user.role === "orangtua";

  async function load() {
    const { data: trx } = await supabase.from("transactions").select("*").order("created_at", { ascending: false });
    const { data: msgs } = await supabase.from("messages").select("id,status");
    const all: Transaction[] = (trx ?? []) as Transaction[];
    // Default-deny: hanya admin_kasir lihat semua.
    // Orang tua: HANYA transaksi untuk NIS anaknya (termasuk pengeluaran admin).
    let filtered = all;
    if (!isAdminKasir(user.role)) {
      const kids = await fetchMyChildren(user);
      const nisSet = new Set(kids.map(k => k.nis));
      filtered = all.filter(t => nisSet.has(t.nis));
      const balances = computeBalances(all, kids);
      setKidBalances(kids.map(k => ({ student: k, balance: balances.find(b => b.nis === k.nis) })));
    }
    const isTopup = (t: Transaction) => ((t as { kind?: string }).kind ?? "topup") === "topup";
    const pending = filtered.filter(t => t.status === "pending").length;
    const completedSum = filtered.filter(t => t.status === "completed" && isTopup(t)).reduce((s, t) => s + t.amount, 0);
    const spentSum = filtered.filter(t => t.status === "completed" && !isTopup(t)).reduce((s, t) => s + t.amount, 0);
    const allSum = filtered.filter(isTopup).reduce((s, t) => s + t.amount, 0);
    const unread = (msgs ?? []).filter(m => m.status === "unread").length;
    setStats({ total: filtered.length, pending, totalIn: isParent ? allSum : completedSum, unread, spent: spentSum });
    setRecent(filtered.slice(0, 5));
    if (isParent) setWarning(completedSum >= 25000 && completedSum < 500000);
  }
  useEffect(() => { load(); const i = setInterval(load, 5000); return () => clearInterval(i); }, []);

  function topup(nis: string) {
    requestTopup(nis);
    go("transfer");
  }

  return (
    <div>
      {isParent && kidBalances.length > 0 && (
        <div className="mb-8">
          <CardMicroLabel>Halo, Bapak/Ibu</CardMicroLabel>
          <h2 className="font-display mt-1 text-lg font-bold tracking-[-0.02em] text-[var(--color-ink)]">
            Saldo anak
          </h2>
          <div className="mt-3 grid grid-cols-3 gap-3 max-lg:grid-cols-2 max-sm:grid-cols-1">
            {kidBalances.map(({ student: k, balance: b }) => (
              <Card key={k.nis} className="flex flex-col gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[var(--color-ink)]">{k.name}</p>
                  <p className="tnum truncate font-mono text-xs text-[var(--color-ink-3)]">NIS {k.nis} · {k.class_name}</p>
                </div>
                <p className="tnum font-mono text-2xl font-semibold text-[var(--color-ink)]">
                  Rp {formatRupiah(b?.balance ?? 0)}
                </p>
                {(b?.pendingCount ?? 0) > 0 && (
                  <p className="tnum font-mono text-xs text-[var(--color-warning)]">
                    +Rp {formatRupiah(b!.pendingTotal)} menunggu verifikasi
                  </p>
                )}
                <Button size="sm" className="mt-auto w-full" onClick={() => topup(k.nis)}>
                  <Plus size={14} aria-hidden="true" /> Tambah Uang
                </Button>
              </Card>
            ))}
          </div>
        </div>
      )}
      <div className="grid grid-cols-4 gap-3 max-lg:grid-cols-2 max-sm:grid-cols-1">
        <StatCell
          label="Total diterima"
          value={"Rp " + formatRupiah(stats.totalIn)}
          sub={isParent && stats.spent > 0
            ? `${stats.total} transaksi · keluar Rp ${formatRupiah(stats.spent)}`
            : `${stats.total} transaksi · ${stats.pending} menunggu`}
          className="col-span-2 max-sm:col-span-1"
        />
        <StatCell label="Menunggu verifikasi" value={String(stats.pending)} />
        <StatCell label="Pesan belum dibaca" value={String(stats.unread)} />
      </div>
      {warning && (
        <div className="mt-4 flex items-center gap-4 rounded-[var(--radius-card)] border border-[var(--color-danger)] p-4">
          <TriangleAlert size={20} aria-hidden="true" className="shrink-0 text-[var(--color-danger)]" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-[var(--color-ink)]">Uang saku hampir habis</p>
            <p className="mt-0.5 text-sm text-[var(--color-ink-2)]">Pengeluaran menyentuh Rp 25.000. Segera transfer lagi.</p>
          </div>
          <Button size="sm" variant="destructive" className="shrink-0 whitespace-nowrap" onClick={() => go("transfer")}>Transfer</Button>
        </div>
      )}
      <div className="mt-8">
        <CardMicroLabel>Terakhir</CardMicroLabel>
        <h2 className="font-display mt-1 text-lg font-bold tracking-[-0.02em] text-[var(--color-ink)]">
          Transaksi terbaru
        </h2>
        <Card className="mt-3 px-5 py-2">
          {recent.length === 0
            ? <p className="py-4 text-sm text-[var(--color-ink-3)]">Belum ada transaksi.</p>
            : recent.map(t => <TrxItem key={t.id} t={t} />)}
        </Card>
      </div>
    </div>
  );
}
