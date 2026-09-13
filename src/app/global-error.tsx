"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="es">
      <body style={{ background: "#0a0a0a", color: "#ededed" }}>
        <main
          style={{
            display: "flex",
            minHeight: "100vh",
            alignItems: "center",
            justifyContent: "center",
            padding: "1.5rem",
          }}
        >
          <div style={{ maxWidth: 320, textAlign: "center" }}>
            <h1 style={{ fontSize: "1.125rem", fontWeight: 600, marginBottom: "0.5rem" }}>Algo falló</h1>
            <p style={{ fontSize: "0.875rem", opacity: 0.7, marginBottom: "1rem" }}>
              Puede haber sido un problema de conexión momentáneo. Probá de nuevo.
            </p>
            <button
              onClick={reset}
              style={{
                background: "#0d9488",
                color: "white",
                borderRadius: "0.5rem",
                padding: "0.5rem 1rem",
                fontSize: "0.875rem",
                fontWeight: 500,
              }}
            >
              Reintentar
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
