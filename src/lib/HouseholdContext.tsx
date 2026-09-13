"use client";

import type { SupabaseClient, User } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Household, Profile } from "@/lib/types";

type ReadyState = {
  status: "ready";
  supabase: SupabaseClient;
  user: User;
  profile: Profile;
  household: Household;
};

type Ready = ReadyState & { refresh: () => Promise<void> };

const HouseholdContext = createContext<Ready | null>(null);

export function useHousehold(): Ready {
  const ctx = useContext(HouseholdContext);
  if (!ctx) throw new Error("useHousehold must be used within HouseholdProvider");
  return ctx;
}

/**
 * Reemplaza al viejo middleware + Server Components: valida sesión y hogar
 * enteramente en el navegador, hablando directo con Supabase. Así ninguna
 * navegación depende de una función serverless de Vercel (sin cold starts).
 */
export default function HouseholdProvider({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const router = useRouter();
  const [state, setState] = useState<{ status: "loading" } | { status: "unconfigured" } | ReadyState>({
    status: "loading",
  });

  const load = useCallback(async () => {
    if (!supabase) {
      setState({ status: "unconfigured" });
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.replace("/login");
      return;
    }

    const { data: row } = await supabase
      .from("profiles")
      .select("*, households(*)")
      .eq("id", user.id)
      .single();

    if (!row) {
      router.replace("/login");
      return;
    }

    const { households, ...profile } = row as Profile & { households: Household | null };

    if (!households) {
      router.replace("/onboarding");
      return;
    }

    setState({ status: "ready", supabase, user, profile: profile as Profile, household: households });
  }, [supabase, router]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial session check on mount, not derived-state sync.
    load();
    if (!supabase) return;
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") router.replace("/login");
    });
    return () => sub.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (state.status === "unconfigured") {
    return (
      <p className="p-6 text-sm text-black/50 dark:text-white/50">Supabase no está configurado.</p>
    );
  }

  if (state.status === "loading") {
    return (
      <main className="flex flex-1 items-center justify-center">
        <p className="text-sm text-black/40 dark:text-white/40">Cargando...</p>
      </main>
    );
  }

  return (
    <HouseholdContext.Provider value={{ ...state, refresh: load }}>{children}</HouseholdContext.Provider>
  );
}
