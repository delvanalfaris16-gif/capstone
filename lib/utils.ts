import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
export function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }
export function formatRupiah(n: number) { return Number(n || 0).toLocaleString("id-ID"); }
export function uid(prefix = "id_") {
  return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}
export function todayISO() { return new Date().toISOString().split("T")[0]; }
