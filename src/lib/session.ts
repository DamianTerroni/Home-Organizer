import type { SupabaseClient, User } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
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

export async function getSession(): Promise<ReadySession | UnconfiguredSession> {
  const supabase = await createClient();
  if (!supabase) return { status: "unconfigured" };

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");

  let household: Household | null = null;
  if (profile.household_id) {
    const { data } = await supabase
      .from("households")
      .select("*")
      .eq("id", profile.household_id)
      .single();
    household = data;
  }

  return { status: "ready", supabase, user, profile: profile as Profile, household };
}

/** Use on pages that require an active household (dashboard, expenses, shopping list). */
export async function requireHousehold() {
  const session = await getSession();
  if (session.status === "unconfigured") return session;
  if (!session.household) redirect("/onboarding");
  return session as ReadySession & { household: Household };
}
