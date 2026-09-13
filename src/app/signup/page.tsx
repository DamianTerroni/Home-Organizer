"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { signUp } from "@/app/auth/actions";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const supabase = createClient();
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) router.replace("/");
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) {
      setError("Supabase no está configurado todavía.");
      return;
    }
    setPending(true);
    setError(null);
    const result = await signUp(supabase, fullName, email, password);
    setPending(false);
    if (result.error) setError(result.error);
    else router.replace("/onboarding");
  }

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-semibold">Creá tu cuenta</h1>
          <p className="text-sm text-black/60 dark:text-white/60">
            Después vas a poder crear tu hogar o unirte a uno con un código
          </p>
        </div>

        <div className="space-y-3">
          <input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            type="text"
            required
            placeholder="Tu nombre"
            className="w-full rounded-lg border border-black/10 px-3 py-2 dark:border-white/15"
          />
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            required
            placeholder="Email"
            className="w-full rounded-lg border border-black/10 px-3 py-2 dark:border-white/15"
          />
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            required
            minLength={6}
            placeholder="Contraseña (mín. 6 caracteres)"
            className="w-full rounded-lg border border-black/10 px-3 py-2 dark:border-white/15"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-lg bg-teal-600 py-2 font-medium text-white disabled:opacity-60"
        >
          {pending ? "Creando..." : "Crear cuenta"}
        </button>

        <p className="text-center text-sm text-black/60 dark:text-white/60">
          ¿Ya tenés cuenta?{" "}
          <Link href="/login" className="font-medium text-teal-600">
            Ingresá
          </Link>
        </p>
      </form>
    </main>
  );
}
