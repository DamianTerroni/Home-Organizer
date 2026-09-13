"use client";

import { useEffect } from "react";

export default function RegisterServiceWorker() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // La app funciona igual sin service worker; solo se pierde el cacheo offline.
      });
    }
  }, []);

  return null;
}
