import { Badge } from "./form";
import { formatRupiah } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { channelLabel, type Transaction } from "@/lib/supabase";
import { CheckCircle2, Clock3, XCircle, Minus } from "lucide-react";

export function statusLabel(s: string) {
  if (s === "completed") return "Selesai";
  if (s === "pending") return "Menunggu";
  if (s === "revision") return "Perlu perbaikan";
  if (s === "refunded") return "Dana dikembalikan";
  return "Dibatalkan";
}

function StatusMark({ status }: { status: string }) {
  const cls = "size-3.5 shrink-0";
  if (status === "completed") return <CheckCircle2 aria-hidden="true" className={cn(cls, "text-[var(--color-success)]")} />;
  if (status === "pending" || status === "revision") return <Clock3 aria-hidden="true" className={cn(cls, "text-[var(--color-warning)]")} />;
  return <XCircle aria-hidden="true" className={cn(cls, "text-[var(--color-danger)]")} />;
}

export function TrxItem({ t, actions }: { t: Transaction; actions?: React.ReactNode }) {
  const kind = (t as { kind?: string }).kind ?? "topup";
  const isOut = kind === "pengeluaran";
  const channel = channelLabel((t as { payment_channel?: string | null }).payment_channel ?? null);
  return (
    <div className="flex items-center justify-between gap-4 border-b border-[var(--color-rule)] px-1 py-4 last:border-0 max-md:flex-col max-md:items-start max-md:gap-2">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-[var(--color-ink)]">
          {isOut && <Minus size={14} aria-hidden="true" className="mr-1 inline text-[var(--color-danger)]" />}
          {t.student_name} <span className="font-normal text-[var(--color-ink-3)]">→</span> {t.to_name}
        </p>
        <p className="tnum mt-0.5 font-mono text-xs text-[var(--color-ink-2)]">
          {t.nis} · {t.note || "Tanpa catatan"}{isOut ? " · Pengeluaran" : ""}{channel ? ` · ${channel}` : ""}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-4 max-md:w-full max-md:justify-between">
        <div className="text-right max-md:text-left">
          <p className={cn("tnum font-mono text-base font-semibold", isOut ? "text-[var(--color-danger)]" : "text-[var(--color-ink)]")}>
            {isOut ? "−" : "+"}Rp {formatRupiah(t.amount)}
          </p>
          <p className="tnum font-mono text-[11px] text-[var(--color-ink-3)]">{t.date}</p>
        </div>
        <Badge>
          <StatusMark status={t.status} />
          {statusLabel(t.status)}
        </Badge>
        {t.proof_url && (
          <a
            href={t.proof_url}
            target="_blank"
            rel="noreferrer"
            className="mt-1 inline-block whitespace-nowrap text-xs font-semibold text-[var(--color-accent)] underline-offset-2 hover:underline"
          >
            Lihat bukti
          </a>
        )}
        {actions && <div className="flex gap-2">{actions}</div>}
      </div>
    </div>
  );
}
