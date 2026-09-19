"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import { GraduationCap, LogIn, ArrowDownUp, ShieldCheck, ReceiptText } from "lucide-react";

const CAPABILITIES = [
  { icon: ArrowDownUp, text: "Transfer Rp 50.000 per transaksi, tercatat rapi" },
  { icon: ShieldCheck, text: "Verifikasi Admin Kasir sebelum dana diteruskan" },
  { icon: ReceiptText, text: "Mutasi dan pesan terpantau real-time" },
];

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!username || !password) { setErr("Username dan password harus diisi"); return; }
    setBusy(true); setErr(null);
    const msg = await login(username.trim(), password);
    setBusy(false);
    if (msg) setErr(msg);
    else router.push("/dashboard");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--color-paper)] p-4">
      <div className="view-in grid w-[920px] max-w-full overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-rule)] bg-[var(--color-paper-2)] max-md:grid-cols-1 md:grid-cols-[1.05fr_1fr]">
        <div className="flex flex-col justify-between gap-10 border-[var(--color-rule)] bg-[var(--color-paper)] p-10 max-md:border-b max-md:p-8 md:border-r">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-[10px] bg-[var(--color-accent)] text-[var(--color-accent-ink)]">
              <GraduationCap size={20} aria-hidden="true" />
            </span>
            <span className="font-display text-xl font-bold tracking-[-0.02em] text-[var(--color-ink)]">
              SISKA
            </span>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-ink-3)]">
              Sistem Pembayaran Sekolah
            </p>
            <h1 className="font-display mt-3 max-w-[16ch] text-balance text-4xl font-bold leading-[1.1] tracking-[-0.02em] text-[var(--color-ink)]">
              Uang saku tercatat, orang tua tenang.
            </h1>
            <ul className="mt-8 flex flex-col gap-4">
              {CAPABILITIES.map(c => (
                <li key={c.text} className="flex items-start gap-3 text-sm text-[var(--color-ink-2)]">
                  <c.icon size={17} aria-hidden="true" className="mt-0.5 shrink-0 text-[var(--color-accent)]" />
                  {c.text}
                </li>
              ))}
            </ul>
          </div>
          <p className="tnum font-mono text-[11px] text-[var(--color-ink-3)]">
            Next.js · Supabase · shadcn
          </p>
        </div>
        <form onSubmit={submit} className="flex flex-col justify-center gap-4 p-10 max-md:p-8">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-ink-3)]">
              Masuk
            </p>
            <h2 className="font-display mt-2 text-2xl font-bold tracking-[-0.02em] text-[var(--color-ink)]">
              Selamat datang kembali
            </h2>
          </div>
          <div>
            <Label htmlFor="login-u">Username</Label>
            <Input id="login-u" value={username} onChange={e => setUsername(e.target.value)} placeholder="admin / orangtua1" autoComplete="username" />
          </div>
          <div>
            <Label htmlFor="login-p">Password</Label>
            <Input id="login-p" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••" autoComplete="current-password" />
          </div>
          {err && (
            <p role="alert" className="rounded-[var(--radius-input)] border border-[var(--color-danger)] px-4 py-2.5 text-sm text-[var(--color-danger)]">
              {err}
            </p>
          )}
          <Button disabled={busy} aria-busy={busy}>
            <LogIn aria-hidden="true" />{busy ? "Memeriksa..." : "Masuk"}
          </Button>
          <Separator />
          <p className="text-xs leading-relaxed text-[var(--color-ink-3)]">
            Demo — <span className="tnum font-mono">admin</span> (Admin Kasir) / <span className="tnum font-mono">orangtua1</span> · sandi <span className="tnum font-mono">123456</span>
          </p>
        </form>
      </div>
    </main>
  );
}
