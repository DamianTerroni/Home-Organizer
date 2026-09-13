"use client";

import { useActionState, useState } from "react";
import { createHousehold, joinHousehold, type OnboardingState } from "./actions";

const initialState: OnboardingState = {};

export default function OnboardingPage() {
  const [tab, setTab] = useState<"create" | "join">("create");
  const [createState, createAction, creating] = useActionState(createHousehold, initialState);
  const [joinState, joinAction, joining] = useActionState(joinHousehold, initialState);

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
          <form action={createAction} className="space-y-3">
            <input
              name="name"
              type="text"
              required
              placeholder="Nombre del hogar (ej. Casa de Damian y Julieta)"
              className="w-full rounded-lg border border-black/10 px-3 py-2 dark:border-white/15"
            />
            {createState.error && <p className="text-sm text-red-600">{createState.error}</p>}
            <button
              type="submit"
              disabled={creating}
              className="w-full rounded-lg bg-teal-600 py-2 font-medium text-white disabled:opacity-60"
            >
              {creating ? "Creando..." : "Crear hogar"}
            </button>
          </form>
        ) : (
          <form action={joinAction} className="space-y-3">
            <input
              name="code"
              type="text"
              required
              placeholder="Código de invitación"
              className="w-full rounded-lg border border-black/10 px-3 py-2 uppercase dark:border-white/15"
            />
            {joinState.error && <p className="text-sm text-red-600">{joinState.error}</p>}
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
