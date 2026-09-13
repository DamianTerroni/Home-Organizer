import type { SupabaseClient } from "@supabase/supabase-js";

export type OnboardingState = { error?: string };

export async function createHousehold(supabase: SupabaseClient, name: string): Promise<OnboardingState> {
  if (!name.trim()) return { error: "Ingresá un nombre para el hogar." };

  const { error } = await supabase.rpc("create_household", { p_name: name.trim() });
  if (error) return { error: error.message };
  return {};
}

export async function joinHousehold(supabase: SupabaseClient, code: string): Promise<OnboardingState> {
  if (!code.trim()) return { error: "Ingresá el código de invitación." };

  const { error } = await supabase.rpc("join_household", { p_invite_code: code.trim() });
  if (error) return { error: "Código inválido. Pedile el código a alguien de tu hogar." };
  return {};
}
