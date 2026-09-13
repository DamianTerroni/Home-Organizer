"use client";

import { useEffect } from "react";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="max-w-sm space-y-4 text-center">
        <h1 className="text-lg font-semibold">Algo falló</h1>
        <p className="text-sm text-black/60 dark:text-white/60">
          Puede haber sido un problema de conexión momentáneo. Probá de nuevo.
        </p>
        <button
          onClick={reset}
          className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white"
        >
          Reintentar
        </button>
      </div>
    </main>
  );
}
