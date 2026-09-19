"use client";
import { useEffect, useMemo, useState } from "react";
import { supabase, type Profile, type Student, type Transaction, type StudentBalance, type AppSettings, roleLabel, computeBalances } from "@/lib/supabase";
import { uid, todayISO } from "@/lib/utils";
import { formatRupiah } from "@/lib/utils";
import { Card, CardMicroLabel, CardTitle, StatCell } from "./ui/card";
import { Button } from "./ui/button";
import { Input, Label, Select } from "./ui/form";
import { Badge } from "./ui/form";
import { statusLabel } from "./ui/trx";
import { ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";

export function AdminView({ user }: { user: Profile }) {
  const [users, setUsers] = useState<Profile[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [trx, setTrx] = useState<Transaction[]>([]);
  const [parentId, setParentId] = useState("");
  const [parentDetail, setParentDetail] = useState<any>(null);
  const [form, setForm] = useState({ name: "", username: "", password: "", role: "orangtua", email: "" });
  const [kidRows, setKidRows] = useState([{ nis: "", name: "" }]);
  const [balanceQuery, setBalanceQuery] = useState("");
  const [openNis, setOpenNis] = useState<string | null>(null);
  const [expNis, setExpNis] = useState("");
  const [expAmount, setExpAmount] = useState("");
  const [expNote, setExpNote] = useState("");
  const [expMsg, setExpMsg] = useState<string | null>(null);
  const [settings, setSettings] = useState<AppSettings>({ id: 1, dana_number: "", dana_name: "", dana_qr_url: "" });
  const [setMsg, setSetMsg] = useState<string | null>(null);
  const [qrBusy, setQrBusy] = useState(false);

  async function load() {
    const [{ data: u }, { data: s }, { data: t }, { data: st }] = await Promise.all([
      supabase.from("profiles").select("*"),
      supabase.from("students").select("*"),
      supabase.from("transactions").select("*"),
      supabase.from("app_settings").select("*").eq("id", 1).maybeSingle(),
    ]);
    setUsers((u ?? []) as Profile[]);
    setStudents((s ?? []) as Student[]);
    setTrx((t ?? []) as Transaction[]);
    if (st) setSettings(st as AppSettings);
  }
  useEffect(() => { load(); }, []);

  const balances = useMemo(() => computeBalances(trx, students), [trx, students]);
  const filteredBalances = useMemo(() => {
    const q = balanceQuery.trim().toLowerCase();
    if (!q) return balances;
    return balances.filter(b =>
      b.nis.toLowerCase().includes(q) || b.studentName.toLowerCase().includes(q)
    );
  }, [balances, balanceQuery]);
  const totalSaldo = useMemo(() => balances.reduce((s, b) => s + b.balance, 0), [balances]);
  const totalPending = useMemo(() => balances.reduce((s, b) => s + b.pendingTotal, 0), [balances]);

  function trxForNis(nis: string) {
    return trx
      .filter(t => t.nis === nis && t.status !== "cancelled")
      .sort((a, b) => (b.date < a.date ? -1 : 1));
  }

  async function addUser() {
    if (!form.name || !form.username || !form.password) return alert("Lengkapi field");
    const kids = kidRows.map(k => ({ nis: k.nis.trim(), name: k.name.trim() })).filter(k => k.nis);
    if (form.role === "orangtua" && kids.length === 0) {
      return alert("Orang tua wajib punya minimal 1 anak: isi NIS (dan nama). Tanpa NIS, anak tidak bisa di-link.");
    }
    const newId = uid("usr_");
    const { error } = await supabase.from("profiles").insert({
      id: newId, username: form.username, password: form.password,
      role: form.role, name: form.name, email: form.email, children: [], permissions: ["read", "write"],
    });
    if (error) { alert(error.message); return; }
    // Link anak: NIS yang sudah ada -> pindahkan ke ortu baru; NIS baru -> buatkan data siswa.
    const linkedIds: string[] = [];
    for (const k of kids) {
      const { data: existing } = await supabase.from("students").select("id").eq("nis", k.nis).maybeSingle();
      if (existing) {
        const { error: upErr } = await supabase.from("students")
          .update({ parent_id: newId, parent_name: form.name })
          .eq("id", (existing as { id: string }).id);
        if (upErr) { alert("Gagal link NIS " + k.nis + ": " + upErr.message); continue; }
        linkedIds.push((existing as { id: string }).id);
      } else {
        const sid = uid("siswa_");
        const { error: insErr } = await supabase.from("students").insert({
          id: sid, nis: k.nis, name: k.name || "Tanpa nama", class_name: "-",
          parent_id: newId, parent_name: form.name, address: "", phone: "", email: "",
        });
        if (insErr) { alert("Gagal buat siswa NIS " + k.nis + ": " + insErr.message); continue; }
        linkedIds.push(sid);
      }
    }
    if (linkedIds.length > 0) {
      await supabase.from("profiles").update({ children: linkedIds }).eq("id", newId);
    }
    setForm({ name: "", username: "", password: "", role: "orangtua", email: "" });
    setKidRows([{ nis: "", name: "" }]);
    load();
  }
  async function delUser(id: string) { if (confirm("Hapus user?")) { await supabase.from("profiles").delete().eq("id", id); load(); } }
  async function delStudent(id: string) { if (confirm("Hapus siswa?")) { await supabase.from("students").delete().eq("id", id); load(); } }

  /** Catat pengeluaran: saldo = topup − pengeluaran, tolak jika saldo tidak cukup. */
  async function submitExpense(admin: Profile) {
    const key = expNis.trim();
    const amountNum = parseInt((expAmount || "").replace(/\D/g, ""), 10) || 0;
    if (!key) { setExpMsg("Pilih anak dulu."); return; }
    if (!amountNum || amountNum < 1000) { setExpMsg("Nominal minimal Rp 1.000."); return; }
    if (!expNote.trim()) { setExpMsg("Keterangan wajib diisi (mis. jajan kantin)."); return; }
    const st = students.find(s => s.nis === key);
    if (!st) { setExpMsg("NIS tidak terdaftar."); return; }
    const bal = balances.find(b => b.nis === key)?.balance ?? 0;
    if (amountNum > bal) {
      setExpMsg(`Saldo ${st.name} hanya Rp ${formatRupiah(bal)}. Pengeluaran ditolak.`);
      return;
    }
    const { error } = await supabase.from("transactions").insert({
      id: uid("exp_"), date: todayISO(), from_user: admin.id, from_name: admin.name,
      to_user: admin.id, to_name: admin.name, nis: key,
      student_name: st.name, amount: amountNum, note: expNote.trim(),
      status: "completed", verified_by: admin.id, proof_url: null,
      kind: "pengeluaran", payment_channel: null, gateway_ref: null, paid_at: todayISO(),
    });
    if (error) { setExpMsg("Gagal: " + error.message); return; }
    setExpMsg(`Pengeluaran Rp ${formatRupiah(amountNum)} untuk ${st.name} tercatat. Saldo kini Rp ${formatRupiah(bal - amountNum)}.`);
    setExpNis(""); setExpAmount(""); setExpNote("");
    load();
  }

  async function saveSettings() {
    const { error } = await supabase.from("app_settings").upsert({
      id: 1, dana_number: settings.dana_number.trim(), dana_name: settings.dana_name.trim(),
      dana_qr_url: settings.dana_qr_url.trim(),
    });
    setSetMsg(error ? "Gagal: " + error.message : "Data DANA tersimpan. Orang tua langsung melihatnya di form transfer.");
  }

  async function uploadDanaQr(file: File | null) {
    if (!file) return;
    if (!file.type.startsWith("image/")) { setSetMsg("QR harus berupa gambar."); return; }
    if (file.size > 2 * 1024 * 1024) { setSetMsg("Ukuran QR maksimal 2MB."); return; }
    setQrBusy(true);
    try {
      const ext = (file.name.split(".").pop() || "png").toLowerCase();
      const { error } = await supabase.storage.from("bukti-transfer").upload(`dana-qr.${ext}`, file, { contentType: file.type, upsert: true });
      if (error) { setSetMsg("Upload gagal: " + error.message); return; }
      const { data: pub } = supabase.storage.from("bukti-transfer").getPublicUrl(`dana-qr.${ext}`);
      setSettings({ ...settings, dana_qr_url: pub.publicUrl });
      setSetMsg("QR terunggah. Klik Simpan untuk menerapkan.");
    } finally {
      setQrBusy(false);
    }
  }

  async function loadParent() {
    if (!parentId) { setParentDetail(null); return; }
    const p = users.find(u => u.id === parentId);
    const pt = trx.filter(t => t.from_user === parentId);
    const kids = students.filter(s => s.parent_id === parentId);
    const kidRows = kids.map(k => {
      const b = balances.find(x => x.nis === k.nis);
      const sent = pt.filter(t => t.nis === k.nis && t.status === "completed").reduce((s, t) => s + t.amount, 0);
      return { student: k, balance: b?.balance ?? 0, sent };
    });
    setParentDetail({
      p,
      total: pt.reduce((s, t) => s + t.amount, 0),
      count: pt.length,
      kids: kidRows,
      combined: kidRows.reduce((s, k) => s + k.balance, 0),
    });
  }
  useEffect(() => { loadParent(); }, [parentId, trx, users, students, balances]);

  const totalAll = trx.reduce((s, t) => s + t.amount, 0);
  return (
    <div>
      <div className="grid grid-cols-4 gap-3 max-lg:grid-cols-2 max-sm:grid-cols-1">
        <StatCell
          label="Total masuk"
          value={"Rp " + formatRupiah(totalAll)}
          sub={`${trx.length} transaksi · ${users.length} pengguna · ${students.length} siswa`}
          className="col-span-2 max-sm:col-span-1"
        />
        <StatCell label="Saldo semua anak" value={"Rp " + formatRupiah(totalSaldo)} sub="completed per NIS" />
        <StatCell label="Menunggu verifikasi" value={"Rp " + formatRupiah(totalPending)} sub="pending, belum masuk saldo" />
      </div>

      <Card className="mt-4">
        <CardMicroLabel>Index NIS · saldo = total completed</CardMicroLabel>
        <CardTitle className="mt-1">Saldo anak</CardTitle>
        <div className="relative mt-4">
          <Search size={15} aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-ink-3)]" />
          <Input
            value={balanceQuery}
            onChange={e => setBalanceQuery(e.target.value)}
            placeholder="Cari NIS atau nama..."
            aria-label="Cari saldo anak"
            className="tnum pl-10 font-mono"
          />
        </div>
        <ul className="mt-2 max-h-[420px] overflow-auto">
          {filteredBalances.length === 0 && (
            <li className="py-4 text-sm text-[var(--color-ink-3)]">Tidak ada data yang cocok.</li>
          )}
          {filteredBalances.map(b => {
            const open = openNis === b.nis;
            const senders = Object.entries(b.bySender);
            const rows = trxForNis(b.nis);
            return (
              <li key={b.nis} className="border-b border-[var(--color-rule)] last:border-0">
                <button
                  onClick={() => setOpenNis(open ? null : b.nis)}
                  aria-expanded={open}
                  className="flex w-full items-center gap-3 py-3 text-left"
                >
                  <ChevronDown
                    size={16}
                    aria-hidden="true"
                    className={cn("shrink-0 text-[var(--color-ink-3)] transition-transform", open && "rotate-180")}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-[var(--color-ink)]">
                      {b.studentName}
                      {!b.known && (
                        <Badge className="ml-2 border-[var(--color-warning)] text-[var(--color-warning)]">NIS tak dikenal</Badge>
                      )}
                    </p>
                    <p className="tnum truncate font-mono text-xs text-[var(--color-ink-3)]">
                      {b.nis} · {b.className} · {b.parentName}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="tnum font-mono text-sm font-semibold text-[var(--color-ink)]">Rp {formatRupiah(b.balance)}</p>
                    {b.pendingCount > 0 && (
                      <p className="tnum font-mono text-[11px] text-[var(--color-warning)]">+Rp {formatRupiah(b.pendingTotal)} pending</p>
                    )}
                  </div>
                </button>
                {open && (
                  <div className="pb-4 pl-7 pr-1">
                    {senders.length > 0 && (
                      <dl className="grid grid-cols-2 gap-2 max-sm:grid-cols-1">
                        {senders.map(([id, s]) => (
                          <div key={id} className="rounded-[var(--radius-input)] border border-[var(--color-rule)] p-3">
                            <dt className="truncate text-xs text-[var(--color-ink-3)]">Dari {s.name}</dt>
                            <dd className="tnum mt-0.5 font-mono text-sm font-semibold text-[var(--color-ink)]">
                              Rp {formatRupiah(s.total)} <span className="font-normal text-[var(--color-ink-3)]">({s.count}x)</span>
                            </dd>
                          </div>
                        ))}
                      </dl>
                    )}
                    <ul className="mt-2">
                      {rows.map(t => (
                        <li key={t.id} className="flex items-baseline justify-between gap-3 border-b border-[var(--color-rule)] py-2 text-sm last:border-0">
                          <span className="min-w-0 truncate text-[var(--color-ink-2)]">
                            {t.note || "Tanpa catatan"}{" "}
                            <span className="tnum font-mono text-xs text-[var(--color-ink-3)]">{t.date}</span>
                          </span>
                          <span className="tnum shrink-0 font-mono text-[var(--color-ink)]">
                            Rp {formatRupiah(t.amount)} · {statusLabel(t.status)}
                          </span>
                        </li>
                      ))}
                      {rows.length === 0 && (
                        <li className="py-2 text-sm text-[var(--color-ink-3)]">Belum ada transaksi.</li>
                      )}
                    </ul>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </Card>

      <Card className="mt-4">
        <CardMicroLabel>Uang keluar · cek saldo dulu</CardMicroLabel>
        <CardTitle className="mt-1">Catat pengeluaran anak</CardTitle>
        <div className="mt-4 grid gap-3">
          <div>
            <Label htmlFor="exp-nis">Anak</Label>
            <Select id="exp-nis" value={expNis} onChange={e => setExpNis(e.target.value)}>
              <option value="">Pilih anak</option>
              {balances.map(b => {
                const st = students.find(s => s.nis === b.nis);
                if (!st) return null;
                return <option key={b.nis} value={b.nis}>{b.nis} — {b.studentName} (saldo Rp {formatRupiah(b.balance)})</option>;
              })}
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
            <div>
              <Label htmlFor="exp-amount">Nominal keluar (Rp)</Label>
              <Input
                id="exp-amount" inputMode="numeric" value={expAmount}
                onChange={e => setExpAmount(e.target.value.replace(/\D/g, "").slice(0, 12))}
                placeholder="Contoh: 20000" className="tnum font-mono"
              />
            </div>
            <div>
              <Label htmlFor="exp-note">Keterangan (wajib)</Label>
              <Input
                id="exp-note" value={expNote} onChange={e => setExpNote(e.target.value)}
                placeholder="Mis. jajan kantin" maxLength={120}
              />
            </div>
          </div>
          <div><Button size="sm" variant="destructive" onClick={() => submitExpense(user)}>Catat pengeluaran</Button></div>
          {expMsg && <p role="status" className="text-sm text-[var(--color-ink-2)]">{expMsg}</p>}
        </div>
      </Card>

      <Card className="mt-4">
        <CardMicroLabel>Tampil di form transfer orang tua</CardMicroLabel>
        <CardTitle className="mt-1">Penerimaan DANA admin</CardTitle>
        <div className="mt-4 grid gap-3">
          <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
            <div>
              <Label htmlFor="set-dana-num">Nomor DANA</Label>
              <Input
                id="set-dana-num" inputMode="numeric" value={settings.dana_number}
                onChange={e => setSettings({ ...settings, dana_number: e.target.value.replace(/\D/g, "").slice(0, 16) })}
                placeholder="08xxxxxxxxxx" className="tnum font-mono"
              />
            </div>
            <div>
              <Label htmlFor="set-dana-name">Nama pemilik</Label>
              <Input
                id="set-dana-name" value={settings.dana_name}
                onChange={e => setSettings({ ...settings, dana_name: e.target.value })}
                placeholder="Nama di akun DANA" maxLength={80}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="set-dana-qr">QR DANA (opsional)</Label>
            <div className="flex items-center gap-3">
              <Input id="set-dana-qr" type="file" accept="image/*" onChange={e => uploadDanaQr(e.target.files?.[0] ?? null)} className="max-w-xs" />
              {settings.dana_qr_url && (
                <img src={settings.dana_qr_url} alt="QR DANA admin" className="h-16 w-16 rounded-[var(--radius-input)] border border-[var(--color-rule)]" />
              )}
            </div>
          </div>
          <div><Button size="sm" onClick={saveSettings} disabled={qrBusy}>Simpan</Button></div>
          {setMsg && <p role="status" className="text-sm text-[var(--color-ink-2)]">{setMsg}</p>}
        </div>
      </Card>

      <Card className="mt-4">
        <CardMicroLabel>Akun baru</CardMicroLabel>
        <CardTitle className="mt-1">Tambah user</CardTitle>
        <div className="mt-4 grid grid-cols-3 gap-2 max-lg:grid-cols-2 max-sm:grid-cols-1">
          <Input placeholder="Nama lengkap" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} aria-label="Nama lengkap" />
          <Input placeholder="Username" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} aria-label="Username" />
          <Input placeholder="Password" type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} aria-label="Password" />
          <Select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} aria-label="Role">
            <option value="orangtua">Orang Tua</option>
            <option value="admin_kasir">Admin Kasir</option>
          </Select>
          <Input placeholder="Email" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} aria-label="Email" />
        </div>
        {form.role === "orangtua" && (
          <div className="mt-3 rounded-[var(--radius-input)] border border-[var(--color-rule)] p-3">
            <p className="text-xs font-semibold text-[var(--color-ink)]">Anak (wajib ≥ 1) — penentu index saldo & mutasi</p>
            <div className="mt-2 flex flex-col gap-2">
              {kidRows.map((k, i) => (
                <div key={i} className="grid grid-cols-[1fr_1.4fr_auto] gap-2 max-sm:grid-cols-1">
                  <Input
                    placeholder="NIS, cth 0012024006"
                    value={k.nis}
                    onChange={e => setKidRows(kidRows.map((r, j) => j === i ? { ...r, nis: e.target.value } : r))}
                    aria-label={`NIS anak ${i + 1}`}
                    className="tnum font-mono"
                  />
                  <Input
                    placeholder="Nama anak"
                    value={k.name}
                    onChange={e => setKidRows(kidRows.map((r, j) => j === i ? { ...r, name: e.target.value } : r))}
                    aria-label={`Nama anak ${i + 1}`}
                  />
                  {kidRows.length > 1 && (
                    <Button size="sm" variant="ghost" className="whitespace-nowrap" onClick={() => setKidRows(kidRows.filter((_, j) => j !== i))}>
                      Hapus
                    </Button>
                  )}
                </div>
              ))}
            </div>
            <Button size="sm" variant="secondary" className="mt-2" onClick={() => setKidRows([...kidRows, { nis: "", name: "" }])}>
              + Tambah anak
            </Button>
            <p className="mt-2 text-xs text-[var(--color-ink-3)]">NIS yang sudah terdaftar akan dipindahkan ke orang tua ini.</p>
          </div>
        )}
        <Button size="sm" className="mt-3" onClick={addUser}>Simpan user</Button>
      </Card>

      <div className="mt-4 grid grid-cols-2 gap-4 max-lg:grid-cols-1">
        <Card>
          <CardTitle>Pengguna <span className="tnum font-mono text-sm font-normal text-[var(--color-ink-3)]">{users.length}</span></CardTitle>
          <ul className="mt-2 max-h-[320px] overflow-auto">
            {users.map(u => (
              <li key={u.id} className="flex items-center justify-between gap-3 border-b border-[var(--color-rule)] py-2.5 last:border-0">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[var(--color-ink)]">{u.name}</p>
                  <p className="tnum truncate font-mono text-xs text-[var(--color-ink-3)]">{u.username} · {roleLabel(u.role)}</p>
                </div>
                <Button size="sm" variant="ghost" className="shrink-0 whitespace-nowrap" onClick={() => delUser(u.id)}>Hapus</Button>
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <CardTitle>Siswa <span className="tnum font-mono text-sm font-normal text-[var(--color-ink-3)]">{students.length}</span></CardTitle>
          <ul className="mt-2 max-h-[320px] overflow-auto">
            {students.map(s => (
              <li key={s.id} className="flex items-center justify-between gap-3 border-b border-[var(--color-rule)] py-2.5 last:border-0">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[var(--color-ink)]">{s.name}</p>
                  <p className="tnum truncate font-mono text-xs text-[var(--color-ink-3)]">NIS {s.nis} · {s.class_name}</p>
                </div>
                <Button size="sm" variant="ghost" className="shrink-0 whitespace-nowrap" onClick={() => delStudent(s.id)}>Hapus</Button>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card className="mt-4">
        <CardMicroLabel>Detail per orang tua</CardMicroLabel>
        <CardTitle className="mt-1">Cek data orang tua</CardTitle>
        <div className="mt-4">
          <Label htmlFor="ap-parent">Pilih orang tua</Label>
          <Select id="ap-parent" value={parentId} onChange={e => setParentId(e.target.value)}>
            <option value="">— Pilih —</option>
            {users.filter(u => u.role === "orangtua").map(p => <option key={p.id} value={p.id}>{p.name} ({p.username})</option>)}
          </Select>
          {parentDetail?.p && (
            <div className="mt-3">
              <dl className="grid grid-cols-3 gap-3 rounded-[var(--radius-input)] border border-[var(--color-rule)] p-4 max-sm:grid-cols-1">
                <div><dt className="text-xs text-[var(--color-ink-3)]">Total transfer</dt><dd className="tnum mt-0.5 font-mono font-semibold text-[var(--color-ink)]">Rp {formatRupiah(parentDetail.total)}</dd></div>
                <div><dt className="text-xs text-[var(--color-ink-3)]">Transaksi</dt><dd className="tnum mt-0.5 font-mono font-semibold text-[var(--color-ink)]">{parentDetail.count}x</dd></div>
                <div><dt className="text-xs text-[var(--color-ink-3)]">Saldo gabungan anak</dt><dd className="tnum mt-0.5 font-mono font-semibold text-[var(--color-ink)]">Rp {formatRupiah(parentDetail.combined)}</dd></div>
              </dl>
              <ul className="mt-2">
                {parentDetail.kids.map((k: { student: Student; balance: number; sent: number }) => (
                  <li key={k.student.id} className="flex items-baseline justify-between gap-3 border-b border-[var(--color-rule)] py-2.5 last:border-0">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[var(--color-ink)]">{k.student.name}</p>
                      <p className="tnum truncate font-mono text-xs text-[var(--color-ink-3)]">
                        NIS {k.student.nis} · {k.student.class_name} · dikirim ortu ini Rp {formatRupiah(k.sent)}
                      </p>
                    </div>
                    <p className="tnum shrink-0 font-mono text-sm font-semibold text-[var(--color-ink)]">Rp {formatRupiah(k.balance)}</p>
                  </li>
                ))}
                {parentDetail.kids.length === 0 && (
                  <li className="py-2 text-sm text-[var(--color-ink-3)]">Tidak ada data anak.</li>
                )}
              </ul>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
