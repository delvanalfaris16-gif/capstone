"use client";
import { useEffect, useState } from "react";
import { supabase, type Profile, type Student, type Message, isAdminKasir } from "@/lib/supabase";
import { uid, todayISO } from "@/lib/utils";
import { Card, CardMicroLabel, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Label, Select, Textarea } from "./ui/form";

export function MessagesView({ user }: { user: Profile }) {
  const canDelete = isAdminKasir(user.role);
  const [students, setStudents] = useState<Student[]>([]);
  const [nis, setNis] = useState("");
  const [text, setText] = useState("");
  const [list, setList] = useState<Message[]>([]);
  const [msg, setMsg] = useState<string | null>(null);

  async function load() {
    const { data: st } = await supabase.from("students").select("*");
    setStudents((st ?? []) as Student[]);
    const { data: m } = await supabase.from("messages").select("*").order("created_at", { ascending: false });
    setList((m ?? []) as Message[]);
  }
  useEffect(() => { load(); }, []);

  async function submit() {
    if (!nis || !text.trim()) { setMsg("NIS dan pesan harus diisi"); return; }
    const st = students.find(s => s.nis === nis);
    const { error } = await supabase.from("messages").insert({
      id: uid("msg_"), from_user: user.id, from_name: user.name, nis,
      student_name: st ? `${st.name} (${st.class_name})` : nis,
      message: text.trim(), date: todayISO(), status: "unread",
    });
    setMsg(error ? "Gagal: " + error.message : "Pesan terkirim.");
    if (!error) { setText(""); load(); }
  }

  async function remove(id: string) {
    await supabase.from("messages").delete().eq("id", id);
    load();
  }

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[1fr_1.3fr]">
      <Card>
        <CardMicroLabel>Untuk Admin Kasir</CardMicroLabel>
        <CardTitle className="mt-1">Kirim pesan</CardTitle>
        <div className="mt-4 grid gap-4">
          <div>
            <Label htmlFor="msg-nis">NIS siswa</Label>
            <Select id="msg-nis" value={nis} onChange={e => setNis(e.target.value)}>
              <option value="">Pilih NIS</option>
              {students.map(s => <option key={s.id} value={s.nis}>{s.nis} — {s.name}</option>)}
            </Select>
          </div>
          <div>
            <Label htmlFor="msg-text">Pesan</Label>
            <Textarea id="msg-text" rows={4} value={text} onChange={e => setText(e.target.value)} placeholder="Ketik pesan atau saran..." />
          </div>
          <Button onClick={submit}>Kirim pesan</Button>
          {msg && <p role="status" className="text-sm text-[var(--color-ink-2)]">{msg}</p>}
        </div>
      </Card>
      <div>
        <p className="tnum font-mono text-xs text-[var(--color-ink-3)]">{list.length} pesan</p>
        <div className="mt-2 flex flex-col gap-3">
          {list.length === 0 && (
            <Card><p className="text-sm text-[var(--color-ink-3)]">Belum ada pesan.</p></Card>
          )}
          {list.map(m => (
            <Card key={m.id} className="flex gap-3">
              <span
                aria-hidden
                className={m.status === "unread" ? "w-[3px] shrink-0 rounded-full bg-[var(--color-warning)]" : "w-[3px] shrink-0 rounded-full bg-[var(--color-rule)]"}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="truncate text-sm font-semibold text-[var(--color-ink)]">{m.student_name}</p>
                  <p className="tnum shrink-0 font-mono text-[11px] text-[var(--color-ink-3)]">{m.date}</p>
                </div>
                <p className="mt-1 text-sm leading-relaxed text-[var(--color-ink-2)]">{m.message}</p>
                <p className="mt-2 text-xs text-[var(--color-ink-3)]">Dari {m.from_name}</p>
                {canDelete && (
                  <Button size="sm" variant="ghost" className="mt-2" onClick={() => remove(m.id)}>Hapus</Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
