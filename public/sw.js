const CACHE_NAME = "hogar-shell-v2";
const SHELL_ASSETS = ["/manifest.json", "/icons/icon-192.png", "/icons/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

// No intercepta la navegación de páginas ni las llamadas a Supabase: eso
// siempre tiene que ir directo a la red y usar el manejo normal del navegador
// (con sus propios timeouts/reintentos). Si lo interceptábamos acá y la red
// estaba lenta, la promesa podía quedar colgada para siempre con la app en
// pantalla negra. El service worker solo sirve para que la PWA sea instalable
// y cachear el ícono/manifest para que abra rápido.
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET" || event.request.mode === "navigate") return;
  if (!SHELL_ASSETS.some((asset) => event.request.url.endsWith(asset))) return;

  event.respondWith(
    caches.match(event.request).then((cached) => cached ?? fetch(event.request))
  );
});

self.addEventListener("push", (event) => {
  let payload = { title: "Hogar", body: "" };
  try {
    payload = event.data.json();
  } catch {
    // noop: si no viene JSON, se usa el título/cuerpo por defecto.
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client) return client.focus();
      }
      return self.clients.openWindow("/");
    })
  );
});
