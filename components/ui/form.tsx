import { cn } from "@/lib/utils";

const field =
  "w-full min-h-[44px] rounded-[var(--radius-input)] border border-[var(--color-rule)] bg-[var(--color-paper)] px-4 py-2.5 text-sm text-[var(--color-ink)] placeholder:text-[var(--color-ink-3)] transition-colors hover:border-[var(--color-ink-3)] focus:border-[var(--color-accent)] disabled:cursor-not-allowed disabled:opacity-50";

export function Input({ className, ...p }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(field, "tnum", className)} {...p} />;
}
export function Select({ className, ...p }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn(field, className)} {...p} />;
}
export function Textarea({ className, ...p }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(field, className)} {...p} />;
}
export function Label({ className, ...p }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn("mb-1.5 block text-xs font-medium text-[var(--color-ink-2)]", className)}
      {...p}
    />
  );
}
export function Badge({ className, ...p }: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-pill border border-[var(--color-rule)] px-2.5 py-0.5 text-[11px] font-semibold",
        className
      )}
      {...p}
    />
  );
}
