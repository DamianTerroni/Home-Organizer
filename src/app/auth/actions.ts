import type { SupabaseClient } from "@supabase/supabase-js";

export type AuthActionState = { error?: string };

export async function signIn(
  supabase: SupabaseClient,
  email: string,
  password: string
): Promise<AuthActionState> {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: "Email o contraseña incorrectos." };
  return {};
}

export async function signUp(
  supabase: SupabaseClient,
  fullName: string,
  email: string,
  password: string
): Promise<AuthActionState> {
  if (!fullName.trim()) return { error: "Ingresá tu nombre." };
  if (password.length < 6) return { error: "La contraseña debe tener al menos 6 caracteres." };

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName.trim() } },
  });

  if (error) return { error: error.message };
  return {};
}

export async function signOut(supabase: SupabaseClient) {
  await supabase.auth.signOut();
}
