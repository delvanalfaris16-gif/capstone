import { cn } from "@/lib/utils";

export function Card({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-card)] border border-[var(--color-rule)] bg-[var(--color-paper-2)] p-6",
        className
      )}
      {...p}
    />
  );
}

export function CardMicroLabel({ className, ...p }: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn(
        "text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-ink-3)]",
        className
      )}
      {...p}
    />
  );
}

export function CardTitle({ className, ...p }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2
      className={cn(
        "font-display text-xl font-bold tracking-[-0.02em] text-[var(--color-ink)]",
        className
      )}
      {...p}
    />
  );
}

/** Stat strip cell: hero cells span 2 cols via className. No icon tiles — label + mono figure. */
export function StatCell({
  label,
  value,
  sub,
  className,
}: {
  label: string;
  value: string;
  sub?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-card)] border border-[var(--color-rule)] bg-[var(--color-paper-2)] p-5",
        className
      )}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-ink-3)]">
        {label}
      </p>
      <p className="tnum mt-2 font-mono text-[1.75rem] font-semibold leading-none text-[var(--color-ink)]">
        {value}
      </p>
      {sub && <p className="mt-2 text-xs text-[var(--color-ink-2)]">{sub}</p>}
    </div>
  );
}
