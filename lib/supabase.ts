import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(url, anon);

export type Role = "admin_kasir" | "orangtua";
/** Kanonikalisasi role: sesi lama (admin/kasir/guru) dipetakan ke role aktif. */
export function normalizeRole(role: string): Role {
  if (role === "admin_kasir" || role === "admin" || role === "kasir") return "admin_kasir";
  return "orangtua";
}
export function isAdminKasir(role: string): boolean {
  return role === "admin_kasir" || role === "admin" || role === "kasir";
}
export function roleLabel(role: string) {
  if (role === "admin_kasir") return "Admin Kasir";
  if (role === "orangtua") return "Orangtua";
  return role.charAt(0).toUpperCase() + role.slice(1);
}
export type Profile = {
  id: string; username: string; password?: string; role: Role;
  name: string; email: string | null; subject: string | null;
  children: string[]; permissions: string[];
};
export type Student = {
  id: string; nis: string; name: string; class_name: string;
  parent_id: string | null; parent_name: string | null;
  address: string; phone: string; email: string;
};
export type TxStatus = "pending" | "completed" | "cancelled" | "revision" | "refunded";
export type Transaction = {
  id: string; date: string; from_user: string; from_name: string;
  to_user: string; to_name: string; nis: string; student_name: string;
  amount: number; note: string; status: TxStatus;
  verified_by: string | null; proof_url: string | null;
  reject_reason: string | null; refunded_at: string | null;
  kind: "topup" | "pengeluaran";
  payment_channel: string | null; gateway_ref: string | null; paid_at: string | null;
};
export type AppSettings = {
  id: number; dana_number: string; dana_name: string; dana_qr_url: string;
};
export function channelLabel(ch: string | null): string | null {
  if (ch === "dana_manual") return "DANA manual";
  if (ch === "qris_gateway") return "QRIS";
  return null;
}
/** Anak milik user: parent_id -> children -> riwayat NIS sendiri. */
export async function fetchMyChildren(user: { id: string; children: string[] }): Promise<Student[]> {
  const { data: byParent } = await supabase.from("students").select("*").eq("parent_id", user.id);
  if (byParent && byParent.length > 0) return byParent as Student[];
  if (user.children?.length > 0) {
    const { data: byIds } = await supabase.from("students").select("*").in("id", user.children);
    if (byIds && byIds.length > 0) return byIds as Student[];
  }
  const { data: own } = await supabase.from("transactions").select("nis,student_name").eq("from_user", user.id);
  const seen = new Map<string, Student>();
  for (const t of (own ?? []) as { nis: string; student_name: string }[]) {
    if (!seen.has(t.nis)) {
      seen.set(t.nis, {
        id: "trx_" + t.nis, nis: t.nis, name: t.student_name, class_name: "-",
        parent_id: user.id, parent_name: "", address: "", phone: "", email: "",
      });
    }
  }
  return Array.from(seen.values());
}
export type Message = {
  id: string; from_user: string; from_name: string; nis: string;
  student_name: string; message: string; date: string; status: "unread" | "read";
};

/** Saldo anak = total topup completed − total pengeluaran completed, per NIS. */
export type StudentBalance = {
  nis: string;
  studentName: string;
  className: string;
  parentId: string | null;
  parentName: string;
  known: boolean;
  completedTotal: number;
  completedCount: number;
  spentTotal: number;
  spentCount: number;
  pendingTotal: number;
  pendingCount: number;
  balance: number;
  /** Total topup completed per pengirim (id -> { nama, total, count }) */
  bySender: Record<string, { name: string; total: number; count: number }>;
};

export function computeBalances(transactions: Transaction[], students: Student[]): StudentBalance[] {
  const byNis = new Map<string, StudentBalance>();
  const studentByNis = new Map(students.map(s => [s.nis, s]));

  function row(nis: string): StudentBalance {
    let r = byNis.get(nis);
    if (!r) {
      const st = studentByNis.get(nis);
      r = {
        nis,
        studentName: st?.name ?? "NIS tak dikenal",
        className: st?.class_name ?? "—",
        parentId: st?.parent_id ?? null,
        parentName: st?.parent_name ?? "—",
        known: !!st,
        completedTotal: 0, completedCount: 0,
        spentTotal: 0, spentCount: 0,
        pendingTotal: 0, pendingCount: 0,
        balance: 0, bySender: {},
      };
      byNis.set(nis, r);
    }
    return r;
  }

  for (const t of transactions) {
    if (t.status === "cancelled") continue;
    const kind = (t as { kind?: string }).kind ?? "topup";
    const r = row(t.nis);
    if (t.status === "completed") {
      if (kind === "pengeluaran") {
        r.spentTotal += t.amount;
        r.spentCount += 1;
      } else {
        r.completedTotal += t.amount;
        r.completedCount += 1;
        const s = r.bySender[t.from_user] ?? { name: t.from_name, total: 0, count: 0 };
        s.total += t.amount;
        s.count += 1;
        r.bySender[t.from_user] = s;
      }
    } else if (t.status === "pending" && kind === "topup") {
      r.pendingTotal += t.amount;
      r.pendingCount += 1;
    }
  }
  // Siswa tanpa transaksi tetap tampil dengan saldo 0
  for (const st of students) row(st.nis);

  const out = Array.from(byNis.values());
  for (const r of out) r.balance = r.completedTotal - r.spentTotal;
  out.sort((a, b) => b.balance - a.balance);
  return out;
}
