"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type OnboardingState = { error?: string };

export async function createHousehold(
  _prevState: OnboardingState,
  formData: FormData
): Promise<OnboardingState> {
  const supabase = await createClient();
  if (!supabase) return { error: "Supabase no está configurado todavía." };

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Ingresá un nombre para el hogar." };

  const { error } = await supabase.rpc("create_household", { p_name: name });
  if (error) return { error: error.message };

  redirect("/");
}

export async function joinHousehold(
  _prevState: OnboardingState,
  formData: FormData
): Promise<OnboardingState> {
  const supabase = await createClient();
  if (!supabase) return { error: "Supabase no está configurado todavía." };

  const code = String(formData.get("code") ?? "").trim();
  if (!code) return { error: "Ingresá el código de invitación." };

  const { error } = await supabase.rpc("join_household", { p_invite_code: code });
  if (error) return { error: "Código inválido. Pedile el código a alguien de tu hogar." };

  redirect("/");
}
