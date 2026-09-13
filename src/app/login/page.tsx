"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signIn, type AuthActionState } from "@/app/auth/actions";

const initialState: AuthActionState = {};

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(signIn, initialState);

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <form action={formAction} className="w-full max-w-sm space-y-4">
        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-semibold">Hogar</h1>
          <p className="text-sm text-black/60 dark:text-white/60">
            Ingresá para ver los gastos y aportes de la casa
          </p>
        </div>

        <div className="space-y-3">
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
            placeholder="Contraseña"
            className="w-full rounded-lg border border-black/10 px-3 py-2 dark:border-white/15"
          />
        </div>

        {state.error && <p className="text-sm text-red-600">{state.error}</p>}

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-lg bg-teal-600 py-2 font-medium text-white disabled:opacity-60"
        >
          {pending ? "Ingresando..." : "Ingresar"}
        </button>

        <p className="text-center text-sm text-black/60 dark:text-white/60">
          ¿No tenés cuenta?{" "}
          <Link href="/signup" className="font-medium text-teal-600">
            Creá una
          </Link>
        </p>
      </form>
    </main>
  );
}
