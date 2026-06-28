"use strict";

const CACHE_NAME = "comeleapi-admin-assets-v4";
const ASSET_CACHE = [
  "/assets/css/admin.css?v=20260628-backend-v3",
  "/assets/css/login.css?v=20260628-backend-v3",
  "/assets/js/pwa.js?v=20260628-backend-v3",
  "/assets/img/logo-comeleapi-256.png",
  "/assets/img/logo-comeleapi-512.png",
  "/assets/img/icons/icon-chat.png",
  "/assets/img/icons/icon-spark.png",
  "/assets/img/icons/admin-reset.png"
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSET_CACHE))
      .catch(() => undefined)
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/") || url.pathname === "/admin.html" || url.pathname === "/login.html") return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok && ["style", "script", "image", "font", "manifest"].includes(event.request.destination)) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});

function notificationOptions() {
  return {
    body: "Apri il gestionale per leggere e rispondere dalla sezione Richieste.",
    icon: "/assets/img/logo-comeleapi-512.png",
    badge: "/assets/img/logo-comeleapi-256.png",
    tag: "comeleapi-new-lead",
    renotify: true,
    requireInteraction: false,
    data: { url: "/admin.html#richieste" }
  };
}

self.addEventListener("push", (event) => {
  event.waitUntil(
    self.registration.showNotification("Nuova richiesta Come le Api", notificationOptions())
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type !== "SHOW_LEAD_NOTIFICATION") return;
  const title = event.data.title || "Nuova richiesta Come le Api";
  event.waitUntil(self.registration.showNotification(title, notificationOptions()));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = new URL(event.notification.data?.url || "/admin.html#richieste", self.location.origin).href;
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes("/admin.html")) {
          return client.focus().then(() => client.navigate(targetUrl));
        }
      }
      return clients.openWindow(targetUrl);
    })
  );
});
