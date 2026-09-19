"use client";
import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form";
import { Camera, Square } from "lucide-react";

export function QrScanner({ onScan }: { onScan: (nis: string) => void }) {
  const [active, setActive] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const ref = useRef<Html5Qrcode | null>(null);

  async function start() {
    setErr(null);
    try {
      const qr = new Html5Qrcode("qr-reader");
      ref.current = qr;
      await qr.start({ facingMode: "environment" }, { fps: 10, qrbox: { width: 250, height: 250 } },
        (text) => { onScan(text.trim()); },
        () => {});
      setActive(true);
    } catch (e: any) { setErr("Gagal membuka kamera: " + (e?.message ?? e)); }
  }
  async function stop() {
    try { await ref.current?.stop(); } catch {}
    setActive(false);
  }
  useEffect(() => () => { ref.current?.stop().catch(() => {}); }, []);

  return (
    <div>
      <div id="qr-reader" className="mx-auto w-full max-w-[400px] overflow-hidden rounded-[var(--radius-input)] border border-[var(--color-rule)] bg-[var(--color-paper-3)]" />
      {err && <p role="alert" className="mt-2 text-sm text-[var(--color-danger)]">{err}</p>}
      <div className="mt-3 flex justify-center">
        {!active
          ? <Button size="sm" variant="secondary" onClick={start}><Camera aria-hidden="true" /> Hidupkan kamera</Button>
          : <Button size="sm" variant="secondary" onClick={stop}><Square aria-hidden="true" /> Matikan kamera</Button>}
      </div>
    </div>
  );
}

export function ManualQr({ onScan }: { onScan: (nis: string) => void }) {
  const [v, setV] = useState("");
  return (
    <div className="mt-3 flex gap-2">
      <Input value={v} onChange={e => setV(e.target.value)} placeholder="Tempel / ketik hasil QR (NIS)" aria-label="Hasil QR manual" className="tnum font-mono" />
      <Button size="sm" variant="secondary" className="shrink-0 whitespace-nowrap" onClick={() => v.trim() && onScan(v.trim())}>Pakai</Button>
    </div>
  );
}
