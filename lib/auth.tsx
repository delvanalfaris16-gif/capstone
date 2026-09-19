"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase, type Profile, normalizeRole } from "./supabase";

type AuthCtx = { user: Profile | null; loading: boolean; login(u: string, p: string): Promise<string | null>; logout(): void; };
const Ctx = createContext<AuthCtx>({ user: null, loading: true, login: async () => "no", logout: () => {} });
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const saved = localStorage.getItem("siska_user");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Normalisasi sesi lama (role admin/kasir)
        parsed.role = normalizeRole(parsed.role);
        setUser(parsed);
      } catch {}
    }
    setLoading(false);
  }, []);

  async function login(username: string, password: string): Promise<string | null> {
    const { data, error } = await supabase.from("profiles")
      .select("*").eq("username", username).eq("password", password).maybeSingle();
    if (error) {
      console.error("[SISKA login]", error.message);
      // Permintaan maaf: tampilkan penyebab asli agar tidak dikira salah password
      if (error.message.includes("permission denied")) {
        return "Database menolak akses (permission denied). Jalankan supabase/fix-rls.sql di SQL Editor, lalu restart npm run dev.";
      }
      if (error.message.includes("Failed to fetch") || error.message.includes("fetch")) {
        return "Gagal terhubung ke Supabase. Cek NEXT_PUBLIC_SUPABASE_URL di .env.local + restart npm run dev. Detail: " + error.message;
      }
      return "Gagal login: " + error.message;
    }
    if (!data) return "Username atau password salah";
    const u: Profile = {
      id: data.id, username: data.username, role: normalizeRole(data.role),
      name: data.name, email: data.email, subject: data.subject,
      children: data.children ?? [], permissions: data.permissions ?? [],
    };
    setUser(u);
    localStorage.setItem("siska_user", JSON.stringify(u));
    return null;
  }

  function logout() {
    setUser(null);
    localStorage.removeItem("siska_user");
    router.push("/");
  }

  return <Ctx.Provider value={{ user, loading, login, logout }}>{children}</Ctx.Provider>;
}
