import { cn } from "@/lib/utils";
export function Separator({ className }: { className?: string }) {
  return <hr className={cn("border-0 border-t border-[var(--color-rule)]", className)} />;
}
