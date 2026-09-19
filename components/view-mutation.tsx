"use client";
import { useEffect, useState } from "react";
import { supabase, type Profile, type Transaction, isAdminKasir, fetchMyChildren } from "@/lib/supabase";
import { todayISO, formatRupiah } from "@/lib/utils";
import { Card, CardMicroLabel } from "./ui/card";
import { Button } from "./ui/button";
import { Select, Input, Label, Textarea } from "./ui/form";
import { TrxItem } from "./ui/trx";

type AdminAction = { id: string; kind: "accept" | "revise" | "refund" };

export function MutationView({ user }: { user: Profile }) {
  const adminKasir = isAdminKasir(user.role);
  const [list, setList] = useState<Transaction[]>([]);
  const [filter, setFilter] = useState("all");
  const [date, setDate] = useState("");
  const [action, setAction] = useState<AdminAction | null>(null);
  const [reason, setReason] = useState("");
  const [correctAmount, setCorrectAmount] = useState("");
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // Ortu: perbaiki & ajukan ulang
  const [fixId, setFixId] = useState<string | null>(null);
  const [fixAmount, setFixAmount] = useState("");
  const [fixNote, setFixNote] = useState("");
  const [fixFile, setFixFile] = useState<File | null>(null);

  async function load() {
    let q = supabase.from("transactions").select("*").order("created_at", { ascending: false });
    if (filter !== "all") q = q.eq("status", filter);
    if (date) q = q.eq("date", date);
    const { data } = await q;
    let all = (data ?? []) as Transaction[];
    // Default-deny: hanya admin_kasir lihat semua.
    // Orang tua: HANYA transaksi untuk NIS anaknya (termasuk pengeluaran admin).
    if (!adminKasir) {
      const kids = await fetchMyChildren(user);
      const nisSet = new Set(kids.map(k => k.nis));
      all = all.filter(t => nisSet.has(t.nis));
    }
    setList(all);
  }
  useEffect(() => { load(); }, [filter, date]);

  function openAction(id: string, kind: AdminAction["kind"], currentAmount: number) {
    setAction({ id, kind });
    setReason("");
    setCorrectAmount(String(currentAmount));
    setActionMsg(null);
  }

  async function runAction() {
    if (!action) return;
    if ((action.kind === "revise" || action.kind === "refund") && !reason.trim()) {
      setActionMsg("Alasan wajib diisi agar orang tua tahu harus apa.");
      return;
    }
    const amountNum = parseInt((correctAmount || "").replace(/\D/g, ""), 10) || 0;
    if (action.kind === "accept" && (!amountNum || amountNum < 1000)) {
      setActionMsg("Nominal koreksi minimal Rp 1.000.");
      return;
    }
    setBusy(true);
    try {
      if (action.kind === "accept") {
        const { error } = await supabase.from("transactions").update({
          status: "completed", amount: amountNum, verified_by: user.id, paid_at: todayISO(),
        }).eq("id", action.id);
        if (error) setActionMsg("Gagal: " + error.message);
        else { setActionMsg(null); setAction(null); load(); }
      } else if (action.kind === "revise") {
        const { error } = await supabase.from("transactions").update({
          status: "revision", reject_reason: reason.trim(),
        }).eq("id", action.id);
        if (error) setActionMsg("Gagal: " + error.message);
        else { setActionMsg(null); setAction(null); load(); }
      } else {
        const { error } = await supabase.from("transactions").update({
          status: "refunded", reject_reason: reason.trim(), refunded_at: todayISO(),
        }).eq("id", action.id);
        if (error) setActionMsg("Gagal: " + error.message);
        else { setActionMsg(null); setAction(null); load(); }
      }
    } finally {
      setBusy(false);
    }
  }

  async function resubmit(t: Transaction) {
    const amountNum = parseInt((fixAmount || "").replace(/\D/g, ""), 10) || 0;
    if (!amountNum || amountNum < 1000) { setActionMsg("Nominal minimal Rp 1.000."); return; }
    setBusy(true);
    try {
      let proofUrl = t.proof_url;
      if (fixFile) {
        if (!fixFile.type.startsWith("image/")) { setActionMsg("Bukti harus berupa gambar."); return; }
        if (fixFile.size > 2 * 1024 * 1024) { setActionMsg("Ukuran bukti maksimal 2MB."); return; }
        const ext = (fixFile.name.split(".").pop() || "jpg").toLowerCase();
        const path = `${t.id}-r.${ext}`;
        const { error: upErr } = await supabase.storage.from("bukti-transfer")
          .upload(path, fixFile, { contentType: fixFile.type, upsert: true });
        if (upErr) { setActionMsg("Upload bukti gagal: " + upErr.message); return; }
        proofUrl = supabase.storage.from("bukti-transfer").getPublicUrl(path).data.publicUrl;
      }
      const { error } = await supabase.from("transactions").update({
        status: "pending", amount: amountNum, note: fixNote.trim(), proof_url: proofUrl,
        reject_reason: null,
      }).eq("id", t.id);
      if (error) setActionMsg("Gagal: " + error.message);
      else { setFixId(null); setFixFile(null); setActionMsg(null); load(); }
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Hapus permanen catatan ini? Hanya untuk data salah/duplikat yang tidak melibatkan uang.")) return;
    await supabase.from("transactions").delete().eq("id", id);
    load();
  }

  const queue = adminKasir ? list.filter(t => t.status === "pending") : [];
  const refunds = adminKasir ? list.filter(t => t.status === "refunded") : [];

  return (
    <div>
      {adminKasir && (filter === "all" && !date) && queue.length > 0 && (
        <Card className="mb-4 border-[var(--color-warning)] px-5 py-4">
          <CardMicroLabel>Perlu divalidasi</CardMicroLabel>
          <p className="tnum mt-1 font-mono text-sm text-[var(--color-ink)]">
            {queue.length} transfer menunggu — cek bukti sebelum Terima.
          </p>
        </Card>
      )}
      <div className="flex flex-wrap gap-2">
        <Select value={filter} onChange={e => setFilter(e.target.value)} className="w-auto" aria-label="Filter status">
          <option value="all">Semua status</option>
          <option value="pending">Menunggu</option>
          <option value="revision">Perlu perbaikan</option>
          <option value="completed">Selesai</option>
          <option value="refunded">Dana dikembalikan</option>
          <option value="cancelled">Dibatalkan (lama)</option>
        </Select>
        <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="tnum w-auto font-mono" aria-label="Filter tanggal" />
        {(filter !== "all" || date) && (
          <Button size="sm" variant="ghost" className="whitespace-nowrap" onClick={() => { setFilter("all"); setDate(""); }}>
            Bersihkan
          </Button>
        )}
      </div>
      <p className="tnum mt-3 font-mono text-xs text-[var(--color-ink-3)]">
        {list.length} transaksi
      </p>
      <Card className="mt-2 px-5 py-2">
        {list.length === 0
          ? <p className="py-4 text-sm text-[var(--color-ink-3)]">Tidak ada data transaksi.</p>
          : list.map(t => (
            <div key={t.id}>
              <TrxItem t={t} actions={
                <>
                  {adminKasir && t.status === "pending" && (
                    <>
                      <Button size="sm" variant="success" onClick={() => openAction(t.id, "accept", t.amount)}>Terima</Button>
                      <Button size="sm" variant="secondary" onClick={() => openAction(t.id, "revise", t.amount)}>Minta perbaikan</Button>
                      <Button size="sm" variant="destructive" onClick={() => openAction(t.id, "refund", t.amount)}>Kembalikan dana</Button>
                    </>
                  )}
                  {adminKasir && (t.status === "cancelled" || t.status === "refunded") && (
                    <Button size="sm" variant="ghost" onClick={() => remove(t.id)}>Hapus</Button>
                  )}
                  {!adminKasir && t.status === "revision" && (
                    <Button size="sm" onClick={() => {
                      setFixId(t.id); setFixAmount(String(t.amount)); setFixNote(t.note || ""); setFixFile(null); setActionMsg(null);
                    }}>
                      Perbaiki & ajukan ulang
                    </Button>
                  )}
                </>
              } />
              {t.reject_reason && (
                <p className="tnum rounded-[var(--radius-input)] bg-[var(--color-paper)] px-3 py-2 font-mono text-xs text-[var(--color-warning)]">
                  Catatan admin: {t.reject_reason}
                </p>
              )}
              {adminKasir && action?.id === t.id && (
                <div className="grid gap-2 rounded-[var(--radius-input)] border border-[var(--color-rule)] p-3">
                  {action.kind === "accept" && (
                    <div>
                      <Label htmlFor={`corr-${t.id}`}>Nominal sesuai bukti (Rp) — boleh dikoreksi</Label>
                      <Input
                        id={`corr-${t.id}`} inputMode="numeric" value={correctAmount}
                        onChange={e => setCorrectAmount(e.target.value.replace(/\D/g, "").slice(0, 12))}
                        className="tnum font-mono"
                      />
                    </div>
                  )}
                  {action.kind !== "accept" && (
                    <div>
                      <Label htmlFor={`reason-${t.id}`}>
                        Alasan {action.kind === "revise" ? "perbaikan" : "pengembalian"} (wajib)
                      </Label>
                      <Textarea
                        id={`reason-${t.id}`} rows={2} value={reason}
                        onChange={e => setReason(e.target.value)}
                        placeholder={action.kind === "revise" ? "Mis. nominal tidak cocok, bukti buram..." : "Mis. salah anak, duplikat terbayar..."}
                      />
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Button size="sm" onClick={runAction} disabled={busy}>
                      {action.kind === "accept" ? "Konfirmasi terima" : action.kind === "revise" ? "Kirim permintaan" : "Tandai dikembalikan"}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setAction(null)}>Batal</Button>
                  </div>
                  {actionMsg && <p role="alert" className="text-sm text-[var(--color-danger)]">{actionMsg}</p>}
                </div>
              )}
              {!adminKasir && fixId === t.id && t.status === "revision" && (
                <div className="grid gap-2 rounded-[var(--radius-input)] border border-[var(--color-rule)] p-3">
                  <div>
                    <Label htmlFor={`fix-amt-${t.id}`}>Nominal (Rp)</Label>
                    <Input
                      id={`fix-amt-${t.id}`} inputMode="numeric" value={fixAmount}
                      onChange={e => setFixAmount(e.target.value.replace(/\D/g, "").slice(0, 12))}
                      className="tnum font-mono"
                    />
                  </div>
                  <div>
                    <Label htmlFor={`fix-note-${t.id}`}>Catatan</Label>
                    <Textarea id={`fix-note-${t.id}`} rows={2} value={fixNote} onChange={e => setFixNote(e.target.value)} />
                  </div>
                  <div>
                    <Label htmlFor={`fix-proof-${t.id}`}>Bukti baru (opsional, maks 2MB)</Label>
                    <Input id={`fix-proof-${t.id}`} type="file" accept="image/*" onChange={e => setFixFile(e.target.files?.[0] ?? null)} />
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => resubmit(t)} disabled={busy}>Ajukan ulang</Button>
                    <Button size="sm" variant="ghost" onClick={() => setFixId(null)}>Batal</Button>
                  </div>
                  {actionMsg && <p role="alert" className="text-sm text-[var(--color-danger)]">{actionMsg}</p>}
                </div>
              )}
            </div>
          ))}
      </Card>
      {adminKasir && refunds.length > 0 && (filter === "all" || filter === "refunded") && !date && (
        <div className="mt-6">
          <CardMicroLabel>Arsip pengembalian</CardMicroLabel>
          <h2 className="font-display mt-1 text-lg font-bold tracking-[-0.02em] text-[var(--color-ink)]">
            Dana dikembalikan
          </h2>
          <Card className="mt-3 px-5 py-2">
            {refunds.map(t => <TrxItem key={t.id} t={t} />)}
          </Card>
        </div>
      )}
    </div>
  );
}
