"use client";
import { useEffect, useState } from "react";
import { supabase, type Profile, type Student, roleLabel } from "@/lib/supabase";
import { Card } from "./ui/card";
import { Badge } from "./ui/form";

export function ProfileView({ user }: { user: Profile }) {
  const [children, setChildren] = useState<Student[]>([]);
  useEffect(() => {
    if (user.children?.length) {
      supabase.from("students").select("*").in("id", user.children).then(({ data }) => setChildren((data ?? []) as Student[]));
    }
  }, [user]);
  return (
    <Card>
      <div className="flex items-center gap-5">
        <span aria-hidden className="font-display flex size-16 shrink-0 items-center justify-center rounded-full bg-[var(--color-accent)] text-2xl font-bold text-[var(--color-accent-ink)]">
          {user.name.charAt(0)}
        </span>
        <div className="min-w-0">
          <h2 className="font-display truncate text-xl font-bold tracking-[-0.02em] text-[var(--color-ink)]">
            {user.name}
          </h2>
          <p className="truncate text-sm text-[var(--color-ink-2)]">{user.email}</p>
          <Badge className="mt-2">{roleLabel(user.role)}</Badge>
        </div>
      </div>
      <dl className="mt-6 grid grid-cols-2 gap-3 max-sm:grid-cols-1">
        <div className="rounded-[var(--radius-input)] border border-[var(--color-rule)] p-3.5">
          <dt className="text-xs text-[var(--color-ink-3)]">ID akun</dt>
          <dd className="tnum mt-0.5 font-mono text-sm text-[var(--color-ink)]">{user.id}</dd>
        </div>
        <div className="rounded-[var(--radius-input)] border border-[var(--color-rule)] p-3.5">
          <dt className="text-xs text-[var(--color-ink-3)]">Username</dt>
          <dd className="mt-0.5 text-sm font-semibold text-[var(--color-ink)]">{user.username}</dd>
        </div>
        {children.map(c => (
          <div key={c.id} className="rounded-[var(--radius-input)] border border-[var(--color-rule)] p-3.5">
            <dt className="text-xs text-[var(--color-ink-3)]">Anak — {c.name}</dt>
            <dd className="tnum mt-0.5 font-mono text-sm text-[var(--color-ink)]">NIS {c.nis} · {c.class_name}</dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}
