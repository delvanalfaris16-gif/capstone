"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/form";
import { HomeView } from "@/components/view-home";
import { TransferView } from "@/components/view-transfer";
import { MutationView } from "@/components/view-mutation";
import { MessagesView } from "@/components/view-messages";
import { ProfileView } from "@/components/view-profile";
import { AdminView } from "@/components/view-admin";
import { Home, ArrowDownUp, User, MessageSquare, Settings, LogOut, GraduationCap } from "lucide-react";
import { roleLabel, normalizeRole, isAdminKasir, supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

const MENUS: Record<string, { id: string; label: string; icon: any }[]> = {
  orangtua: [
    { id: "home", label: "Beranda", icon: Home },
    { id: "transfer", label: "Transfer Uang", icon: ArrowDownUp },
    { id: "profile", label: "Profile", icon: User },
    { id: "mutation", label: "Mutasi Rekening", icon: ArrowDownUp },
    { id: "messages", label: "Pesan & Saran", icon: MessageSquare },
  ],
  admin_kasir: [
    { id: "home", label: "Beranda", icon: Home },
    { id: "admin", label: "Panel Admin Kasir", icon: Settings },
    { id: "mutation", label: "Semua Mutasi", icon: ArrowDownUp },
    { id: "messages", label: "Pesan", icon: MessageSquare },
    { id: "profile", label: "Profile", icon: User },
  ],
};

const VIEW_TITLES: Record<string, { label: string; title: string }> = {
  home: { label: "Ringkasan", title: "Beranda" },
  transfer: { label: "Dana", title: "Transfer" },
  mutation: { label: "Riwayat", title: "Mutasi" },
  messages: { label: "Komunikasi", title: "Pesan" },
  profile: { label: "Akun", title: "Profile" },
  admin: { label: "Kelola", title: "Admin Kasir" },
};

/** Badge notifikasi transfer menunggu — khusus admin kasir. */
function PendingBadge({ onClick }: { onClick: () => void }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    async function load() {
      const { count } = await supabase.from("transactions").select("id", { count: "exact", head: true }).eq("status", "pending");
      setCount(count ?? 0);
    }
    load();
    const i = setInterval(load, 10000);
    return () => clearInterval(i);
  }, []);
  if (count === 0) return null;
  return (
    <button
      onClick={onClick}
      className="tnum whitespace-nowrap rounded-pill border border-[var(--color-warning)] px-3 py-1 font-mono text-[11px] font-semibold text-[var(--color-warning)]"
      aria-label={`${count} transfer menunggu validasi`}
    >
      {count} menunggu
    </button>
  );
}

export default function DashboardPage() {  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const [view, setView] = useState("home");

  useEffect(() => {
    if (!loading && !user) router.push("/");
  }, [loading, user]);

  if (loading || !user) return <p className="p-10 text-sm text-[var(--color-ink-2)]">Memuat...</p>;
  // Role selalu kanonis (normalisasi di auth); fallback aman ke orangtua.
  const roleKey = MENUS[normalizeRole(user.role as string)] ? normalizeRole(user.role as string) : "orangtua";
  const menus = (MENUS[roleKey] ?? []).length > 0 ? MENUS[roleKey] : MENUS.orangtua;
  const head = VIEW_TITLES[view] ?? VIEW_TITLES.home;

  return (
    <div className="min-h-screen bg-[var(--color-paper)]">
      <div className="flex max-md:flex-col">
        <aside className="sticky top-0 flex h-screen w-[248px] shrink-0 flex-col gap-6 border-r border-[var(--color-rule)] bg-[var(--color-paper)] p-5 max-md:static max-md:h-auto max-md:w-full max-md:flex-row max-md:items-center max-md:gap-3 max-md:overflow-x-auto max-md:border-b max-md:border-r-0">
          <div className="flex items-center gap-2.5 px-1 max-md:shrink-0">
            <span className="flex size-9 items-center justify-center rounded-[10px] bg-[var(--color-accent)] text-[var(--color-accent-ink)]">
              <GraduationCap size={18} aria-hidden="true" />
            </span>
            <span className="font-display text-lg font-bold tracking-[-0.02em] text-[var(--color-ink)]">
              SISKA
            </span>
          </div>
          <nav className="flex flex-col gap-1 max-md:flex-row" aria-label="Navigasi utama">
            <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-ink-3)] max-md:hidden">
              Menu
            </p>
            {menus.map(m => {
              const active = view === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => setView(m.id)}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "relative flex items-center gap-3 whitespace-nowrap rounded-[var(--radius-input)] px-3 py-2.5 text-left text-sm transition-colors",
                    active
                      ? "bg-[var(--color-paper-2)] font-semibold text-[var(--color-ink)]"
                      : "text-[var(--color-ink-2)] hover:bg-[var(--color-paper-2)] hover:text-[var(--color-ink)]"
                  )}
                >
                  <span
                    aria-hidden
                    className={cn(
                      "absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full bg-[var(--color-accent)] transition-opacity",
                      active ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <m.icon size={17} aria-hidden="true" className={active ? "text-[var(--color-accent)]" : undefined} />
                  {m.label}
                </button>
              );
            })}
          </nav>
          <div className="mt-auto max-md:hidden">
            <div className="rounded-[var(--radius-input)] border border-[var(--color-rule)] p-3">
              <p className="truncate text-sm font-semibold text-[var(--color-ink)]">{user.name}</p>
              <p className="mt-0.5 text-xs text-[var(--color-ink-3)]">{roleLabel(user.role)}</p>
              <Button size="sm" variant="ghost" className="mt-2 w-full" onClick={logout}>
                <LogOut size={14} aria-hidden="true" /> Keluar
              </Button>
            </div>
          </div>
        </aside>
        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-[var(--z-sticky)] border-b border-[var(--color-rule)] bg-[var(--color-paper)] px-8 py-5 max-md:px-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-ink-3)]">
                  {head.label}
                </p>
                <h1 className="font-display mt-0.5 text-2xl font-bold tracking-[-0.02em] text-[var(--color-ink)]">
                  {head.title}
                </h1>
              </div>
              <div className="flex items-center gap-2">
                {isAdminKasir(user.role) && <PendingBadge onClick={() => setView("mutation")} />}
                <Badge>{roleLabel(user.role)}</Badge>
                <Button size="sm" variant="secondary" className="whitespace-nowrap md:hidden" onClick={logout}>
                  <LogOut size={14} aria-hidden="true" /> Keluar
                </Button>
              </div>
            </div>
          </header>
          <main key={view} className="view-in mx-auto w-full max-w-[1020px] px-8 py-7 max-md:px-4">
            {view === "home" && <HomeView user={user} go={setView} />}
            {view === "transfer" && <TransferView user={user} />}
            {view === "mutation" && <MutationView user={user} />}
            {view === "messages" && <MessagesView user={user} />}
            {view === "profile" && <ProfileView user={user} />}
            {view === "admin" && <AdminView user={user} />}
          </main>
        </div>
      </div>
    </div>
  );
}
