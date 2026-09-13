"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signUp, type AuthActionState } from "@/app/auth/actions";

const initialState: AuthActionState = {};

export default function SignupPage() {
  const [state, formAction, pending] = useActionState(signUp, initialState);

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <form action={formAction} className="w-full max-w-sm space-y-4">
        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-semibold">Creá tu cuenta</h1>
          <p className="text-sm text-black/60 dark:text-white/60">
            Después vas a poder crear tu hogar o unirte a uno con un código
          </p>
        </div>

        <div className="space-y-3">
          <input
            name="fullName"
            type="text"
            required
            placeholder="Tu nombre"
            className="w-full rounded-lg border border-black/10 px-3 py-2 dark:border-white/15"
          />
          <input
            name="email"
            type="email"
            required
            placeholder="Email"
            className="w-full rounded-lg border border-black/10 px-3 py-2 dark:border-white/15"
          />
          <input
            name="password"
            type="password"
            required
            minLength={6}
            placeholder="Contraseña (mín. 6 caracteres)"
            className="w-full rounded-lg border border-black/10 px-3 py-2 dark:border-white/15"
          />
        </div>

        {state.error && <p className="text-sm text-red-600">{state.error}</p>}

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
