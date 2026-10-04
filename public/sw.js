const CACHE = "lichviet-v2-2";
const ASSETS = [
  "/", "/styles.css", "/app.js", "/core.js", "/today.js",
  "/planner-ui.js", "/assistant-ui.js", "/profile-ui.js", "/notification-ui.js",
  "/manifest.webmanifest", "/icon.svg", "/sources.html"
];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET" || event.request.url.includes("/api/")) return;
  event.respondWith(fetch(event.request).then(response => {
    const copy = response.clone();
    caches.open(CACHE).then(cache => cache.put(event.request, copy));
    return response;
  }).catch(() => caches.match(event.request)));
});

self.addEventListener("push", event => {
  let data = { title: "Lịch Việt", body: "Có cập nhật mới.", url: "/" };
  try { data = { ...data, ...event.data.json() }; } catch {}
  event.waitUntil(self.registration.showNotification(data.title, {
    body: data.body,
    icon: "/icon.svg",
    badge: "/icon.svg",
    tag: "lichviet-daily",
    data: { url: data.url }
  }));
});

self.addEventListener("periodicsync", event => {
  if (event.tag !== "daily-brief") return;
  event.waitUntil((async () => {
    try {
      const date = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Ho_Chi_Minh"
      }).format(new Date());
      const day = await fetch("/api/day?date=" + date).then(r => r.json());
      await self.registration.showNotification(
        "Lịch Việt · " + day.verdict.label,
        {
          body: "Nên: " + day.recommended.slice(0, 2).join(", ") +
            ". Mở app để xem chi tiết.",
          icon: "/icon.svg",
          badge: "/icon.svg",
          tag: "daily-brief-periodic"
        }
      );
    } catch {}
  })());
});

self.addEventListener("notificationclick", event => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(self.clients.matchAll({
    type: "window",
    includeUncontrolled: true
  }).then(clients => {
    const existing = clients.find(c => "focus" in c);
    return existing ? existing.focus() : self.clients.openWindow(url);
  }));
});
