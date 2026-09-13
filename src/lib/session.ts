import type { SupabaseClient, User } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Household, Profile } from "@/lib/types";

type ReadySession = {
  status: "ready";
  supabase: SupabaseClient;
  user: User;
  profile: Profile;
  household: Household | null;
};

type UnconfiguredSession = { status: "unconfigured" };

// cache() dedupes this across the layout + page calling it in the same request.
export const getSession = cache(async (): Promise<ReadySession | UnconfiguredSession> => {
  const supabase = await createClient();
  if (!supabase) return { status: "unconfigured" };

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: row } = await supabase
    .from("profiles")
    .select("*, households(*)")
    .eq("id", user.id)
    .single();

  if (!row) redirect("/login");

  const { households, ...profile } = row as Profile & { households: Household | null };

  return { status: "ready", supabase, user, profile: profile as Profile, household: households ?? null };
});

/** Use on pages that require an active household (dashboard, expenses, shopping list). */
export async function requireHousehold() {
  const session = await getSession();
  if (session.status === "unconfigured") return session;
  if (!session.household) redirect("/onboarding");
  return session as ReadySession & { household: Household };
}
