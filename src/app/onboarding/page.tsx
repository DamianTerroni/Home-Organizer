"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createHousehold, joinHousehold } from "./actions";
import { createClient } from "@/lib/supabase/client";

export default function OnboardingPage() {
  const supabase = createClient();
  const router = useRouter();
  const [tab, setTab] = useState<"create" | "join">("create");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) router.replace("/login");
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    setCreating(true);
    setCreateError(null);
    const result = await createHousehold(supabase, name);
    setCreating(false);
    if (result.error) setCreateError(result.error);
    else router.replace("/");
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    setJoining(true);
    setJoinError(null);
    const result = await joinHousehold(supabase, code);
    setJoining(false);
    if (result.error) setJoinError(result.error);
    else router.replace("/");
  }

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-semibold">Bienvenido/a</h1>
          <p className="text-sm text-black/60 dark:text-white/60">
            Creá tu hogar o unite a uno existente con un código
          </p>
        </div>

        <div className="flex rounded-lg border border-black/10 p-1 dark:border-white/15">
          <button
            onClick={() => setTab("create")}
            className={`flex-1 rounded-md py-2 text-sm font-medium ${
              tab === "create" ? "bg-teal-600 text-white" : "text-black/60 dark:text-white/60"
            }`}
          >
            Crear hogar
          </button>
          <button
            onClick={() => setTab("join")}
            className={`flex-1 rounded-md py-2 text-sm font-medium ${
              tab === "join" ? "bg-teal-600 text-white" : "text-black/60 dark:text-white/60"
            }`}
          >
            Unirme
          </button>
        </div>

        {tab === "create" ? (
          <form onSubmit={handleCreate} className="space-y-3">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              type="text"
              required
              placeholder="Nombre del hogar (ej. Casa de Damian y Julieta)"
              className="w-full rounded-lg border border-black/10 px-3 py-2 dark:border-white/15"
            />
            {createError && <p className="text-sm text-red-600">{createError}</p>}
            <button
              type="submit"
              disabled={creating}
              className="w-full rounded-lg bg-teal-600 py-2 font-medium text-white disabled:opacity-60"
            >
              {creating ? "Creando..." : "Crear hogar"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleJoin} className="space-y-3">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              type="text"
              required
              placeholder="Código de invitación"
              className="w-full rounded-lg border border-black/10 px-3 py-2 uppercase dark:border-white/15"
            />
            {joinError && <p className="text-sm text-red-600">{joinError}</p>}
            <button
              type="submit"
              disabled={joining}
              className="w-full rounded-lg bg-teal-600 py-2 font-medium text-white disabled:opacity-60"
            >
              {joining ? "Uniendo..." : "Unirme al hogar"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
