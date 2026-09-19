"use client";
import { useEffect, useState } from "react";
import { supabase, type Profile, type Student, type AppSettings, fetchMyChildren } from "@/lib/supabase";
import { uid, todayISO, formatRupiah } from "@/lib/utils";
import { Card, CardMicroLabel, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input, Label, Select, Textarea } from "./ui/form";

const MIN_AMOUNT = 1000;
const MAX_PROOF_MB = 2;

/** Dipakai tombol "Tambah Uang" dari kartu anak: preselect NIS di form. */
export function requestTopup(nis: string) {
  try { localStorage.setItem("siska_topup_nis", nis); } catch {}
  window.dispatchEvent(new CustomEvent("siska:select-child", { detail: nis }));
}

export function TransferView({ user }: { user: Profile }) {
  if (user.role !== "orangtua") {
    return (
      <Card>
        <CardTitle>Transfer</CardTitle>
        <p className="mt-2 text-sm text-[var(--color-ink-2)]">
          Hanya orang tua yang mengajukan transfer. Admin kasir memvalidasi via Mutasi.
        </p>
      </Card>
    );
  }
  return <ParentTransfer user={user} />;
}

function ParentTransfer({ user }: { user: Profile }) {
  const [nis, setNis] = useState("");
  const [recipientId, setRecipientId] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [recipients, setRecipients] = useState<Profile[]>([]);
  const [children, setChildren] = useState<Student[]>([]);
  const [found, setFound] = useState<Student | null>(null);
  const [proof, setProof] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    supabase.from("profiles").select("*").eq("role", "admin_kasir").then(({ data }) => {
      const list = (data ?? []) as Profile[];
      setRecipients(list);
      if (list.length === 1) setRecipientId(list[0].id);
    });
    supabase.from("app_settings").select("*").eq("id", 1).maybeSingle().then(({ data }) => {
      if (data) setSettings(data as AppSettings);
    });
    fetchMyChildren(user).then(setChildren);
  }, [user.id]);

  // Preselect dari tombol "Tambah Uang" (kartu anak di Beranda).
  useEffect(() => {
    function applyPreset() {
      let key: string | null = null;
      try { key = localStorage.getItem("siska_topup_nis"); localStorage.removeItem("siska_topup_nis"); } catch {}
      if (key && children.some(c => c.nis === key)) pickChild(key);
    }
    applyPreset();
    const h = (e: Event) => {
      const key = (e as CustomEvent<string>).detail;
      if (key && children.some(c => c.nis === key)) pickChild(key);
    };
    window.addEventListener("siska:select-child", h);
    return () => window.removeEventListener("siska:select-child", h);
  }, [children]);

  // Bersihkan object URL preview saat berganti/unmount
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  function pickChild(key: string) {
    const st = children.find(c => c.nis === key) ?? null;
    setNis(key);
    setFound(st);
    if (st) { setOk(true); setMsg("Siswa dipilih: " + st.name + "."); }
  }

  function pickProof(file: File | null) {
    if (!file) { setProof(null); setPreview(null); return; }
    if (!file.type.startsWith("image/")) { setOk(false); setMsg("Bukti harus berupa gambar (JPG/PNG)."); return; }
    if (file.size > MAX_PROOF_MB * 1024 * 1024) {
      setOk(false); setMsg(`Ukuran bukti maksimal ${MAX_PROOF_MB}MB.`);
      return;
    }
    if (preview) URL.revokeObjectURL(preview);
    setProof(file);
    setPreview(URL.createObjectURL(file));
    setMsg(null);
  }

  const amountNum = parseInt((amount || "").replace(/\D/g, ""), 10) || 0;

  async function submit() {
    const key = nis.trim();
    if (!key || !recipientId) { setOk(false); setMsg("Lengkapi data transfer"); return; }
    if (!children.some(c => c.nis === key)) {
      setOk(false); setMsg("NIS harus dipilih dari daftar anak Anda."); return;
    }
    if (!amountNum || amountNum < MIN_AMOUNT) {
      setOk(false); setMsg(`Nominal minimal Rp ${formatRupiah(MIN_AMOUNT)}.`);
      return;
    }
    if (!proof) { setOk(false); setMsg("Wajib lampirkan screenshot bukti transfer."); return; }
    const recipient = recipients.find(t => t.id === recipientId);
    const { data: st } = await supabase.from("students").select("*").eq("nis", key).maybeSingle();
    const studentName = (st as Student | null)?.name ?? found?.name;
    if (!studentName) { setOk(false); setMsg("NIS siswa tidak valid"); return; }

    setUploading(true);
    try {
      const id = uid("trx_");
      const ext = (proof.name.split(".").pop() || "jpg").toLowerCase();
      const path = `${id}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("bukti-transfer")
        .upload(path, proof, { contentType: proof.type, upsert: false });
      if (upErr) { setOk(false); setMsg("Upload bukti gagal: " + upErr.message); return; }
      const { data: pub } = supabase.storage.from("bukti-transfer").getPublicUrl(path);
      const { error } = await supabase.from("transactions").insert({
        id, date: todayISO(), from_user: user.id, from_name: user.name,
        to_user: recipientId, to_name: recipient?.name ?? recipientId, nis: key,
        student_name: studentName, amount: amountNum, note,
        status: "pending", verified_by: null, proof_url: pub.publicUrl,
        kind: "topup", payment_channel: "dana_manual", gateway_ref: null, paid_at: null,
      });
      if (error) { setOk(false); setMsg("Gagal: " + error.message); return; }
      setOk(true);
      setMsg(`Transfer Rp ${formatRupiah(amountNum)} diajukan. Menunggu verifikasi admin kasir.`);
      setNis(""); setAmount(""); setNote(""); setFound(null);
      pickProof(null);
    } finally {
      setUploading(false);
    }
  }

  const lockedRecipient = recipients.find(t => t.id === recipientId) ?? null;
  const noKids = children.length === 0;

  return (
    <div className="max-w-2xl">
      <Card>
        <CardMicroLabel>Nominal bebas · bukti wajib</CardMicroLabel>
        <CardTitle className="mt-1">Kirim transfer</CardTitle>
        <div className="mt-4 grid gap-4">
          <div>
            <Label htmlFor="tf-nis">Anak</Label>
            {children.length > 0 ? (
              <Select id="tf-nis" value={nis} onChange={e => pickChild(e.target.value)}>
                <option value="">Pilih anak</option>
                {children.map(c => <option key={c.nis} value={c.nis}>{c.nis} — {c.name}</option>)}
              </Select>
            ) : (
              <p className="rounded-[var(--radius-input)] border border-[var(--color-warning)] px-4 py-2.5 text-sm text-[var(--color-warning)]">
                Belum ada anak ter-link ke akun ini. Hubungi admin kasir agar NIS anak didaftarkan.
              </p>
            )}
          </div>
          {found && (
            <dl className="grid grid-cols-2 gap-3 rounded-[var(--radius-input)] border border-[var(--color-rule)] p-4 text-sm max-sm:grid-cols-1">
              <div><dt className="text-xs text-[var(--color-ink-3)]">Nama</dt><dd className="font-semibold text-[var(--color-ink)]">{found.name}</dd></div>
              <div><dt className="text-xs text-[var(--color-ink-3)]">Kelas</dt><dd className="tnum font-mono text-[var(--color-ink)]">{found.class_name}</dd></div>
              <div><dt className="text-xs text-[var(--color-ink-3)]">NIS</dt><dd className="tnum font-mono text-[var(--color-ink)]">{found.nis}</dd></div>
              <div><dt className="text-xs text-[var(--color-ink-3)]">Orang tua</dt><dd className="text-[var(--color-ink)]">{found.parent_name}</dd></div>
            </dl>
          )}
          <div className="rounded-[var(--radius-input)] border border-[var(--color-rule)] bg-[var(--color-paper)] p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-ink-3)]">
              Tujuan transfer — DANA admin
            </p>
            {settings?.dana_number ? (
              <div className="mt-2 flex items-start gap-4">
                <div className="min-w-0 flex-1">
                  <p className="tnum font-mono text-lg font-semibold text-[var(--color-ink)]">{settings.dana_number}</p>
                  {settings.dana_name && <p className="text-sm text-[var(--color-ink-2)]">a.n. {settings.dana_name}</p>}
                  <p className="mt-1 text-xs text-[var(--color-ink-3)]">Transfer via aplikasi DANA ke nomor di atas, lalu lampirkan screenshot buktinya di bawah.</p>
                </div>
                {settings.dana_qr_url && (
                  <img src={settings.dana_qr_url} alt="QR DANA admin" className="h-24 w-24 shrink-0 rounded-[var(--radius-input)] border border-[var(--color-rule)]" />
                )}
              </div>
            ) : (
              <p className="mt-2 text-sm text-[var(--color-ink-2)]">Nomor DANA admin belum diatur. Hubungi admin kasir.</p>
            )}
          </div>
          <div>
            <Label htmlFor="tf-amount">Nominal transfer (Rp)</Label>
            <Input
              id="tf-amount" inputMode="numeric" value={amount}
              onChange={e => setAmount(e.target.value.replace(/\D/g, "").slice(0, 12))}
              placeholder={`Minimal ${formatRupiah(MIN_AMOUNT)}`}
              className="tnum font-mono"
            />
            {amountNum > 0 && (
              <p className="tnum mt-1 font-mono text-xs text-[var(--color-ink-2)]">Rp {formatRupiah(amountNum)}</p>
            )}
          </div>
          <div>
            <Label htmlFor="tf-proof">Screenshot bukti transfer DANA (wajib, maks {MAX_PROOF_MB}MB)</Label>
            <Input id="tf-proof" type="file" accept="image/*" onChange={e => pickProof(e.target.files?.[0] ?? null)} />
            {preview && (
              <img src={preview} alt="Pratinjau bukti transfer" className="mt-2 max-h-48 rounded-[var(--radius-input)] border border-[var(--color-rule)]" />
            )}
          </div>
          <div>
            <Label htmlFor="tf-to">Penerima</Label>
            {recipients.length === 1 && lockedRecipient ? (
              <p className="rounded-[var(--radius-input)] border border-[var(--color-rule)] bg-[var(--color-paper)] px-4 py-2.5 text-sm font-semibold text-[var(--color-ink)]">
                {lockedRecipient.name} <span className="font-normal text-[var(--color-ink-3)]">(Admin Kasir — terkunci)</span>
              </p>
            ) : (
              <Select id="tf-to" value={recipientId} onChange={e => setRecipientId(e.target.value)}>
                <option value="">Pilih penerima</option>
                {recipients.map(t => <option key={t.id} value={t.id}>{t.name} (Admin Kasir)</option>)}
              </Select>
            )}
          </div>
          <div>
            <Label htmlFor="tf-note">Catatan</Label>
            <Textarea id="tf-note" value={note} onChange={e => setNote(e.target.value)} rows={3} placeholder="Tambahkan catatan..." />
          </div>
          <Button onClick={submit} disabled={noKids || uploading} aria-busy={uploading}>
            {uploading ? "Mengunggah bukti..." : "Ajukan transfer"}
          </Button>
          {msg && (
            <p role="status" className={ok
              ? "rounded-[var(--radius-input)] border border-[var(--color-success)] px-4 py-2.5 text-sm text-[var(--color-success)]"
              : "rounded-[var(--radius-input)] border border-[var(--color-danger)] px-4 py-2.5 text-sm text-[var(--color-danger)]"}>
              {msg}
            </p>
          )}
        </div>
      </Card>
    </div>
  );
}
